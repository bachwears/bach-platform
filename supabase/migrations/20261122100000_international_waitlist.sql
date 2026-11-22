-- International delivery waitlist (founder 2026-11-22): while delivery is
-- Lebanon-only, a shopper whose phone is from abroad gets "International delivery
-- is coming soon" at checkout instead of an order the shop has to cancel, and can
-- leave an email or WhatsApp number to hear the day it opens. Read in MGMT →
-- محتوى الموقع (next to the Lebanon-only switch). The only use of these contacts
-- is that one announcement.

create table if not exists public.international_waitlist (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text check (char_length(name) <= 120),
  email text check (email is null or (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or char_length(phone) <= 32),
  -- the phone's country calling code (e.g. '966'), when the number carries one
  country_code text check (country_code is null or country_code ~ '^\d{1,4}$'),
  -- what was in the bag, in USD cents: the demand worth waiting for
  bag_usd_cents integer check (bag_usd_cents is null or bag_usd_cents between 0 and 100000000),
  notified_at timestamptz,
  check (email is not null or phone is not null)
);
create unique index if not exists international_waitlist_email_idx on public.international_waitlist (lower(email)) where email is not null;
create unique index if not exists international_waitlist_phone_idx on public.international_waitlist (phone) where phone is not null and email is null;

alter table public.international_waitlist enable row level security;
revoke all on public.international_waitlist from anon, authenticated;
revoke all on sequence public.international_waitlist_id_seq from anon, authenticated;
grant select, update (notified_at) on public.international_waitlist to authenticated;

create policy "staff read the international waitlist" on public.international_waitlist
  for select to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));
create policy "staff mark waitlist entries notified" on public.international_waitlist
  for update to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager'));

-- The only way in. Joining twice with the same email updates the entry.
create or replace function public.join_international_waitlist(
  p_name text,
  p_email text,
  p_phone text,
  p_bag_usd_cents integer default null
)
 returns boolean
 language plpgsql
 volatile security definer
 set search_path to 'public'
as $function$
declare
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_digits text := regexp_replace(coalesce(v_phone, ''), '\D', '', 'g');
  v_cc text;
begin
  if v_email is null and v_phone is null then raise exception 'email or phone required'; end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'valid email required'; end if;
  if v_phone is not null and length(v_digits) not between 7 and 15 then raise exception 'valid phone required'; end if;
  perform public._rate_limit('intl_waitlist', coalesce(v_email, v_phone), 5, interval '1 hour');

  if v_phone like '+%' then v_cc := left(v_digits, 3);
  elsif v_digits like '00%' then v_cc := substr(v_digits, 3, 3);
  end if;

  if v_email is not null then
    insert into public.international_waitlist (name, email, phone, country_code, bag_usd_cents)
    values (left(nullif(trim(p_name), ''), 120), v_email, left(v_phone, 32), v_cc, p_bag_usd_cents)
    on conflict (lower(email)) where email is not null do update
      set name = coalesce(excluded.name, international_waitlist.name),
          phone = coalesce(excluded.phone, international_waitlist.phone),
          country_code = coalesce(excluded.country_code, international_waitlist.country_code),
          bag_usd_cents = greatest(coalesce(excluded.bag_usd_cents, 0), coalesce(international_waitlist.bag_usd_cents, 0)),
          created_at = now();
  else
    insert into public.international_waitlist (name, phone, country_code, bag_usd_cents)
    values (left(nullif(trim(p_name), ''), 120), left(v_phone, 32), v_cc, p_bag_usd_cents)
    on conflict (phone) where phone is not null and email is null do update
      set name = coalesce(excluded.name, international_waitlist.name),
          bag_usd_cents = greatest(coalesce(excluded.bag_usd_cents, 0), coalesce(international_waitlist.bag_usd_cents, 0)),
          created_at = now();
  end if;
  return true;
end;
$function$;
revoke all on function public.join_international_waitlist(text, text, text, integer) from public;
grant execute on function public.join_international_waitlist(text, text, text, integer) to anon, authenticated;
