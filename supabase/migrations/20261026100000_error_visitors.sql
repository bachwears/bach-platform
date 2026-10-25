-- Error tracking: count visitors too (founder 2026-10-26). The "people hit"
-- count only knew signed-in people; each browser now sends a random anonymous
-- id (context.visitor, kept in its localStorage — no personal data), and a
-- group counts distinct signed-in people + visitors. Existing groups recounted.

create or replace function public.log_app_error(
  p_app text,
  p_kind text,
  p_message text,
  p_stack text default null,
  p_url text default null,
  p_digest text default null,
  p_context jsonb default null,
  p_release text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app text := case when p_app in ('storefront', 'pos', 'mgmt', 'server', 'db') then p_app else 'server' end;
  v_kind text := case when p_kind in ('client', 'server', 'db', 'boundary', 'unhandled') then p_kind else 'client' end;
  v_msg text := left(coalesce(nullif(trim(p_message), ''), 'Unknown error'), 500);
  v_stack text := left(p_stack, 4000);
  -- the page only: a query string can hold tokens (e.g. /account/confirm?token_hash=)
  v_url text := left(split_part(split_part(coalesce(p_url, ''), '?', 1), '#', 1), 300);
  v_frame text;
  v_fp text;
  v_group public.app_error_groups;
  v_new boolean := false;
  v_reopened boolean := false;
  v_uid uuid := auth.uid();
  v_role text := public.current_app_role()::text;
  v_admin text;
  v_recent integer;
  v_known_user boolean;
  -- who hit it: the signed-in person, else the browser's anonymous id
  v_who text := coalesce(auth.uid()::text, nullif(left(p_context ->> 'visitor', 64), ''));
begin
  -- same error = same app, kind, message shape (numbers, ids and quoted values
  -- blanked) and first stack line
  v_frame := coalesce(substring(v_stack from '\n\s*at\s+([^\n]{1,200})'), substring(v_stack from '^([^\n]{1,200})'), '');
  v_fp := md5(v_app || '|' || v_kind || '|' ||
    regexp_replace(regexp_replace(regexp_replace(v_msg,
      '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', 'gi'),
      '"[^"]*"|''[^'']*''', '<v>', 'g'),
      '\d+', '<n>', 'g') || '|' ||
    regexp_replace(v_frame, ':\d+:\d+', '', 'g'));

  select * into v_group from public.app_error_groups where fingerprint = v_fp for update;
  if v_group.id is null then
    insert into public.app_error_groups (fingerprint, app, kind, message, stack, last_url)
    values (v_fp, v_app, v_kind, v_msg, v_stack, nullif(v_url, ''))
    on conflict (fingerprint) do nothing
    returning * into v_group;
    if v_group.id is null then
      select * into v_group from public.app_error_groups where fingerprint = v_fp for update;
    else
      v_new := true;
    end if;
  end if;
  if not v_new then
    v_reopened := v_group.status = 'resolved';
    update public.app_error_groups
    set count = count + 1,
        last_seen = now(),
        last_url = coalesce(nullif(v_url, ''), last_url),
        stack = coalesce(v_stack, stack),
        status = case when status = 'resolved' then 'open' else status end,
        resolved_at = case when status = 'resolved' then null else resolved_at end
    where id = v_group.id
    returning * into v_group;
  end if;

  -- occurrences: a flood stops here (the count above still counts it)
  select count(*) into v_recent from public.app_errors where created_at > now() - interval '1 minute';
  if v_recent < 600 and (select count(*) from public.app_errors where group_id = v_group.id) < 200 then
    v_known_user := v_who is null or exists (
      select 1 from public.app_errors
      where group_id = v_group.id and coalesce(user_id::text, context ->> 'visitor') = v_who
    );
    insert into public.app_errors (group_id, app, url, message, stack, digest, user_agent, user_id, role, release, context)
    values (
      v_group.id, v_app, nullif(v_url, ''), v_msg, v_stack, left(p_digest, 100),
      left(coalesce((nullif(current_setting('request.headers', true), '')::jsonb) ->> 'user-agent', ''), 300),
      v_uid, v_role, left(p_release, 40),
      case when p_context is null then null when length(p_context::text) > 4000 then jsonb_build_object('truncated', true) else p_context end
    );
    if not v_known_user then
      update public.app_error_groups set users = users + 1 where id = v_group.id;
    end if;
  end if;

  -- tell the admin about a new (or returning) error; ignored ones stay quiet
  if (v_new or v_reopened) and v_group.status <> 'ignored'
     and (v_group.notified_at is null or v_group.notified_at < now() - interval '6 hours') then
    v_admin := public._admin_notify_email();
    if v_admin is not null and (
      select count(*) from public.notification_log
      where event = 'admin_error_new' and created_at > now() - interval '1 day'
    ) < 30 then
      perform public._enqueue_notification('admin_error_new', 'email', v_admin, 'en', jsonb_build_object(
        'app', v_app,
        'kind', v_kind,
        'message', v_msg,
        'url', coalesce(nullif(v_url, ''), '—'),
        'state', case when v_reopened then 'came back after being marked fixed' else 'new' end,
        'mgmt_link', 'https://mgmt.bachwears.com/errors/' || v_group.id
      ));
      update public.app_error_groups set notified_at = now() where id = v_group.id;
    end if;
  end if;
end $$;

update public.app_error_groups g
set users = (
  select count(distinct coalesce(e.user_id::text, e.context ->> 'visitor'))
  from public.app_errors e where e.group_id = g.id
);
