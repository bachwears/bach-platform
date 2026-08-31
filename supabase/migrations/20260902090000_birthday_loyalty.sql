-- Birthday & loyalty engine (§5, §6): promocodes with the mybirthday
-- special, redemption tracking, customer birthday/consent self-service,
-- and daily birthday notifications through the §10 engine.

create type public.promocode_kind as enum ('percent', 'fixed_usd');

create table public.promocodes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = lower(code)),
  kind public.promocode_kind not null,
  value integer not null check (value > 0),  -- percent (1-100) or USD cents
  is_enabled boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  per_customer_limit integer,                -- null = unlimited
  requires_account boolean not null default false,
  is_birthday boolean not null default false,
  birthday_window_days integer not null default 3,
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create table public.promocode_redemptions (
  id uuid primary key default gen_random_uuid(),
  promocode_id uuid not null references public.promocodes (id),
  customer_id uuid not null references public.customers (id),
  order_id uuid references public.orders (id) on delete set null,
  redemption_year integer not null,
  created_at timestamptz not null default now()
);
create index promocode_redemptions_lookup_idx
  on public.promocode_redemptions (promocode_id, customer_id, redemption_year);

alter table public.promocodes enable row level security;
alter table public.promocode_redemptions enable row level security;

create policy "staff read promocodes" on public.promocodes
  for select to authenticated using (public.is_staff());
create policy "marketing manages promocodes" on public.promocodes
  for all to authenticated
  using (public.current_app_role() in ('super_admin', 'marketing_manager', 'store_manager'))
  with check (public.current_app_role() in ('super_admin', 'marketing_manager', 'store_manager'));
create policy "staff read redemptions" on public.promocode_redemptions
  for select to authenticated using (public.is_staff());

-- The flagship birthday code (§5): 15% off in the ±3-day window, once a year.
insert into public.promocodes (code, kind, value, requires_account, is_birthday, birthday_window_days)
values ('mybirthday', 'percent', 15, true, true, 3);

-- Customers may set their birthday ONCE and toggle consent themselves.
create policy "customer updates own profile" on public.customers
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create or replace function public.guard_customer_self_update()
returns trigger language plpgsql as $$
begin
  -- Only staff may change a birthday that is already set (window abuse guard).
  if old.birthday is not null and new.birthday is distinct from old.birthday
     and not public.is_staff() then
    raise exception 'birthday can only be corrected by customer care';
  end if;
  -- Self-service updates may not touch identity/linkage fields.
  if not public.is_staff() then
    new.phone := old.phone;
    new.email := old.email;
    new.auth_user_id := old.auth_user_id;
  end if;
  return new;
end;
$$;

create trigger customers_guard_self_update
  before update on public.customers
  for each row execute function public.guard_customer_self_update();

-- Is `check_date` inside the customer's birthday window?
create or replace function public._in_birthday_window(p_birthday date, p_window integer, p_on date)
returns boolean language sql immutable as $$
  select p_birthday is not null and exists (
    select 1 from generate_series(-p_window, p_window) d
    where to_char(p_on + d, 'MM-DD') = to_char(p_birthday, 'MM-DD')
  )
$$;

-- Validate a code for the signed-in customer; returns the discount terms.
create or replace function public.validate_promocode(p_code text)
returns table (valid boolean, kind public.promocode_kind, value integer, message text)
language plpgsql security definer set search_path = public as $$
declare
  v_promo record;
  v_customer record;
  v_uses integer;
begin
  select * into v_promo from public.promocodes where code = lower(trim(coalesce(p_code, '')));
  if v_promo is null or not v_promo.is_enabled then
    return query select false, null::public.promocode_kind, null::integer, 'code not found'; return;
  end if;
  if v_promo.starts_at is not null and now() < v_promo.starts_at
     or v_promo.ends_at is not null and now() > v_promo.ends_at then
    return query select false, null::public.promocode_kind, null::integer, 'code expired'; return;
  end if;

  select * into v_customer from public.customers where auth_user_id = auth.uid();
  if v_promo.requires_account and v_customer is null then
    return query select false, null::public.promocode_kind, null::integer, 'sign in to use this code'; return;
  end if;

  if v_promo.is_birthday then
    if v_customer.birthday is null then
      return query select false, null::public.promocode_kind, null::integer, 'set your birthday in your account first'; return;
    end if;
    if not public._in_birthday_window(v_customer.birthday, v_promo.birthday_window_days, current_date) then
      return query select false, null::public.promocode_kind, null::integer, 'this code only works around your birthday'; return;
    end if;
    if exists (
      select 1 from public.promocode_redemptions
      where promocode_id = v_promo.id and customer_id = v_customer.id
        and redemption_year = extract(year from current_date)::integer
    ) then
      return query select false, null::public.promocode_kind, null::integer, 'already used this year'; return;
    end if;
  elsif v_promo.per_customer_limit is not null and v_customer is not null then
    select count(*) into v_uses from public.promocode_redemptions
    where promocode_id = v_promo.id and customer_id = v_customer.id;
    if v_uses >= v_promo.per_customer_limit then
      return query select false, null::public.promocode_kind, null::integer, 'code already used'; return;
    end if;
  end if;

  return query select true, v_promo.kind, v_promo.value, 'ok';
end;
$$;

grant execute on function public.validate_promocode(text) to authenticated;

-- Birthday popup helper: is the signed-in customer in their window now?
create or replace function public.my_birthday_offer()
returns table (in_window boolean, code text, percent integer, already_used boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_customer record;
  v_promo record;
begin
  select * into v_customer from public.customers where auth_user_id = auth.uid();
  select * into v_promo from public.promocodes where is_birthday and is_enabled limit 1;
  if v_customer is null or v_promo is null or v_customer.birthday is null then
    return query select false, null::text, null::integer, false; return;
  end if;
  return query select
    public._in_birthday_window(v_customer.birthday, v_promo.birthday_window_days, current_date),
    v_promo.code,
    v_promo.value,
    exists (
      select 1 from public.promocode_redemptions
      where promocode_id = v_promo.id and customer_id = v_customer.id
        and redemption_year = extract(year from current_date)::integer
    );
end;
$$;

grant execute on function public.my_birthday_offer() to authenticated;

-- Birthday notifications (§5: 1 day before + on the day), consented only.
insert into public.notification_templates (event, channel, lang, subject, body) values
  ('birthday_upcoming', 'whatsapp', 'ar', null,
   'بكرا عيد ميلادك {{customer_name}} 🎂 من عيلة BACH Wears، عنا هدية إلك: كود {{code}} بيعطيك {{percent}}% خصم عالمجموعة كلها — صالح لأيام حول عيدك.'),
  ('birthday_today', 'whatsapp', 'ar', null,
   'كل سنة وإنت سالم {{customer_name}} 🖤🎉 هديتك من BACH Wears: {{percent}}% خصم بكود {{code}} — استعملو اليوم أو خلال كم يوم.'),
  ('birthday_today', 'email', 'en', 'Happy birthday from BACH Wears 🖤',
   'Happy birthday, {{customer_name}}! Enjoy {{percent}}% off everything with code {{code}} — valid for a few days around your day. — BACH Wears');

create or replace function public.enqueue_birthday_notifications()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_promo record;
  v_c record;
  v_count integer := 0;
  v_payload jsonb;
begin
  select * into v_promo from public.promocodes where is_birthday and is_enabled limit 1;
  if v_promo is null then return 0; end if;

  for v_c in
    select id, full_name, phone, email, birthday from public.customers
    where marketing_consent and birthday is not null and phone is not null
  loop
    v_payload := jsonb_build_object(
      'customer_name', coalesce(v_c.full_name, ''),
      'code', upper(v_promo.code),
      'percent', v_promo.value
    );
    if to_char(current_date + 1, 'MM-DD') = to_char(v_c.birthday, 'MM-DD')
       and not exists (
         select 1 from public.notification_log
         where event = 'birthday_upcoming' and recipient = v_c.phone
           and created_at > current_date - interval '2 days'
       ) then
      perform public._enqueue_notification('birthday_upcoming', 'whatsapp', v_c.phone, 'ar', v_payload);
      v_count := v_count + 1;
    end if;
    if to_char(current_date, 'MM-DD') = to_char(v_c.birthday, 'MM-DD')
       and not exists (
         select 1 from public.notification_log
         where event = 'birthday_today' and recipient = v_c.phone
           and created_at > current_date - interval '1 day'
       ) then
      perform public._enqueue_notification('birthday_today', 'whatsapp', v_c.phone, 'ar', v_payload);
      if v_c.email is not null then
        perform public._enqueue_notification('birthday_today', 'email', v_c.email, 'en', v_payload);
      end if;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Daily at 06:00 UTC (09:00 Beirut).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('birthday-notifications');
    exception when others then null;
    end;
    perform cron.schedule('birthday-notifications', '0 6 * * *',
      'select public.enqueue_birthday_notifications()');
  end if;
end $$;
