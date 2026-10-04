-- Delivery fee on online orders (founder decision 2026-10-04): $5, free from $100
-- of pieces (after discounts). Configurable in site_content 'delivery'. The fee is
-- stored on the order and included in its total (the courier collects it with
-- cash on delivery); returns refund the pieces only, never the delivery fee.

alter table public.orders
  add column if not exists delivery_usd_cents integer not null default 0 check (delivery_usd_cents >= 0);

insert into public.site_content (key, value)
values ('delivery', '{"fee_usd_cents": 500, "free_over_usd_cents": 10000}'::jsonb)
on conflict (key) do nothing;

CREATE OR REPLACE FUNCTION public.storefront_checkout(p_items jsonb, p_name text, p_phone text, p_city text, p_address text, p_note text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_promocode text DEFAULT NULL::text, p_payment_method text DEFAULT 'cod'::text, p_use_wallet boolean DEFAULT false)
 RETURNS TABLE(order_id uuid, order_number bigint, discount_usd_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_wallet_discount integer := 0;
  v_total integer;
  v_delivery integer := 0;
  v_fee integer;
  v_free_over integer;
  v_tva_cents integer := 0;
  v_order_id uuid;
  v_order_number bigint;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_promo_id uuid;
  v_check record;
  v_method public.payment_kind;
  v_balance integer;
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

  if p_use_wallet then
    -- Wallet prepay: identity comes from the session, never from the form.
    select id, balance_usd_cents into v_customer, v_balance
    from public.customers where auth_user_id = auth.uid();
    if v_customer is null then raise exception 'sign in to pay from your wallet'; end if;
    v_method := 'whish';
  else
    if p_payment_method not in ('cod', 'whish', 'stripe') then
      raise exception 'invalid payment method';
    end if;
    v_method := p_payment_method::public.payment_kind;
    if not exists (select 1 from public.payment_methods where kind = v_method and is_enabled) then
      raise exception 'payment method not available';
    end if;
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

  -- Whish-prepaid incentive: 10% off the post-promo amount when the whole
  -- order is paid from the wallet.
  if p_use_wallet then
    v_wallet_discount := round((v_subtotal - v_discount)::numeric * 10 / 100)::integer;
    v_discount := v_discount + v_wallet_discount;
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

  -- Delivery (site_content 'delivery'): a flat fee on the pieces after discounts,
  -- free from the threshold up. It is part of what the customer pays.
  select coalesce((value->>'fee_usd_cents')::integer, 500), coalesce((value->>'free_over_usd_cents')::integer, 10000)
  into v_fee, v_free_over
  from public.site_content where key = 'delivery';
  v_fee := coalesce(v_fee, 500);
  v_free_over := coalesce(v_free_over, 10000);
  if v_subtotal - v_discount < v_free_over then
    v_delivery := greatest(v_fee, 0);
  end if;
  v_total := v_total + v_delivery;

  if p_use_wallet and coalesce(v_balance, 0) < v_total then
    raise exception 'wallet balance does not cover this order';
  end if;

  if v_customer is null and auth.uid() is not null then
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
    tva_rate_basis_points, prices_include_tva, total_usd_cents, delivery_usd_cents,
    note, ship_name, ship_phone, ship_city, ship_address, payment_method
  ) values (
    'online', (case when p_use_wallet then 'confirmed' else 'pending' end)::public.order_status, v_branch, v_customer, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, v_delivery,
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

  if p_use_wallet then
    update public.customers
    set balance_usd_cents = balance_usd_cents - v_total, updated_at = now()
    where id = v_customer;
    insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note)
    values (v_customer, -v_total, 'order_payment', v_order_id, 'Order #' || v_order_number);
    insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
    values (v_order_id, 'whish', 'USD', v_total, v_total);
  end if;

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
$function$;

CREATE OR REPLACE FUNCTION public._validate_return(p_order_id uuid, p_items jsonb)
 RETURNS TABLE(order_item_id uuid, variant_id uuid, quantity integer, credit integer, o_branch uuid, o_subtotal integer, o_total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role := public.current_app_role();
  v_order record;
  v_line record;
  v_req record;
  v_already integer;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status not in ('completed', 'delivered') then
    raise exception 'order status % cannot be returned', v_order.status;
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'nothing to return';
  end if;

  for v_req in
    select (i->>'order_item_id')::uuid as oi, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_items) i
  loop
    if v_req.qty is null or v_req.qty <= 0 then raise exception 'invalid quantity'; end if;
    select * into v_line from public.order_items where id = v_req.oi and order_id = p_order_id;
    if v_line is null then raise exception 'item not on this order'; end if;
    select coalesce(sum(ri.quantity), 0) into v_already
    from public.order_return_items ri
    join public.order_returns r on r.id = ri.return_id
    where ri.order_item_id = v_req.oi;
    if v_req.qty > v_line.quantity - v_already then
      raise exception 'quantity exceeds what remains returnable for %', coalesce(v_line.sku, v_line.name_en);
    end if;
    order_item_id := v_req.oi;
    variant_id := v_line.variant_id;
    quantity := v_req.qty;
    credit := public._return_credit(
      v_line.line_total_usd_cents, v_line.quantity, v_req.qty,
      v_order.subtotal_usd_cents, v_order.total_usd_cents - coalesce(v_order.delivery_usd_cents, 0)
    );
    o_branch := v_order.branch_id;
    o_subtotal := v_order.subtotal_usd_cents;
    o_total := v_order.total_usd_cents - coalesce(v_order.delivery_usd_cents, 0);
    return next;
  end loop;
end;
$function$;

-- Test runs of this change used up order numbers; with no orders yet, start at #1.
do $$
begin
  if not exists (select 1 from public.orders) then
    alter sequence public.order_number_seq restart with 1;
  end if;
end $$;
