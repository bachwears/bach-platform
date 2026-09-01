-- Payments (§9): online orders carry their payment method, checkout only
-- accepts methods enabled in payment_methods, and unpaid card orders
-- auto-cancel after 24h. Stripe stays dormant until keys exist.

alter table public.orders
  add column payment_method public.payment_kind not null default 'cash';

-- Backfill semantics: existing online orders were COD.
update public.orders set payment_method = 'cod' where channel = 'online';

create or replace function public.storefront_checkout(
  p_items jsonb,
  p_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_note text default null,
  p_email text default null,
  p_promocode text default null,
  p_payment_method text default 'cod'
)
returns table (order_id uuid, order_number bigint, discount_usd_cents integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_rate numeric(14, 2);
  v_tva record;
  v_branch uuid;
  v_customer uuid;
  v_item record;
  v_unit integer;
  v_available integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_tva_cents integer := 0;
  v_order_id uuid;
  v_order_number bigint;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_promo_id uuid;
  v_check record;
  v_method public.payment_kind;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if length(v_phone) < 7 or length(v_phone) > 15 then raise exception 'valid phone required'; end if;
  if coalesce(trim(p_city), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'delivery address required';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'valid email required';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) not between 1 and 20 then
    raise exception 'cart must have between 1 and 20 lines';
  end if;

  -- Only methods switched on in Payments Configuration are accepted.
  if p_payment_method not in ('cod', 'whish', 'stripe') then
    raise exception 'invalid payment method';
  end if;
  v_method := p_payment_method::public.payment_kind;
  if not exists (select 1 from public.payment_methods where kind = v_method and is_enabled) then
    raise exception 'payment method not available';
  end if;

  select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then raise exception 'store temporarily unavailable'; end if;
  select id into v_branch from public.branches where is_active order by created_at limit 1;
  select enabled, rate_basis_points, prices_include_tva into v_tva from public.tva_settings limit 1;

  create temp table _web (variant_id uuid, quantity int, unit_price integer) on commit drop;
  for v_item in
    select (i->>'variant_id')::uuid as vid, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_items) i
  loop
    if v_item.qty is null or v_item.qty < 1 or v_item.qty > 10 then
      raise exception 'invalid quantity';
    end if;
    select coalesce(pv.price_usd_cents_override,
                    least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v_unit
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_item.vid and pv.is_active and p.status = 'published';
    if v_unit is null then raise exception 'item no longer available'; end if;

    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.vid and branch_id = v_branch
    for update;
    if coalesce(v_available, 0) < v_item.qty then
      raise exception 'insufficient stock';
    end if;

    insert into _web values (v_item.vid, v_item.qty, v_unit);
    v_subtotal := v_subtotal + v_unit * v_item.qty;
  end loop;

  if nullif(trim(coalesce(p_promocode, '')), '') is not null then
    select * into v_check from public.validate_promocode(p_promocode);
    if not v_check.valid then
      raise exception 'promocode: %', v_check.message;
    end if;
    select id into v_promo_id from public.promocodes where code = lower(trim(p_promocode));
    v_discount := case v_check.kind
      when 'percent' then round(v_subtotal::numeric * v_check.value / 100)::integer
      else least(v_check.value, v_subtotal)
    end;
  end if;

  v_total := v_subtotal - v_discount;
  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      v_tva_cents := v_total - round(v_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_total::numeric * v_tva.rate_basis_points / 10000);
      v_total := v_total + v_tva_cents;
    end if;
  end if;

  if auth.uid() is not null then
    select id into v_customer from public.customers where auth_user_id = auth.uid();
  end if;
  if v_customer is null then
    select id into v_customer from public.customers where phone = v_phone;
  end if;
  perform set_config('app.customer_guard_bypass', 'on', true);
  if v_customer is null then
    insert into public.customers (full_name, phone, email) values (trim(p_name), v_phone, v_email)
    returning id into v_customer;
  else
    update public.customers
    set full_name = coalesce(nullif(trim(p_name), ''), full_name),
        email = coalesce(email, v_email),
        updated_at = now()
    where id = v_customer;
  end if;
  perform set_config('app.customer_guard_bypass', '', true);

  insert into public.orders (
    channel, status, branch_id, customer_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents,
    note, ship_name, ship_phone, ship_city, ship_address, payment_method
  ) values (
    'online', 'pending', v_branch, v_customer, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total,
    nullif(trim(coalesce(p_note, '')), ''), trim(p_name), v_phone, trim(p_city), trim(p_address), v_method
  ) returning id, number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar,
    quantity, unit_price_usd_cents, line_total_usd_cents
  )
  select v_order_id, w.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
         w.quantity, w.unit_price, w.unit_price * w.quantity
  from _web w
  join public.product_variants pv on pv.id = w.variant_id
  join public.products p on p.id = pv.product_id;

  if v_promo_id is not null then
    insert into public.promocode_redemptions (promocode_id, customer_id, order_id, redemption_year)
    values (v_promo_id, v_customer, v_order_id, extract(year from current_date)::integer);
  end if;

  update public.inventory_levels il
  set reserved = il.reserved + w.quantity, updated_at = now()
  from _web w
  where il.variant_id = w.variant_id and il.branch_id = v_branch;

  return query select v_order_id, v_order_number, v_discount;
end;
$$;

revoke all on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text) from public;
grant execute on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text) to anon, authenticated;

-- Card orders unpaid after 24h release their reservation.
create or replace function public.sweep_unpaid_card_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_o record;
  v_n integer := 0;
begin
  for v_o in
    select o.id, o.branch_id from public.orders o
    where o.channel = 'online' and o.payment_method = 'stripe' and o.status = 'pending'
      and o.created_at < now() - interval '24 hours'
      and not exists (select 1 from public.order_payments p where p.order_id = o.id)
  loop
    update public.inventory_levels il
    set reserved = greatest(il.reserved - oi.quantity, 0), updated_at = now()
    from public.order_items oi
    where oi.order_id = v_o.id and il.variant_id = oi.variant_id and il.branch_id = v_o.branch_id;
    update public.orders set status = 'cancelled', updated_at = now(),
      note = coalesce(note || ' · ', '') || 'auto-cancel: payment not completed'
    where id = v_o.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('unpaid-card-orders');
    exception when others then null;
    end;
    perform cron.schedule('unpaid-card-orders', '10 * * * *',
      'select public.sweep_unpaid_card_orders()');
  end if;
end $$;
