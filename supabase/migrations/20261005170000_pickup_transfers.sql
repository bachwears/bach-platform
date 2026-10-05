-- Free pickup from the shop + branch stock transfers (2026-10-05).
--
-- 1. Pickup: orders.fulfilment ('delivery' | 'pickup'); site_content 'pickup'
--    (enabled, address, hours, pay_note). The storefront hides the choice until
--    the shop address is filled in MGMT. A pickup order pays no delivery fee,
--    stores "Pickup at the shop" + the shop address in its ship fields, and pays
--    at the counter (cod = pay on collection) unless prepaid from the wallet.
--    The status path is unchanged: 'shipped' on a pickup order means "ready for
--    pickup" and 'delivered' means "collected" (apps label it so; the customer
--    messages follow below). Collection can be recorded as cash USD/LBP or Whish.
-- 2. storefront_checkout: p_fulfilment (default 'delivery'); Whish is a wallet
--    top-up only, so a direct order accepts cod / stripe. Everything else is the
--    production body unchanged.
-- 3. advance_online_order: optional p_paid_whish_usd_cents for COD collection.
-- 4. track_order returns fulfilment (+ the pickup address).
-- 5. transfer_stock(): move stock between branches as paired transfer_out /
--    transfer_in movements sharing one reference_id (the transfer id).

-- 1 ── pickup ─────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists fulfilment text not null default 'delivery'
    check (fulfilment in ('delivery', 'pickup'));

insert into public.site_content (key, value)
values ('pickup', jsonb_build_object(
  'enabled', true,
  'address', '',
  'hours', 'Every day 10:00–19:00',
  'pay_note', 'Pay at the shop — cash or Whish'
))
on conflict (key) do nothing;

-- 2 ── storefront_checkout ────────────────────────────────────────────────────
drop function if exists public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text, boolean);

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
revoke all on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.storefront_checkout(jsonb, text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;

-- 3 ── advance_online_order ───────────────────────────────────────────────────
drop function if exists public.advance_online_order(uuid, public.order_status, integer, bigint);

CREATE OR REPLACE FUNCTION public.advance_online_order(p_order_id uuid, p_next order_status, p_paid_usd_cents integer DEFAULT NULL::integer, p_paid_lbp bigint DEFAULT NULL::bigint, p_paid_whish_usd_cents integer DEFAULT NULL::integer)
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
  v_whish integer := 0;
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
    -- The courier (or, for a pickup, the shop) collected the money: record it
    -- at today's rate. A pickup may also be paid by Whish at the counter.
    if p_paid_usd_cents is null and p_paid_lbp is null and p_paid_whish_usd_cents is null then
      v_usd := v_order.total_usd_cents;
      v_lbp := 0;
    else
      v_usd := greatest(coalesce(p_paid_usd_cents, 0), 0);
      v_lbp := greatest(coalesce(p_paid_lbp, 0), 0);
      v_whish := greatest(coalesce(p_paid_whish_usd_cents, 0), 0);
    end if;
    if v_lbp > 0 then
      select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
      if v_rate is null or v_rate <= 0 then raise exception 'no exchange rate set'; end if;
      v_lbp_equiv := round(v_lbp / v_rate * 100);
    end if;
    -- a few cents of rounding are fine; a short payment is not
    if v_usd + v_lbp_equiv + v_whish < v_order.total_usd_cents - 5 then
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
    if v_whish > 0 then
      insert into public.order_payments (order_id, method, currency, amount_minor, usd_equiv_cents)
      values (p_order_id, 'whish', 'USD', v_whish, v_whish);
    end if;
  end if;

  update public.orders set status = p_next, updated_at = now() where id = p_order_id;
end;
$function$;
revoke all on function public.advance_online_order(uuid, public.order_status, integer, bigint, integer) from public, anon;
grant execute on function public.advance_online_order(uuid, public.order_status, integer, bigint, integer) to authenticated;

-- 4 ── track_order (production body + fulfilment / pickup address) ────────────
create or replace function public.track_order(p_number bigint, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public._rate_limit('order_lookup:number', p_number::text, 10, interval '1 hour');
  perform public._rate_limit('lookup:phone', right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8), 20, interval '1 hour');
  return (
    select jsonb_build_object(
      'number', o.number,
      'status', o.status,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'total_usd_cents', o.total_usd_cents,
      'payment', o.payment_method,
      'city', o.ship_city,
      'fulfilment', o.fulfilment,
      -- the shop's own address, never the customer's
      'pickup_address', case when o.fulfilment = 'pickup' then o.ship_address end,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('name', i.name_en, 'size', i.size, 'color', i.color_en, 'qty', i.quantity) order by i.name_en)
        from public.order_items i where i.order_id = o.id
      ), '[]'::jsonb)
    )
    from public.orders o
    left join public.customers c on c.id = o.customer_id
    where o.number = p_number
      and o.channel = 'online'
      and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
      and right(regexp_replace(coalesce(o.ship_phone, c.phone, ''), '\D', '', 'g'), 8)
          = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8)
  );
end;
$function$;

-- Customer messages: a pickup order is "ready for pickup" (not "on its way")
-- and "collected" (not "delivered"). Production body otherwise unchanged.
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event text;
  v_email text;
  v_payload jsonb;
  v_total text := '$' || to_char(new.total_usd_cents / 100.0, 'FM999990.00');
  v_pickup boolean := new.fulfilment = 'pickup';
  v_cod boolean := coalesce(new.payment_method::text, 'cod') = 'cod';
  v_shop jsonb;
  v_email_only boolean;
begin
  -- merges 20261005150000 (confirmed/picking/packed emails, per-order dedup) with pickup wording
  if new.channel <> 'online' or new.status = old.status then return new; end if;
  v_event := case new.status
    when 'confirmed' then 'order_confirmed'
    when 'picking' then 'order_picking'
    when 'packed' then 'order_packed'
    when 'shipped' then case when v_pickup then 'order_ready_pickup' else 'order_shipped' end
    when 'delivered' then case when v_pickup then 'order_collected' else 'order_delivered' end
    when 'cancelled' then 'order_cancelled'
    else null end;
  if v_event is null then return new; end if;
  -- the in-progress steps are email only (no WhatsApp templates for them)
  v_email_only := new.status in ('confirmed', 'picking', 'packed');
  select email into v_email from public.customers where id = new.customer_id;
  if v_pickup then
    select value into v_shop from public.site_content where key = 'pickup';
  end if;
  v_payload := jsonb_build_object(
    'order_number', new.number,
    'customer_name', coalesce(new.ship_name, ''),
    'total_usd', v_total,
    'payment', coalesce(new.payment_method::text, 'cod'),
    'due_note', case
                  when v_pickup and v_cod then 'Pay at the shop: ' || v_total || ' — cash or Whish.'
                  when v_pickup then 'Already paid — just collect it.'
                  when v_cod then 'Amount due on delivery: ' || v_total || '.'
                  else 'Already paid — nothing to pay on delivery.' end,
    'due_note_ar', case
                  when v_cod then 'المبلغ بالمحل: ' || v_total || ' — كاش أو Whish.'
                  else 'الطلب مدفوع، بس تعا استلمه.' end,
    'pickup_address', coalesce(new.ship_address, ''),
    'pickup_hours', coalesce(v_shop->>'hours', ''),
    'care_phone', '+961 71 566 296'
  );
  if not v_email_only then
    perform public._enqueue_notification(v_event, 'whatsapp', coalesce(new.ship_phone, ''), 'ar', v_payload);
  end if;
  if v_email is not null and not exists (
       select 1 from public.notification_log
       where event = v_event and channel = 'email' and recipient = v_email
         and payload ->> 'order_number' = new.number::text) then
    perform public._enqueue_notification(v_event, 'email', v_email, 'en', v_payload);
  end if;
  return new;
end;
$function$;

insert into public.notification_templates (event, channel, lang, subject, body) values
  ('order_ready_pickup', 'whatsapp', 'ar', null,
   'طلبك من BACH Wears رقم {{order_number}} جاهز للاستلام من المحل: {{pickup_address}}. الدوام: {{pickup_hours}}. {{due_note_ar}}'),
  ('order_ready_pickup', 'email', 'en',
   'Your BACH Wears order #{{order_number}} is ready for pickup',
   'Good news {{customer_name}} — order #{{order_number}} is ready to collect at {{pickup_address}} ({{pickup_hours}}). {{due_note}} — BACH Wears'),
  ('order_collected', 'whatsapp', 'ar', null,
   'استلمت طلبك رقم {{order_number}}. شكراً إنك اخترت BACH Wears. إذا في أي شي، نحنا هون: {{care_phone}}.'),
  ('order_collected', 'email', 'en',
   'Thank you for collecting your BACH Wears order #{{order_number}}',
   'Order #{{order_number}} has been collected. Thank you for choosing BACH Wears — if anything isn''t right, contact us on {{care_phone}}. — BACH Wears')
on conflict (event, channel, lang) do nothing;

-- 5 ── branch transfers ───────────────────────────────────────────────────────
create or replace function public.transfer_stock(p_from uuid, p_to uuid, p_items jsonb, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role public.app_role := public.current_app_role();
  v_ref uuid := gen_random_uuid();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_item record;
  v_available integer;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'inventory_manager') then
    raise exception 'not allowed';
  end if;
  if p_from is null or p_to is null or p_from = p_to then
    raise exception 'pick two different branches';
  end if;
  if not exists (select 1 from public.branches where id = p_from)
     or not exists (select 1 from public.branches where id = p_to and is_active) then
    raise exception 'branch not found';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'a transfer needs between 1 and 200 lines';
  end if;
  if (select count(distinct i->>'variant_id') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then
    raise exception 'each variant can appear only once';
  end if;
  if v_note is not null and length(v_note) > 500 then
    raise exception 'note too long';
  end if;

  -- Lock both branches' rows for these variants in one stable order, so two
  -- transfers (or a sale) can't interleave between the check and the move.
  perform 1
  from public.inventory_levels
  where branch_id in (p_from, p_to)
    and variant_id in (select (i->>'variant_id')::uuid from jsonb_array_elements(p_items) i)
  order by variant_id, branch_id
  for update;

  for v_item in
    select (i->>'variant_id')::uuid as vid, (i->>'quantity')::int as qty
    from jsonb_array_elements(p_items) i
  loop
    if v_item.vid is null or v_item.qty is null or v_item.qty < 1 or v_item.qty > 10000 then
      raise exception 'invalid quantity';
    end if;
    -- what can leave: on hand minus what online orders already hold
    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.vid and branch_id = p_from;
    if coalesce(v_available, 0) < v_item.qty then
      raise exception 'insufficient stock for %',
        coalesce((select sku from public.product_variants where id = v_item.vid), v_item.vid::text);
    end if;
    -- the movements trigger applies each delta to inventory_levels
    insert into public.inventory_movements (variant_id, branch_id, delta, reason, note, reference_id, created_by)
    values (v_item.vid, p_from, -v_item.qty, 'transfer_out', v_note, v_ref, auth.uid()),
           (v_item.vid, p_to, v_item.qty, 'transfer_in', v_note, v_ref, auth.uid());
  end loop;

  return v_ref;
end;
$function$;

revoke all on function public.transfer_stock(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.transfer_stock(uuid, uuid, jsonb, text) to authenticated;
