-- Outfits, plan 1 tasks 5–6: both checkouts sell looks.
-- Lines may carry outfit_id + outfit_group (one group per look in the cart);
-- price_cart() prices the looks and the promo / invoice discount in one place;
-- order_items keep the look and each piece's share; stock is checked per piece.

CREATE OR REPLACE FUNCTION public.storefront_checkout(p_items jsonb, p_name text, p_phone text, p_city text, p_address text, p_note text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_promocode text DEFAULT NULL::text, p_payment_method text DEFAULT 'cod'::text, p_use_wallet boolean DEFAULT false, p_fulfilment text DEFAULT 'delivery'::text)
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
  v_fulfilment text := lower(coalesce(nullif(trim(p_fulfilment), ''), 'delivery'));
  v_pickup jsonb;
  v_priced jsonb;
  v_promo_kind text;
  v_promo_value integer := 0;
  v_outfit integer := 0;
  v_promo integer := 0;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if length(v_phone) < 7 or length(v_phone) > 15 then raise exception 'valid phone required'; end if;
  if v_fulfilment not in ('delivery', 'pickup') then
    raise exception 'invalid fulfilment';
  end if;
  if v_fulfilment = 'pickup' then
    -- Free pickup from the shop (site_content 'pickup'): offered only once the
    -- shop address is set; no delivery address and no delivery fee.
    select value into v_pickup from public.site_content where key = 'pickup';
    if coalesce(v_pickup->>'enabled', 'false') <> 'true' or coalesce(trim(v_pickup->>'address'), '') = '' then
      raise exception 'pickup not available';
    end if;
  elsif coalesce(trim(p_city), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'delivery address required';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'valid email required';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) not between 1 and 20 then
    raise exception 'cart must have between 1 and 20 lines';
  end if;
  -- one line per piece (per look): the bag merges repeats, so a repeated line is
  -- a forged cart. The same piece may sit loose and inside a look, or in two looks;
  -- stock is checked on the total per piece below.
  if (select count(distinct (i->>'variant_id') || '|' || coalesce(i->>'outfit_group', '')) from jsonb_array_elements(p_items) i)
     <> jsonb_array_length(p_items) then
    raise exception 'each item can appear only once in the cart';
  end if;

  if p_use_wallet then
    -- Wallet prepay: identity comes from the session, never from the form.
    select id, balance_usd_cents into v_customer, v_balance
    from public.customers where auth_user_id = auth.uid();
    if v_customer is null then raise exception 'sign in to pay from your wallet'; end if;
    v_method := 'whish';
  else
    -- Whish is a wallet top-up only (founder 2026-10-05): a direct order pays
    -- cash on delivery / at the shop, or by card.
    if p_payment_method not in ('cod', 'stripe') then
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

  create temp table _web (
    key text, variant_id uuid, quantity int, unit_price integer,
    outfit_id uuid, outfit_group text, outfit_discount integer not null default 0
  ) on commit drop;
  for v_item in
    select (i->>'variant_id')::uuid as vid, (i->>'quantity')::int as qty, ord::text as k,
           nullif(i->>'outfit_id', '')::uuid as oid, nullif(i->>'outfit_group', '') as grp
    from jsonb_array_elements(p_items) with ordinality as t(i, ord)
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

    insert into _web (key, variant_id, quantity, unit_price, outfit_id, outfit_group)
    values (v_item.k, v_item.vid, v_item.qty, v_unit, v_item.oid, v_item.grp);
    v_subtotal := v_subtotal + v_unit * v_item.qty;
  end loop;

  -- stock on the total per piece (a piece can be loose and inside a look)
  for v_item in select w.variant_id as vid, sum(w.quantity) as qty from _web w group by w.variant_id loop
    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.vid and branch_id = v_branch
    for update;
    if coalesce(v_available, 0) < v_item.qty then
      raise exception 'insufficient stock';
    end if;
  end loop;

  if nullif(trim(coalesce(p_promocode, '')), '') is not null then
    select * into v_check from public.validate_promocode(p_promocode);
    if not v_check.valid then
      raise exception 'promocode: %', v_check.message;
    end if;
    select id into v_promo_id from public.promocodes where code = lower(trim(p_promocode));
    v_promo_kind := case v_check.kind when 'percent' then 'percent_bp' else 'fixed' end;
    v_promo_value := case v_check.kind when 'percent' then v_check.value * 100 else v_check.value end;
  end if;

  -- looks and the promo code, priced in one place (price_cart): each look's saving
  -- split over its pieces, the code applied to what the looks' promo mode allows
  select public.price_cart(
    (select jsonb_agg(jsonb_build_object('key', key, 'variant_id', variant_id, 'quantity', quantity,
       'unit', unit_price, 'outfit_id', outfit_id, 'outfit_group', outfit_group)) from _web),
    v_promo_kind, v_promo_value)
  into v_priced;
  update _web w set outfit_discount = (x->>'outfit_discount')::integer
  from jsonb_array_elements(v_priced->'lines') x
  where x->>'key' = w.key;
  v_outfit := (v_priced->>'outfit_discount')::integer;
  v_promo := (v_priced->>'promo_discount')::integer;
  v_discount := v_outfit + v_promo;

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
  if v_fulfilment = 'delivery' and v_subtotal - (v_discount - v_wallet_discount) < v_free_over then
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

  -- Per-customer promo limits hold for guests too (resolved by phone above).
  -- The lock keeps two checkouts for the same customer from both passing.
  if v_promo_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('promo:' || v_promo_id::text || ':' || v_customer::text, 0));
    if exists (
      select 1 from public.promocodes pc
      where pc.id = v_promo_id
        and (
          (pc.is_birthday and exists (
             select 1 from public.promocode_redemptions r
             where r.promocode_id = pc.id and r.customer_id = v_customer
               and r.redemption_year = extract(year from current_date)::integer))
          or (not pc.is_birthday and pc.per_customer_limit is not null and (
             select count(*) from public.promocode_redemptions r
             where r.promocode_id = pc.id and r.customer_id = v_customer) >= pc.per_customer_limit)
        )
    ) then
      raise exception 'promocode: code already used';
    end if;
  end if;

  insert into public.orders (
    channel, status, branch_id, customer_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, delivery_usd_cents,
    note, ship_name, ship_phone, ship_city, ship_address, payment_method, fulfilment
  ) values (
    'online', (case when p_use_wallet then 'confirmed' else 'pending' end)::public.order_status, v_branch, v_customer, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, v_delivery,
    nullif(trim(coalesce(p_note, '')), ''), trim(p_name), v_phone,
    case when v_fulfilment = 'pickup' then 'Pickup at the shop' else trim(p_city) end,
    case when v_fulfilment = 'pickup' then trim(v_pickup->>'address') else trim(p_address) end,
    v_method, v_fulfilment
  ) returning id, number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar,
    quantity, unit_price_usd_cents, line_total_usd_cents,
    outfit_id, outfit_group, outfit_discount_cents
  )
  select v_order_id, w.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
         w.quantity, w.unit_price, w.unit_price * w.quantity - w.outfit_discount,
         w.outfit_id,
         case when w.outfit_group is null then null else md5(v_order_id::text || '|' || w.outfit_group)::uuid end,
         w.outfit_discount
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

CREATE OR REPLACE FUNCTION public.pos_checkout(p_branch_id uuid, p_items jsonb, p_payments jsonb, p_discount_basis_points integer DEFAULT 0, p_customer_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_apply_birthday boolean DEFAULT false, p_acting_cashier uuid DEFAULT NULL::uuid, p_client_ref uuid DEFAULT NULL::uuid)
 RETURNS TABLE(order_id uuid, order_number bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.app_role := public.current_app_role();
  v_rate numeric(14, 2);
  v_tva record;
  v_item record;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal integer := 0;
  v_line_discounts integer := 0;
  v_discount integer := 0;
  v_discount_bp integer := p_discount_basis_points;
  v_tva_cents integer := 0;
  v_total integer := 0;
  v_paid_usd integer := 0;
  v_unit_price integer;
  v_available integer;
  v_pay record;
  v_usd_equiv integer;
  v_promo record;
  v_customer record;
  v_cashier uuid := auth.uid();
  v_actor_role public.app_role;
  v_pay_lines jsonb := '[]'::jsonb;
  v_is_net boolean := false;
  v_usd_sum bigint := 0;
  v_lbp_sum bigint := 0;
  v_over numeric;
  v_change_lbp bigint;
  v_priced jsonb;
  v_outfit integer := 0;
  v_invoice integer := 0;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;

  -- Idempotent replay: the queued sale already landed on an earlier sync.
  if p_client_ref is not null then
    select o.id, o.number into v_order_id, v_order_number
    from public.orders o where o.client_ref = p_client_ref;
    if v_order_id is not null then
      return query select v_order_id, v_order_number;
      return;
    end if;
  end if;

  if p_discount_basis_points < 0 or p_discount_basis_points > 10000 then
    raise exception 'invalid discount';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'empty cart';
  end if;

  if p_acting_cashier is not null then
    if not exists (
      select 1 from public.profiles
      where id = p_acting_cashier
        and role in ('super_admin', 'store_manager', 'cashier')
        and pos_pin_hash is not null
    ) then
      raise exception 'invalid acting cashier';
    end if;
    v_cashier := p_acting_cashier;
  end if;

  -- Invoice discount: a cashier goes up to 10%. More needs a manager, either
  -- signed in on the till or switched in on this device with their PIN.
  v_actor_role := v_role;
  if p_acting_cashier is not null then
    select role into v_actor_role from public.profiles where id = p_acting_cashier;
  end if;
  if p_discount_basis_points > 1000 then
    if v_actor_role is null or v_actor_role not in ('super_admin', 'store_manager') then
      raise exception 'discount above 10%% needs a manager';
    end if;
    if p_acting_cashier is not null and p_acting_cashier is distinct from auth.uid() and not exists (
      select 1 from public.pos_pin_attempts a
      where a.profile_id = p_acting_cashier and a.attempted_by = auth.uid()
        and a.success and a.created_at > now() - interval '24 hours'
    ) then
      raise exception 'discount above 10%% needs a manager PIN';
    end if;
  end if;

  if p_apply_birthday then
    if p_customer_id is null then raise exception 'birthday discount needs a customer'; end if;
    select * into v_customer from public.customers where id = p_customer_id;
    if v_customer is null then raise exception 'customer not found'; end if;
    select * into v_promo from public.promocodes where is_birthday and is_enabled limit 1;
    if v_promo is null then raise exception 'birthday promo not configured'; end if;
    if v_customer.birthday is null
       or not public._in_birthday_window(v_customer.birthday, v_promo.birthday_window_days, current_date) then
      raise exception 'customer is not in their birthday window';
    end if;
    if v_customer.birthday_set_at is null or v_customer.birthday_set_at > now() - interval '30 days' then
      raise exception 'birthday was added less than 30 days ago';
    end if;
    if exists (
      select 1 from public.promocode_redemptions
      where promocode_id = v_promo.id and customer_id = p_customer_id
        and redemption_year = extract(year from current_date)::integer
    ) then
      raise exception 'birthday gift already used this year';
    end if;
    v_discount_bp := greatest(v_discount_bp, v_promo.value * 100);
  end if;

  select lbp_per_usd into v_rate
  from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then
    raise exception 'no exchange rate configured';
  end if;

  select enabled, rate_basis_points, prices_include_tva into v_tva
  from public.tva_settings limit 1;

  create temp table _lines on commit drop as
  select
    ord::text as key,
    (i->>'variant_id')::uuid as variant_id,
    (i->>'quantity')::int as quantity,
    coalesce((i->>'line_discount_bp')::int, 0) as line_discount_bp,
    nullif(i->>'outfit_id', '')::uuid as outfit_id,
    nullif(i->>'outfit_group', '') as outfit_group,
    0 as unit,
    0 as outfit_discount
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  if exists (select 1 from _lines where quantity is null or quantity <= 0) then
    raise exception 'invalid quantity';
  end if;
  if exists (select 1 from _lines where line_discount_bp < 0 or line_discount_bp > 10000) then
    raise exception 'invalid line discount';
  end if;
  if v_role = 'cashier' and exists (select 1 from _lines where line_discount_bp > 0) then
    raise exception 'line discounts need a manager';
  end if;
  -- a look carries its own price: no line discount on top of it
  if exists (select 1 from _lines where outfit_group is not null and line_discount_bp > 0) then
    raise exception 'no line discount on a look';
  end if;

  for v_item in
    select l.key, l.variant_id, l.quantity, l.line_discount_bp,
           pv.sku, pv.price_usd_cents_override,
           p.name_en, p.price_usd_cents, p.sale_price_usd_cents
    from _lines l
    join public.product_variants pv on pv.id = l.variant_id and pv.is_active
    join public.products p on p.id = pv.product_id
  loop
    v_unit_price := coalesce(
      v_item.price_usd_cents_override,
      least(coalesce(v_item.sale_price_usd_cents, v_item.price_usd_cents), v_item.price_usd_cents)
    );

    update _lines set unit = v_unit_price where key = v_item.key;
    v_subtotal := v_subtotal + v_unit_price * v_item.quantity;
    v_line_discounts := v_line_discounts
      + round((v_unit_price * v_item.quantity)::numeric * v_item.line_discount_bp / 10000)::integer;
  end loop;

  if (select count(*) from _lines) <> (
    select count(*) from _lines l
    join public.product_variants pv on pv.id = l.variant_id and pv.is_active
  ) then
    raise exception 'unknown or inactive variant in cart';
  end if;

  -- stock on the total per piece (a piece can be loose and inside a look)
  for v_item in
    select l.variant_id, sum(l.quantity) as quantity, min(pv.sku) as sku, min(p.name_en) as name_en
    from _lines l
    join public.product_variants pv on pv.id = l.variant_id
    join public.products p on p.id = pv.product_id
    group by l.variant_id
  loop
    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.variant_id and branch_id = p_branch_id
    for update;
    if coalesce(v_available, 0) < v_item.quantity then
      raise exception 'insufficient stock for %', coalesce(v_item.sku, v_item.name_en);
    end if;
  end loop;

  -- looks priced in one place (price_cart); the invoice / birthday discount
  -- follows each look's promo mode, and lines' own discounts stay outside it
  select public.price_cart(
    (select jsonb_agg(jsonb_build_object('key', key, 'variant_id', variant_id, 'quantity', quantity,
       'unit', unit, 'outfit_id', outfit_id, 'outfit_group', outfit_group)) from _lines),
    case when v_discount_bp > 0 then 'percent_bp' end, v_discount_bp)
  into v_priced;
  update _lines l set outfit_discount = (x->>'outfit_discount')::integer
  from jsonb_array_elements(v_priced->'lines') x
  where x->>'key' = l.key;
  v_outfit := (v_priced->>'outfit_discount')::integer;
  v_invoice := round((((v_priced->>'promo_base')::integer - v_line_discounts)::numeric * v_discount_bp) / 10000)::integer;
  v_discount := v_line_discounts + v_invoice + v_outfit;
  v_total := v_subtotal - v_discount;

  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      v_tva_cents := v_total - round(v_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_total::numeric * v_tva.rate_basis_points / 10000);
      v_total := v_total + v_tva_cents;
    end if;
  end if;

  -- Payment lines record what stays in the drawer. Tills mark them "net": the
  -- change handed back is already taken out, so an LBP line can be negative
  -- (change in LBP for a USD payment).
  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor,
           coalesce((p->>'net')::boolean, false) as is_net
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p
  loop
    if v_pay.currency is null or v_pay.currency not in ('USD', 'LBP')
       or v_pay.amount_minor is null or v_pay.amount_minor = 0
       or (v_pay.amount_minor < 0 and (v_pay.currency <> 'LBP' or not v_pay.is_net)) then
      raise exception 'invalid payment line';
    end if;
    v_is_net := v_is_net or v_pay.is_net;
    if v_pay.currency = 'USD' then
      v_usd_sum := v_usd_sum + v_pay.amount_minor;
    else
      v_lbp_sum := v_lbp_sum + v_pay.amount_minor;
    end if;
    v_pay_lines := v_pay_lines || jsonb_build_object('currency', v_pay.currency, 'amount_minor', v_pay.amount_minor);
    v_usd_equiv := case v_pay.currency
      when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer
    end;
    v_paid_usd := v_paid_usd + v_usd_equiv;
  end loop;

  -- Older tills (and sales they queued offline) sent what the customer handed
  -- over and gave the change in LBP: take that change out here, rounded down to
  -- 5,000 LBP exactly like the till rounds it.
  if not v_is_net then
    v_over := v_lbp_sum::numeric * 10000 + (v_usd_sum - v_total)::numeric * round(v_rate * 100);
    if v_over >= 50000000 then
      v_change_lbp := (floor(v_over / 50000000) * 5000)::bigint;
      v_pay_lines := v_pay_lines || jsonb_build_object('currency', 'LBP', 'amount_minor', -v_change_lbp);
      v_paid_usd := v_paid_usd + round((-v_change_lbp::numeric / v_rate) * 100)::integer;
    end if;
  end if;

  if v_paid_usd < v_total - 5 then
    raise exception 'payment % does not cover total %', v_paid_usd, v_total;
  end if;

  insert into public.orders (
    channel, status, branch_id, customer_id, cashier_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, note, payment_method, client_ref
  ) values (
    'pos', 'completed', p_branch_id, p_customer_id, v_cashier, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, p_note, 'cash', p_client_ref
  ) returning id, number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar,
    quantity, unit_price_usd_cents, line_total_usd_cents,
    outfit_id, outfit_group, outfit_discount_cents
  )
  select
    v_order_id, l.variant_id, pv.sku, p.name_en, p.name_ar, pv.size, pv.color_en, pv.color_ar,
    l.quantity,
    coalesce(pv.price_usd_cents_override,
             least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents)),
    coalesce(pv.price_usd_cents_override,
             least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents)) * l.quantity
      - round((coalesce(pv.price_usd_cents_override,
                        least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
               * l.quantity)::numeric * l.line_discount_bp / 10000)::integer
      - l.outfit_discount,
    l.outfit_id,
    case when l.outfit_group is null then null else md5(v_order_id::text || '|' || l.outfit_group)::uuid end,
    l.outfit_discount
  from _lines l
  join public.product_variants pv on pv.id = l.variant_id
  join public.products p on p.id = pv.product_id;

  insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
  select
    v_order_id, 'cash',
    p->>'currency',
    (p->>'amount_minor')::bigint,
    case p->>'currency'
      when 'USD' then (p->>'amount_minor')::integer
      else round(((p->>'amount_minor')::numeric / v_rate) * 100)::integer
    end
  from jsonb_array_elements(v_pay_lines) p;

  if p_apply_birthday then
    insert into public.promocode_redemptions (promocode_id, customer_id, order_id, redemption_year)
    values (v_promo.id, p_customer_id, v_order_id, extract(year from current_date)::integer);
  end if;

  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select l.variant_id, p_branch_id, -l.quantity, 'sale', v_order_id, auth.uid()
  from _lines l;

  return query select v_order_id, v_order_number;
end;
$function$;
