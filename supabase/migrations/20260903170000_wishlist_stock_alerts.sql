-- Wishlist + back-in-stock (§6).

create table public.wishlists (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

alter table public.wishlists enable row level security;

create policy "customer manages own wishlist" on public.wishlists
  for all to authenticated
  using (customer_id in (select id from public.customers where auth_user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where auth_user_id = auth.uid()));
create policy "staff read wishlists" on public.wishlists
  for select to authenticated using (public.is_staff());

-- A signed-in customer may not have a customers row yet (no orders) —
-- create one on first wishlist save.
create or replace function public.my_customer_id()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_email text;
begin
  if auth.uid() is null then return null; end if;
  select id into v_id from public.customers where auth_user_id = auth.uid();
  if v_id is null then
    select email into v_email from auth.users where id = auth.uid();
    perform set_config('app.customer_guard_bypass', 'on', true);
    insert into public.customers (auth_user_id, email, full_name)
    values (auth.uid(), v_email, coalesce((select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()), ''))
    returning id into v_id;
    perform set_config('app.customer_guard_bypass', '', true);
  end if;
  return v_id;
end;
$$;

grant execute on function public.my_customer_id() to authenticated;

create table public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  phone text,
  email text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index stock_alerts_pending_idx on public.stock_alerts (variant_id) where notified_at is null;

alter table public.stock_alerts enable row level security;
create policy "staff read stock alerts" on public.stock_alerts
  for select to authenticated using (public.is_staff());
-- Writes only via the definer function below.

create or replace function public.subscribe_stock_alert(
  p_variant_id uuid,
  p_phone text default null,
  p_email text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_customer uuid;
begin
  if not exists (select 1 from public.product_variants where id = p_variant_id and is_active) then
    raise exception 'unknown item';
  end if;
  -- Signed-in users subscribe with their saved contact.
  if auth.uid() is not null then
    v_customer := public.my_customer_id();
    select coalesce(v_phone, phone), coalesce(v_email, email)
    into v_phone, v_email
    from public.customers where id = v_customer;
  end if;
  if v_phone is null and v_email is null then
    raise exception 'phone or email required';
  end if;
  if v_phone is not null and (length(v_phone) < 7 or length(v_phone) > 15) then
    raise exception 'valid phone required';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'valid email required';
  end if;
  -- One pending alert per contact per variant.
  if exists (
    select 1 from public.stock_alerts
    where variant_id = p_variant_id and notified_at is null
      and (coalesce(phone, '') = coalesce(v_phone, '') and coalesce(email, '') = coalesce(v_email, ''))
  ) then
    return;
  end if;
  -- Throttle: max 20 pending alerts per contact.
  if (select count(*) from public.stock_alerts
      where notified_at is null
        and (phone = v_phone or email = v_email)) >= 20 then
    raise exception 'too many alerts';
  end if;

  insert into public.stock_alerts (variant_id, customer_id, phone, email)
  values (p_variant_id, v_customer, v_phone, v_email);
end;
$$;

grant execute on function public.subscribe_stock_alert(uuid, text, text) to anon, authenticated;

insert into public.notification_templates (event, channel, lang, subject, body) values
  ('back_in_stock', 'whatsapp', 'ar', null,
   'رجعت! 🎉 {{product}} ({{size}} {{color}}) صارت متوفرة عند BACH Wears. اطلبها قبل ما تخلص: {{link}}'),
  ('back_in_stock', 'email', 'en', 'Back in stock — {{product}}',
   'Good news: {{product}} ({{size}} {{color}}) is back in stock at BACH Wears. Order before it sells out again: {{link}} — BACH Wears');

-- When availability crosses back above zero, serve the pending alerts.
create or replace function public.process_stock_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_avail_old integer := coalesce(old.quantity, 0) - coalesce(old.reserved, 0);
  v_avail_new integer := new.quantity - new.reserved;
  v_a record;
  v_info record;
  v_payload jsonb;
begin
  if v_avail_new <= 0 or v_avail_old > 0 then return new; end if;
  if not exists (select 1 from public.stock_alerts where variant_id = new.variant_id and notified_at is null) then
    return new;
  end if;

  select p.name_en, p.slug, pv.size, pv.color_en
  into v_info
  from public.product_variants pv join public.products p on p.id = pv.product_id
  where pv.id = new.variant_id;

  v_payload := jsonb_build_object(
    'product', v_info.name_en,
    'size', v_info.size,
    'color', v_info.color_en,
    'link', 'https://bachwears.com/products/' || v_info.slug
  );

  for v_a in
    select * from public.stock_alerts
    where variant_id = new.variant_id and notified_at is null
    limit 200
  loop
    if v_a.phone is not null then
      perform public._enqueue_notification('back_in_stock', 'whatsapp', v_a.phone, 'ar', v_payload);
    end if;
    if v_a.email is not null then
      perform public._enqueue_notification('back_in_stock', 'email', v_a.email, 'en', v_payload);
    end if;
    update public.stock_alerts set notified_at = now() where id = v_a.id;
  end loop;
  return new;
end;
$$;

create trigger inventory_levels_stock_alerts
  after insert or update on public.inventory_levels
  for each row execute function public.process_stock_alerts();
