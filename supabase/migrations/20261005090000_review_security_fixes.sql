-- Security & money fixes from the 2026-10-04 full review.
--
-- 1. customers: balance, created_at and id can't be changed by any direct REST
--    update (customers editing their own row, or staff editing any row). They
--    move only through SECURITY DEFINER functions, which run as the owner.
-- 2. Cancelling a wallet-paid online order gives the money back to the wallet,
--    and frees any promo/birthday redemption on it.
-- 3. storefront_checkout: one line per piece (no oversell via repeated lines);
--    free-delivery threshold judged before the wallet reward (matches the site);
--    a guest order matched only by phone never edits that customer (account
--    takeover via email linking). The old 8-argument overload (no delivery fee,
--    no payment-method check) is dropped.
-- 4. Returns: an item listed twice in one return is rejected.
-- 5. pos_exchange: the new invoice keeps the original customer.
-- 6. credit_wallet 'adjustment' is for super_admin/store_manager only.
-- 7. Internal functions (notification queue, cron sweeps) are no longer
--    callable through the API by anyone.
-- 8. orders: no direct UPDATE/DELETE through the API (status changes go through
--    advance_online_order; nothing in the apps writes orders directly).
-- 9. inventory_movements: cashiers no longer insert movements directly.
-- 10. categories: a category can't be moved under itself or its own children.

-- 1 ───────────────────────────────────────────────────────────────────────
create or replace function public.guard_customer_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Direct API updates run as anon/authenticated; definer functions run as the owner.
  if current_user in ('anon', 'authenticated') then
    new.balance_usd_cents := old.balance_usd_cents;
    new.created_at := old.created_at;
    new.id := old.id;
  end if;
  -- Definer functions opt out explicitly; service role has auth.uid() null.
  if coalesce(current_setting('app.customer_guard_bypass', true), '') = 'on'
     or auth.uid() is null
     or public.is_staff() then
    return new;
  end if;
  if old.birthday is not null and new.birthday is distinct from old.birthday then
    raise exception 'birthday can only be corrected by customer care';
  end if;
  new.phone := old.phone;
  new.email := old.email;
  new.auth_user_id := old.auth_user_id;
  return new;
end;
$$;

-- 2 ───────────────────────────────────────────────────────────────────────
alter table public.wallet_transactions drop constraint wallet_transactions_kind_check;
alter table public.wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('whish_topup', 'return_credit', 'order_payment', 'order_refund', 'adjustment'));

create or replace function public._release_order_money(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_number bigint;
  v_owed integer;
begin
  select customer_id, number into v_customer, v_number from public.orders where id = p_order_id;
  -- wallet paid minus anything already given back for this order
  select coalesce(-sum(delta_usd_cents), 0)::integer into v_owed
  from public.wallet_transactions
  where reference_id = p_order_id and kind in ('order_payment', 'order_refund');
  if v_customer is not null and v_owed > 0 then
    update public.customers
    set balance_usd_cents = balance_usd_cents + v_owed, updated_at = now()
    where id = v_customer;
    insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note, created_by)
    values (v_customer, v_owed, 'order_refund', p_order_id, 'Order #' || v_number || ' cancelled',
            case when public.is_staff() then auth.uid() end);
    -- the money went back to the wallet, so the order no longer holds a payment
    delete from public.order_payments where order_id = p_order_id and method = 'whish';
  end if;
  -- a cancelled order doesn't use up a promo or the yearly birthday code
  delete from public.promocode_redemptions where order_id = p_order_id;
end;
$$;
revoke all on function public._release_order_money(uuid) from public, anon, authenticated;


-- 3 ───────────────────────────────────────────────────────────────────────
drop function if exists public.storefront_checkout(jsonb, text, text, text, text, text, text, text);
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
  v_by_session boolean := false;
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
  -- one line per piece: repeated lines would each pass the stock check and
  -- reserve only once (and dodge the 10-per-line cap). The bag merges them anyway.
  if (select count(distinct i->>'variant_id') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then
    raise exception 'each item can appear only once in the cart';
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

  -- Delivery (site_content 'delivery'): a flat fee on the pieces after the promo,
  -- free from the threshold up (the wallet reward doesn't cost the shopper free
  -- delivery). It is part of what the customer pays.
  select coalesce((value->>'fee_usd_cents')::integer, 500), coalesce((value->>'free_over_usd_cents')::integer, 10000)
  into v_fee, v_free_over
  from public.site_content where key = 'delivery';
  v_fee := coalesce(v_fee, 500);
  v_free_over := coalesce(v_free_over, 10000);
  if v_subtotal - (v_discount - v_wallet_discount) < v_free_over then
    v_delivery := greatest(v_fee, 0);
  end if;
  v_total := v_total + v_delivery;

  if p_use_wallet and coalesce(v_balance, 0) < v_total then
    raise exception 'wallet balance does not cover this order';
  end if;

  if v_customer is null and auth.uid() is not null then
    select id into v_customer from public.customers where auth_user_id = auth.uid();
  end if;
  v_by_session := v_customer is not null;
  if v_customer is null then
    select id into v_customer from public.customers where phone = v_phone;
  end if;
  perform set_config('app.customer_guard_bypass', 'on', true);
  if v_customer is null then
    insert into public.customers (full_name, phone, email) values (trim(p_name), v_phone, v_email)
    returning id into v_customer;
  elsif v_by_session then
    -- the signed-in owner may refresh their own name and add a missing email
    update public.customers
    set full_name = coalesce(nullif(trim(p_name), ''), full_name),
        email = coalesce(email, v_email),
        updated_at = now()
    where id = v_customer;
  end if;
  -- A guest order that only matches by phone never edits that customer: an email
  -- set here would later link whoever signs up with it to the record (account
  -- takeover). The order keeps the guest's name and phone on its own fields.
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

-- 2 (cancel paths) ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.customer_cancel_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order record;
begin
  select o.* into v_order
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.id = p_order_id
    and o.channel = 'online'
    and c.auth_user_id = auth.uid()
  for update of o;

  if v_order is null then
    raise exception 'order not found';
  end if;
  if v_order.status not in ('pending', 'confirmed', 'picking') then
    raise exception 'order can no longer be cancelled';
  end if;

  update public.inventory_levels il
  set reserved = greatest(il.reserved - oi.quantity, 0), updated_at = now()
  from public.order_items oi
  where oi.order_id = p_order_id
    and il.variant_id = oi.variant_id
    and il.branch_id = v_order.branch_id;

  perform public._release_order_money(p_order_id);

  update public.orders set status = 'cancelled', updated_at = now()
  where id = p_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_online_order(p_order_id uuid, p_next order_status, p_paid_usd_cents integer DEFAULT NULL::integer, p_paid_lbp bigint DEFAULT NULL::bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role := public.current_app_role();
  v_order record;
  v_ok boolean := false;
  v_rate numeric;
  v_usd integer;
  v_lbp bigint;
  v_lbp_equiv integer := 0;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier', 'support_agent') then
    raise exception 'not allowed';
  end if;
  select * into v_order from public.orders where id = p_order_id and channel = 'online' for update;
  if v_order is null then raise exception 'online order not found'; end if;

  v_ok := (v_order.status, p_next) in (
    ('pending', 'confirmed'), ('confirmed', 'picking'), ('picking', 'packed'),
    ('packed', 'shipped'), ('shipped', 'delivered'), ('delivered', 'completed'),
    ('pending', 'cancelled'), ('confirmed', 'cancelled'), ('picking', 'cancelled')
  );
  if not v_ok then
    raise exception 'transition % -> % not allowed', v_order.status, p_next;
  end if;

  if p_next = 'packed' then
    -- Reservation matures into a sale: stock leaves the shelf.
    update public.inventory_levels il
    set reserved = il.reserved - oi.quantity, updated_at = now()
    from public.order_items oi
    where oi.order_id = p_order_id
      and il.variant_id = oi.variant_id and il.branch_id = v_order.branch_id;
    insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
    select oi.variant_id, v_order.branch_id, -oi.quantity, 'sale', p_order_id, auth.uid()
    from public.order_items oi where oi.order_id = p_order_id;
  elsif p_next = 'cancelled' then
    update public.inventory_levels il
    set reserved = greatest(il.reserved - oi.quantity, 0), updated_at = now()
    from public.order_items oi
    where oi.order_id = p_order_id
      and il.variant_id = oi.variant_id and il.branch_id = v_order.branch_id;
    perform public._release_order_money(p_order_id);
  elsif p_next = 'delivered'
        and v_order.payment_method = 'cod'
        and not exists (select 1 from public.order_payments where order_id = p_order_id) then
    -- The courier collected the cash: record it at today's rate.
    if p_paid_usd_cents is null and p_paid_lbp is null then
      v_usd := v_order.total_usd_cents;
      v_lbp := 0;
    else
      v_usd := greatest(coalesce(p_paid_usd_cents, 0), 0);
      v_lbp := greatest(coalesce(p_paid_lbp, 0), 0);
    end if;
    if v_lbp > 0 then
      select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
      if v_rate is null or v_rate <= 0 then raise exception 'no exchange rate set'; end if;
      v_lbp_equiv := round(v_lbp / v_rate * 100);
    end if;
    -- a few cents of rounding are fine; a short payment is not
    if v_usd + v_lbp_equiv < v_order.total_usd_cents - 5 then
      raise exception 'collected amount is less than the order total';
    end if;
    if v_usd > 0 then
      insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
      values (p_order_id, 'cod', 'USD', v_usd, v_usd);
    end if;
    if v_lbp > 0 then
      insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
      values (p_order_id, 'cod', 'LBP', v_lbp, greatest(v_lbp_equiv, 1));
    end if;
  end if;

  update public.orders set status = p_next, updated_at = now() where id = p_order_id;
end;
$function$;

-- 4 ───────────────────────────────────────────────────────────────────────
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
  -- the returnable check reads past returns only, so a line listed twice would be credited twice
  if (select count(distinct i->>'order_item_id') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then
    raise exception 'each item can appear only once in a return';
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

-- 5 ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pos_exchange(p_order_id uuid, p_return_items jsonb, p_new_items jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_refunds jsonb DEFAULT '[]'::jsonb, p_note text DEFAULT NULL::text, p_to_wallet boolean DEFAULT false)
 RETURNS TABLE(return_id uuid, new_order_id uuid, new_order_number bigint, credit_usd_cents integer, new_total_usd_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rate numeric(14, 2);
  v_credit integer := 0;
  v_branch uuid;
  v_return_id uuid;
  v_new_order uuid;
  v_new_number bigint;
  v_item record;
  v_unit integer;
  v_available integer;
  v_new_total integer := 0;
  v_tva record;
  v_tva_cents integer := 0;
  v_paid_in integer := 0;
  v_paid_out integer := 0;
  v_pay record;
  v_net integer;
  v_credit_applied integer;
  v_customer uuid;
  v_number bigint;
begin
  select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then raise exception 'no exchange rate configured'; end if;
  if jsonb_array_length(coalesce(p_new_items, '[]'::jsonb)) = 0 then
    raise exception 'exchange needs new items — use pos_return for a plain refund';
  end if;

  create temp table _xret on commit drop as
  select * from public._validate_return(p_order_id, p_return_items);
  select sum(credit) into v_credit from _xret;
  select o_branch into v_branch from _xret limit 1;

  -- Price and reserve new items (same rules as pos_checkout).
  create temp table _xnew (variant_id uuid, quantity int, unit_price integer) on commit drop;
  for v_item in
    select (i->>'variant_id')::uuid as vid, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_new_items) i
  loop
    if v_item.qty is null or v_item.qty <= 0 then raise exception 'invalid quantity'; end if;
    select coalesce(pv.price_usd_cents_override,
                    least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v_unit
    from public.product_variants pv join public.products p on p.id = pv.product_id
    where pv.id = v_item.vid and pv.is_active;
    if v_unit is null then raise exception 'unknown or inactive variant'; end if;
    select quantity - reserved into v_available
    from public.inventory_levels where variant_id = v_item.vid and branch_id = v_branch for update;
    if coalesce(v_available, 0) < v_item.qty then raise exception 'insufficient stock for exchange item'; end if;
    insert into _xnew values (v_item.vid, v_item.qty, v_unit);
    v_new_total := v_new_total + v_unit * v_item.qty;
  end loop;

  select enabled, rate_basis_points, prices_include_tva into v_tva from public.tva_settings limit 1;
  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      v_tva_cents := v_new_total - round(v_new_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_new_total::numeric * v_tva.rate_basis_points / 10000);
      v_new_total := v_new_total + v_tva_cents;
    end if;
  end if;

  -- Settlement: net > 0 → customer pays; net < 0 → we refund.
  v_net := v_new_total - v_credit;
  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p
  loop
    v_paid_in := v_paid_in + case v_pay.currency when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer end;
  end loop;
  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor
    from jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) p
  loop
    v_paid_out := v_paid_out + case v_pay.currency when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer end;
  end loop;
  if v_net > 5 and v_paid_in < v_net - 5 then
    raise exception 'payment % does not cover exchange difference %', v_paid_in, v_net;
  end if;
  -- What we owe the customer can go to their wallet instead of out of the drawer.
  if p_to_wallet then
    select customer_id, number into v_customer, v_number from public.orders where id = p_order_id;
    if v_customer is null then raise exception 'wallet refund needs a customer on the order'; end if;
    if v_net >= -5 then raise exception 'nothing is owed to the customer — wallet refund not needed'; end if;
    if v_paid_out <> 0 then raise exception 'wallet refund takes no cash refund lines'; end if;
  elsif v_net < -5 and abs(v_paid_out + v_net) > 5 then
    raise exception 'refund % does not match customer credit %', v_paid_out, -v_net;
  end if;

  -- New order carrying the exchange items.
  insert into public.orders (
    channel, status, branch_id, cashier_id, customer_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, note
  ) values (
    -- the new invoice stays with the same customer (history, loyalty, later wallet refunds)
    'pos', 'completed', v_branch, auth.uid(), (select customer_id from public.orders where id = p_order_id), v_rate,
    v_new_total - v_tva_cents + case when coalesce(v_tva.enabled, false) and not v_tva.prices_include_tva then 0 else v_tva_cents end,
    0, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_new_total,
    coalesce(p_note, 'تبديل من طلب سابق')
  ) returning id, number into v_new_order, v_new_number;

  insert into public.order_items (order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar, quantity, unit_price_usd_cents, line_total_usd_cents)
  select v_new_order, n.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
         n.quantity, n.unit_price, n.unit_price * n.quantity
  from _xnew n
  join public.product_variants pv on pv.id = n.variant_id
  join public.products p on p.id = pv.product_id;

  v_credit_applied := least(v_credit, v_new_total);
  if v_credit_applied > 0 then
    insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
    values (v_new_order, 'credit', 'USD', v_credit_applied, v_credit_applied);
  end if;
  insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
  select v_new_order, 'cash', p->>'currency', (p->>'amount_minor')::bigint,
    case p->>'currency' when 'USD' then (p->>'amount_minor')::integer
      else round(((p->>'amount_minor')::numeric / v_rate) * 100)::integer end
  from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p;

  -- The return record, linked both ways.
  insert into public.order_returns (order_id, exchange_order_id, kind, branch_id, cashier_id, lbp_per_usd, credit_usd_cents, note)
  values (p_order_id, v_new_order, 'exchange', v_branch, auth.uid(), v_rate, v_credit, p_note)
  returning id into v_return_id;

  insert into public.order_return_items (return_id, order_item_id, variant_id, quantity, credit_usd_cents)
  select v_return_id, order_item_id, variant_id, quantity, credit from _xret;

  insert into public.order_return_payments (return_id, direction, currency, amount_minor, usd_equiv_cents)
  select v_return_id, 'out', p->>'currency', (p->>'amount_minor')::bigint,
    case p->>'currency' when 'USD' then (p->>'amount_minor')::integer
      else round(((p->>'amount_minor')::numeric / v_rate) * 100)::integer end
  from jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) p;

  -- Stock: returned items back in, new items out.
  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select variant_id, v_branch, quantity, 'exchange', v_return_id, auth.uid() from _xret;
  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select variant_id, v_branch, -quantity, 'exchange', v_new_order, auth.uid() from _xnew;

  update public.orders set status = 'exchanged', updated_at = now()
  where id = p_order_id
    and (select coalesce(sum(ri.quantity), 0) from public.order_return_items ri
         join public.order_returns r on r.id = ri.return_id where r.order_id = p_order_id)
        >= (select sum(quantity) from public.order_items where order_id = p_order_id);

  if p_to_wallet then
    perform public.credit_wallet(v_customer, -v_net, 'return_credit', 'فرق تبديل فاتورة #' || v_number, v_return_id);
  end if;

  return query select v_return_id, v_new_order, v_new_number, v_credit, v_new_total;
end;
$function$;

-- 6 ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_wallet(p_customer_id uuid, p_amount_usd_cents integer, p_kind text, p_note text DEFAULT NULL::text, p_reference uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  if p_kind not in ('return_credit', 'adjustment') then raise exception 'invalid kind'; end if;
  -- free-form balance changes are a manager decision; cashiers credit returns only
  if p_kind = 'adjustment' and public.current_app_role() not in ('super_admin', 'store_manager') then
    raise exception 'not allowed';
  end if;
  if p_amount_usd_cents is null or p_amount_usd_cents = 0 then raise exception 'invalid amount'; end if;
  update public.customers
  set balance_usd_cents = balance_usd_cents + p_amount_usd_cents, updated_at = now()
  where id = p_customer_id;
  if not found then raise exception 'customer not found'; end if;
  insert into public.wallet_transactions (customer_id, delta_usd_cents, kind, reference_id, note, created_by)
  values (p_customer_id, p_amount_usd_cents, p_kind, p_reference, p_note, auth.uid());
end;
$function$;

-- 7 ───────────────────────────────────────────────────────────────────────
revoke execute on function public._enqueue_notification from public, anon, authenticated;
revoke execute on function public.enqueue_birthday_notifications() from public, anon, authenticated;
revoke execute on function public.sweep_unpaid_card_orders() from public, anon, authenticated;
revoke execute on function public.sweep_campaign_schedules() from public, anon, authenticated;

-- 8 ───────────────────────────────────────────────────────────────────────
revoke update, delete on public.orders from anon, authenticated;
drop policy if exists "managers update orders" on public.orders;

-- 9 ───────────────────────────────────────────────────────────────────────
drop policy if exists "inventory roles insert movements" on public.inventory_movements;
create policy "inventory roles insert movements" on public.inventory_movements
  for insert to authenticated
  with check (
    public.current_app_role() in ('super_admin', 'store_manager', 'inventory_manager')
    and created_by = auth.uid()
  );

-- 10 ──────────────────────────────────────────────────────────────────────
create or replace function public.guard_category_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is not null and exists (
    with recursive up as (
      select id, parent_id from public.categories where id = new.parent_id
      union
      select c.id, c.parent_id from public.categories c join up on c.id = up.parent_id
    )
    select 1 from up where id = new.id
  ) then
    raise exception 'a category cannot sit under itself or one of its own sub-categories';
  end if;
  return new;
end;
$$;
drop trigger if exists categories_guard_parent on public.categories;
create trigger categories_guard_parent
  before insert or update of parent_id on public.categories
  for each row execute function public.guard_category_parent();
