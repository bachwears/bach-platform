-- Newsletter signup with consent (§6 BOSS baseline: newsletter + consent).
-- Public writes go through definer RPCs; staff read the list from MGMT.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  source text not null default 'footer',
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index newsletter_subscribers_active_idx
  on public.newsletter_subscribers (created_at desc)
  where unsubscribed_at is null;

alter table public.newsletter_subscribers enable row level security;

create policy "newsletter_staff_read" on public.newsletter_subscribers
  for select using (public.is_staff());

create or replace function public.subscribe_newsletter(p_email text, p_locale text default 'en')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_locale text := case when p_locale = 'ar' then 'ar' else 'en' end;
  v_was_new boolean;
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  insert into public.newsletter_subscribers (email, locale)
  values (v_email, v_locale)
  on conflict (email) do update
    set unsubscribed_at = null,
        locale = excluded.locale,
        consented_at = case
          when newsletter_subscribers.unsubscribed_at is not null then now()
          else newsletter_subscribers.consented_at
        end
  returning (xmax = 0) into v_was_new;

  -- Welcome email only on a genuinely new signup.
  if v_was_new then
    perform public._enqueue_notification(
      'newsletter_welcome', 'email', v_email, v_locale,
      jsonb_build_object('email', v_email)
    );
  end if;
end;
$$;

create or replace function public.unsubscribe_newsletter(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.newsletter_subscribers
  set unsubscribed_at = now()
  where email = lower(trim(p_email)) and unsubscribed_at is null;
  -- Silently succeed either way: no address-existence oracle.
end;
$$;

grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
grant execute on function public.unsubscribe_newsletter(text) to anon, authenticated;

insert into public.notification_templates (event, channel, lang, subject, body) values
  ('newsletter_welcome', 'email', 'en', 'Welcome to BACH Wears',
   'You''re on the list. New drops, seasonal edits, and member offers — no noise, and you can leave anytime at https://bachwears.com/newsletter/unsubscribe. — BACH Wears'),
  ('newsletter_welcome', 'email', 'ar', 'أهلا فيك مع BACH Wears',
   'صرت عاللائحة. وصل جديد، تشكيلات الموسم، وعروض الأعضاء — بلا إزعاج، وفيك تلغي الاشتراك بأي وقت من https://bachwears.com/newsletter/unsubscribe. — BACH Wears')
on conflict (event, channel, lang) do nothing;
