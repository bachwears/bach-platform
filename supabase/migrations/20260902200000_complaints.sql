-- Complaints & ticketing (§11): portal submission → ticket number →
-- customer tracking by number+phone → internal queue with full audit.

create type public.complaint_status as enum
  ('open', 'in_progress', 'waiting_customer', 'escalated', 'resolved', 'closed');

create sequence public.complaint_number_seq start 1001;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.complaint_number_seq'),
  customer_id uuid references public.customers (id),
  name text not null,
  phone text not null,
  email text,
  order_number bigint,
  subject text not null,
  body text not null,
  status public.complaint_status not null default 'open',
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index complaints_queue_idx on public.complaints (status, created_at);

create table public.complaint_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  author_id uuid references public.profiles (id),
  kind text not null check (kind in ('note', 'reply', 'status', 'assign', 'system')),
  body text not null,
  is_public boolean not null default false,  -- visible to the customer
  created_at timestamptz not null default now()
);
create index complaint_events_complaint_idx on public.complaint_events (complaint_id, created_at);

alter table public.complaints enable row level security;
alter table public.complaint_events enable row level security;

create policy "staff read complaints" on public.complaints
  for select to authenticated using (public.is_staff());
create policy "support manages complaints" on public.complaints
  for update to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent'));

create policy "staff read complaint events" on public.complaint_events
  for select to authenticated using (public.is_staff());
create policy "support writes complaint events" on public.complaint_events
  for insert to authenticated
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent'));

-- Status/assignment changes audit themselves.
create or replace function public.audit_complaint_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.complaint_events (complaint_id, author_id, kind, body, is_public)
    values (new.id, auth.uid(), 'status', old.status || ' → ' || new.status,
            new.status in ('resolved', 'closed', 'waiting_customer'));
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.complaint_events (complaint_id, author_id, kind, body)
    values (new.id, auth.uid(), 'assign',
            coalesce((select full_name from public.profiles where id = new.assigned_to), 'بلا تعيين'));
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger complaints_audit
  before update on public.complaints
  for each row execute function public.audit_complaint_change();

-- Public submission (guests welcome).
create or replace function public.submit_complaint(
  p_name text, p_phone text, p_subject text, p_body text,
  p_email text default null, p_order_number bigint default null
)
returns table (ticket_number bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_customer uuid;
  v_number bigint;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if length(v_phone) < 7 or length(v_phone) > 15 then raise exception 'valid phone required'; end if;
  if coalesce(trim(p_subject), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'subject and message required';
  end if;
  if length(p_body) > 3000 then raise exception 'message too long'; end if;
  -- Throttle: max 5 open tickets per phone.
  if (select count(*) from public.complaints where phone = v_phone and status not in ('resolved', 'closed')) >= 5 then
    raise exception 'too many open tickets for this phone';
  end if;

  if auth.uid() is not null then
    select id into v_customer from public.customers where auth_user_id = auth.uid();
  end if;
  if v_customer is null then
    select id into v_customer from public.customers where phone = v_phone;
  end if;

  insert into public.complaints (customer_id, name, phone, email, order_number, subject, body)
  values (v_customer, trim(p_name), v_phone, nullif(lower(trim(coalesce(p_email, ''))), ''), p_order_number,
          trim(p_subject), trim(p_body))
  returning number into v_number;

  perform public._enqueue_notification('complaint_received', 'whatsapp', 'shop', 'ar',
    jsonb_build_object('ticket', v_number, 'customer_name', trim(p_name), 'customer_phone', v_phone,
                       'subject', trim(p_subject)));
  return query select v_number;
end;
$$;

grant execute on function public.submit_complaint(text, text, text, text, text, bigint) to anon, authenticated;

-- Customer tracking: ticket number + the phone it was filed with.
create or replace function public.track_complaint(p_number bigint, p_phone text)
returns table (status public.complaint_status, subject text, created_at timestamptz,
               events jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_c record;
begin
  select * into v_c from public.complaints c where c.number = p_number and c.phone = v_phone;
  if v_c is null then raise exception 'ticket not found'; end if;
  return query select v_c.status, v_c.subject, v_c.created_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'body', e.body, 'at', e.created_at) order by e.created_at)
      from public.complaint_events e
      where e.complaint_id = v_c.id and e.is_public
    ), '[]'::jsonb);
end;
$$;

grant execute on function public.track_complaint(bigint, text) to anon, authenticated;

-- Notification templates for the complaints flow.
insert into public.notification_templates (event, channel, lang, subject, body) values
  ('complaint_received', 'whatsapp', 'ar', null,
   'شكوى جديدة 📩 تذكرة #{{ticket}} — {{customer_name}} ({{customer_phone}}): {{subject}}. فتّح لوحة الإدارة → الشكاوى.'),
  ('complaint_resolved', 'whatsapp', 'ar', null,
   'تذكرتك #{{ticket}} عند BACH Wears تم حلّها ✅ إذا بعد في شي، ردّ علينا أو اتصل: {{care_phone}}.');

-- Resolving notifies the customer.
create or replace function public.notify_complaint_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'resolved' and old.status <> 'resolved' then
    perform public._enqueue_notification('complaint_resolved', 'whatsapp', new.phone, 'ar',
      jsonb_build_object('ticket', new.number, 'care_phone', '+961 71 566 296'));
  end if;
  return new;
end;
$$;

create trigger complaints_notify_resolved
  after update of status on public.complaints
  for each row execute function public.notify_complaint_resolved();
