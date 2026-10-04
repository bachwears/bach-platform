-- Review fixes, round 2 (builds on 20261005090000_review_security_fixes).
--
-- 1. POS cash: payment lines record what stays in the drawer. The till sends
--    net lines (tendered minus change, change rounded down to 5,000 LBP), so an
--    LBP line can be negative when change in LBP is given for a USD payment.
--    Older tills / their queued offline sales still send tendered amounts: the
--    server takes the LBP change out itself. EOD, MGMT cash and the daily
--    journal already sum the lines, so they now match the drawer.
-- 2. Invoice discount above 10% needs a manager (signed in, or switched in on
--    the till with a verified PIN in the last 24h).
-- 3. verify_pos_pin: lockout after 5 wrong PINs per profile in 15 minutes.
-- 4. storefront_checkout: per_customer_limit is enforced for guests too.
-- 5. customers.birthday_set_at: the birthday gift unlocks 30 days after the
--    birthday is first added (all paths: promo code, popup, POS, reminders).
-- 6. Ending a campaign only clears sale prices the campaign itself set.
-- 7. Rate limits on public lookups, stock alerts and the spin wheel.
-- 8. product-media bucket: allowed MIME types + 20 MB limit.

-- 1 ── order_payments: negative LBP cash lines are change handed out ─────────
alter table public.order_payments drop constraint order_payments_amount_minor_check;
alter table public.order_payments add constraint order_payments_amount_minor_check
  check (amount_minor > 0 or (method = 'cash' and currency = 'LBP' and amount_minor < 0));
alter table public.order_payments drop constraint order_payments_usd_equiv_cents_check;
alter table public.order_payments add constraint order_payments_usd_equiv_cents_check
  check (usd_equiv_cents > 0 or (method = 'cash' and currency = 'LBP' and amount_minor < 0 and usd_equiv_cents <= 0));

-- 3 ── PIN attempts (also the proof a manager PIN was entered on this till) ──
create table if not exists public.pos_pin_attempts (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  attempted_by uuid,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists pos_pin_attempts_profile_idx on public.pos_pin_attempts (profile_id, created_at desc);
alter table public.pos_pin_attempts enable row level security;
revoke all on public.pos_pin_attempts from anon, authenticated;
revoke all on sequence public.pos_pin_attempts_id_seq from anon, authenticated;


-- 1 + 2 + 5 ── pos_checkout: net drawer lines, 10% cashier cap, birthday age ──
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
    (i->>'variant_id')::uuid as variant_id,
    (i->>'quantity')::int as quantity,
    coalesce((i->>'line_discount_bp')::int, 0) as line_discount_bp
  from jsonb_array_elements(p_items) i;

  if exists (select 1 from _lines where quantity is null or quantity <= 0) then
    raise exception 'invalid quantity';
  end if;
  if exists (select 1 from _lines where line_discount_bp < 0 or line_discount_bp > 10000) then
    raise exception 'invalid line discount';
  end if;
  if v_role = 'cashier' and exists (select 1 from _lines where line_discount_bp > 0) then
    raise exception 'line discounts need a manager';
  end if;

  for v_item in
    select l.variant_id, l.quantity, l.line_discount_bp,
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

    select quantity - reserved into v_available
    from public.inventory_levels
    where variant_id = v_item.variant_id and branch_id = p_branch_id
    for update;

    if coalesce(v_available, 0) < v_item.quantity then
      raise exception 'insufficient stock for %', coalesce(v_item.sku, v_item.name_en);
    end if;

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

  v_discount := v_line_discounts
    + round(((v_subtotal - v_line_discounts)::numeric * v_discount_bp) / 10000)::integer;
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
    quantity, unit_price_usd_cents, line_total_usd_cents
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

-- 3 ── verify_pos_pin: 5 wrong PINs per profile per 15 minutes, then locked ──
create or replace function public.verify_pos_pin(p_profile_id uuid, p_pin text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_hash text;
  v_ok boolean;
  v_fails integer;
begin
  if public.current_app_role() is null then
    raise exception 'not allowed';
  end if;
  -- one attempt at a time per profile, so parallel guesses can't slip past the count
  perform pg_advisory_xact_lock(hashtextextended('pos_pin:' || coalesce(p_profile_id::text, ''), 0));
  select count(*) into v_fails
  from public.pos_pin_attempts a
  where a.profile_id = p_profile_id
    and not a.success
    and a.created_at > now() - interval '15 minutes'
    and a.created_at > coalesce((
      select max(s.created_at) from public.pos_pin_attempts s
      where s.profile_id = p_profile_id and s.success
    ), '-infinity'::timestamptz);
  if v_fails >= 5 then
    raise exception 'too many PIN attempts, try again later';
  end if;

  select pos_pin_hash into v_hash from public.profiles where id = p_profile_id;
  if v_hash is null then return false; end if;
  v_ok := v_hash = crypt(coalesce(p_pin, ''), v_hash);
  insert into public.pos_pin_attempts (profile_id, attempted_by, success)
  values (p_profile_id, auth.uid(), v_ok);
  if random() < 0.02 then
    delete from public.pos_pin_attempts where created_at < now() - interval '7 days';
  end if;
  return v_ok;
end;
$function$;


-- 4 ── storefront_checkout: per-customer promo limit for guests ──────────────
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

-- 5 ── birthday_set_at: when the birthday was added (gift unlocks 30 days later)
alter table public.customers add column if not exists birthday_set_at timestamptz;
update public.customers set birthday_set_at = created_at
where birthday is not null and birthday_set_at is null;

create or replace function public.customers_birthday_set_at()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.birthday is null then
    new.birthday_set_at := null;
  elsif tg_op = 'INSERT' then
    -- only trusted server-side imports (no signed-in user) may carry their own date
    if new.birthday_set_at is null or auth.uid() is not null then
      new.birthday_set_at := now();
    end if;
  elsif old.birthday is null or new.birthday <> old.birthday then
    new.birthday_set_at := now();
  elsif auth.uid() is not null then
    -- nobody signed in (customer or staff) can move the date by hand
    new.birthday_set_at := old.birthday_set_at;
  end if;
  return new;
end;
$function$;
revoke all on function public.customers_birthday_set_at() from public, anon, authenticated;

drop trigger if exists customers_birthday_set_at on public.customers;
create trigger customers_birthday_set_at
  before insert or update on public.customers
  for each row execute function public.customers_birthday_set_at();


CREATE OR REPLACE FUNCTION public.validate_promocode(p_code text)
 RETURNS TABLE(valid boolean, kind promocode_kind, value integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    if v_customer.birthday_set_at is null or v_customer.birthday_set_at > now() - interval '30 days' then
      return query select false, null::public.promocode_kind, null::integer, 'the birthday gift unlocks 30 days after you add your birthday'; return;
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
$function$;

CREATE OR REPLACE FUNCTION public.my_birthday_offer()
 RETURNS TABLE(in_window boolean, code text, percent integer, already_used boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer record;
  v_promo record;
begin
  select * into v_customer from public.customers where auth_user_id = auth.uid();
  select * into v_promo from public.promocodes where is_birthday and is_enabled limit 1;
  if v_customer is null or v_promo is null or v_customer.birthday is null
     or v_customer.birthday_set_at is null or v_customer.birthday_set_at > now() - interval '30 days' then
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
$function$;

CREATE OR REPLACE FUNCTION public.pos_birthday_eligibility(p_customer_id uuid)
 RETURNS TABLE(eligible boolean, percent integer, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c record;
  v_p record;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select * into v_c from public.customers where id = p_customer_id;
  select * into v_p from public.promocodes where is_birthday and is_enabled limit 1;
  if v_c is null or v_p is null or v_c.birthday is null then
    return query select false, null::integer, 'no birthday on file'; return;
  end if;
  if v_c.birthday_set_at is null or v_c.birthday_set_at > now() - interval '30 days' then
    return query select false, null::integer, 'birthday added less than 30 days ago'; return;
  end if;
  if not public._in_birthday_window(v_c.birthday, v_p.birthday_window_days, current_date) then
    return query select false, null::integer, 'not in window'; return;
  end if;
  if exists (
    select 1 from public.promocode_redemptions
    where promocode_id = v_p.id and customer_id = p_customer_id
      and redemption_year = extract(year from current_date)::integer
  ) then
    return query select false, null::integer, 'already used'; return;
  end if;
  return query select true, v_p.value, 'ok';
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_birthday_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      and birthday_set_at <= now() - interval '30 days'
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
$function$;

-- 6 ── campaigns remember the sale price they set on each product ───────────
alter table public.campaigns add column if not exists applied_sale_prices jsonb;

-- Clears only the sale prices still equal to what the campaign set; a price
-- changed by hand while the campaign ran is kept.
create or replace function public._clear_campaign_prices(p_campaign_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_c record;
  v_count integer;
begin
  select * into v_c from public.campaigns where id = p_campaign_id;
  if v_c is null then return 0; end if;
  update public.products p
  set sale_price_usd_cents = null, updated_at = now()
  where p.id in (select (jsonb_array_elements_text(coalesce(v_c.affected_products, '[]'::jsonb)))::uuid)
    and p.sale_price_usd_cents is not null
    and p.sale_price_usd_cents = coalesce(
      (v_c.applied_sale_prices->>(p.id::text))::integer,
      -- campaigns published before applied_sale_prices existed: same formula as publish_campaign
      greatest(round(p.price_usd_cents::numeric * (100 - v_c.percent_off) / 100)::integer, 0)
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
revoke all on function public._clear_campaign_prices(uuid) from public, anon, authenticated;


CREATE OR REPLACE FUNCTION public.publish_campaign(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c record;
  v_ids uuid[];
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'marketing_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_c from public.campaigns where id = p_id for update;
  if v_c is null then raise exception 'campaign not found'; end if;
  if v_c.status = 'live' then raise exception 'already live'; end if;

  select coalesce(array_agg(p.id), '{}') into v_ids
  from public.products p
  where p.sale_price_usd_cents is null
    and p.status <> 'archived'
    and (
      v_c.target_kind = 'all'
      or (v_c.target_kind = 'category' and p.category_id = v_c.target_category)
      or (v_c.target_kind = 'season' and exists (
            select 1 from public.product_seasons ps
            where ps.product_id = p.id and ps.season = v_c.target_season))
    );

  update public.products
  set sale_price_usd_cents = greatest(round(price_usd_cents::numeric * (100 - v_c.percent_off) / 100)::integer, 0),
      updated_at = now()
  where id = any(v_ids);

  update public.campaigns
  set status = 'live', affected_products = to_jsonb(v_ids),
      applied_sale_prices = (
        select coalesce(jsonb_object_agg(p.id::text, p.sale_price_usd_cents), '{}'::jsonb)
        from public.products p where p.id = any(v_ids)
      ),
      updated_at = now()
  where id = p_id;

  return coalesce(array_length(v_ids, 1), 0);
end;
$function$;

CREATE OR REPLACE FUNCTION public.end_campaign(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c record;
  v_count integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager', 'marketing_manager') then
    raise exception 'not allowed';
  end if;
  select * into v_c from public.campaigns where id = p_id for update;
  if v_c is null then raise exception 'campaign not found'; end if;
  if v_c.status <> 'live' then raise exception 'campaign is not live'; end if;

  v_count := public._clear_campaign_prices(p_id);

  update public.campaigns set status = 'ended', updated_at = now() where id = p_id;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sweep_campaign_schedules()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_c record;
  v_n integer := 0;
begin
  for v_c in select id from public.campaigns where status = 'live' and ends_on is not null and ends_on < current_date
  loop
    perform public._clear_campaign_prices(v_c.id);
    update public.campaigns set status = 'ended', updated_at = now() where id = v_c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;

-- 7 ── rate limits (Postgres has no client IP: keyed by the argument) ───────
create table if not exists public.rate_limit_hits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, key_hash, window_start)
);
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Fixed-window counter. Raises once p_max calls were made for (bucket, key) in
-- the current window. Keys are stored hashed (phones/emails are personal data).
create or replace function public._rate_limit(p_bucket text, p_key text, p_max integer, p_window interval)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_secs double precision := extract(epoch from p_window);
  v_start timestamptz;
  v_hits integer;
begin
  if p_key is null or p_key = '' or v_secs <= 0 then return; end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  insert into public.rate_limit_hits as r (bucket, key_hash, window_start, hits)
  values (p_bucket, md5(p_key), v_start, 1)
  on conflict (bucket, key_hash, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;
  if v_hits > p_max then
    raise exception 'too many attempts, try again later';
  end if;
  if random() < 0.01 then
    delete from public.rate_limit_hits where window_start < now() - interval '2 days';
  end if;
end;
$function$;
revoke all on function public._rate_limit(text, text, integer, interval) from public, anon, authenticated;

-- track_order was a STABLE SQL function (PostgREST runs those read-only), so it
-- becomes VOLATILE plpgsql to be able to count attempts. Same result shape.
create or replace function public.track_order(p_number bigint, p_phone text)
 returns jsonb
 language plpgsql
 volatile security definer
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


CREATE OR REPLACE FUNCTION public.lookup_order_for_return(p_number bigint, p_phone text)
 RETURNS TABLE(order_number bigint, order_status text, ordered_at timestamp with time zone, eligible boolean, ineligible_reason text, items jsonb, requests jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_reason text;
begin
  perform public._rate_limit('order_lookup:number', p_number::text, 10, interval '1 hour');
  perform public._rate_limit('lookup:phone', right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8), 20, interval '1 hour');
  select o.* into v_order
  from public.orders o
  where o.number = p_number and public._phone_matches(o.ship_phone, p_phone);
  if v_order.id is null then
    return; -- empty result: not found / phone mismatch (indistinguishable on purpose)
  end if;

  v_reason := case
    when v_order.channel <> 'online' then 'pos_order'
    when v_order.status not in ('delivered', 'completed') then 'not_delivered'
    when v_order.created_at < now() - interval '30 days' then 'window_passed'
    when exists (
      select 1 from public.return_requests r
      where r.order_id = v_order.id and r.status in ('requested', 'approved')
    ) then 'open_request'
    else null
  end;

  return query
  select
    v_order.number,
    v_order.status::text,
    v_order.created_at,
    v_reason is null,
    v_reason,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_item_id', oi.id,
        'name_en', oi.name_en,
        'size', oi.size,
        'color_en', oi.color_en,
        'quantity', oi.quantity
      ) order by oi.name_en)
      from public.order_items oi where oi.order_id = v_order.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', r.kind,
        'status', r.status,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from public.return_requests r where r.order_id = v_order.id
    ), '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.track_complaint(p_number bigint, p_phone text)
 RETURNS TABLE(status complaint_status, subject text, created_at timestamp with time zone, events jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_c record;
begin
  perform public._rate_limit('complaint_lookup:number', p_number::text, 10, interval '1 hour');
  perform public._rate_limit('lookup:phone', right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8), 20, interval '1 hour');
  select * into v_c from public.complaints c where c.number = p_number and c.phone = v_phone;
  if v_c is null then return; end if; -- not found / wrong phone: no rows (keeps the attempt counted)
  return query select v_c.status, v_c.subject, v_c.created_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'body', e.body, 'at', e.created_at) order by e.created_at)
      from public.complaint_events e
      where e.complaint_id = v_c.id and e.is_public
    ), '[]'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.subscribe_stock_alert(p_variant_id uuid, p_phone text DEFAULT NULL::text, p_email text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  perform public._rate_limit('stock_alert:phone', v_phone, 10, interval '1 day');
  perform public._rate_limit('stock_alert:email', v_email, 10, interval '1 day');
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
$function$;

CREATE OR REPLACE FUNCTION public.spin_wheel(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(trim(p_email));
  v_existing public.wheel_spins;
  v_roll integer;
  v_prize text;
  v_pct integer;
  v_code text;
begin
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  select * into v_existing from public.wheel_spins where email = v_email;
  if v_existing.email is not null then
    return jsonb_build_object('already_played', true, 'prize', v_existing.prize, 'code', v_existing.promocode);
  end if;

  -- Mass farming of fresh emails: at most 20 new spins an hour across the store.
  perform public._rate_limit('spin_wheel:global', 'all', 20, interval '1 hour');

  -- Weighted server-side roll: 5%→40, 10%→25, 15%→10, try-again→25.
  v_roll := floor(random() * 100)::integer;
  if v_roll < 40 then v_prize := 'percent-5'; v_pct := 5;
  elsif v_roll < 65 then v_prize := 'percent-10'; v_pct := 10;
  elsif v_roll < 75 then v_prize := 'percent-15'; v_pct := 15;
  else v_prize := 'none'; v_pct := null;
  end if;

  if v_pct is not null then
    v_code := 'spin-' || substr(md5(random()::text || v_email), 1, 8);
    insert into public.promocodes (code, kind, value, is_enabled, starts_at, ends_at, per_customer_limit)
    values (v_code, 'percent', v_pct, true, now(), now() + interval '7 days', 1);
  end if;

  insert into public.wheel_spins (email, prize, promocode) values (v_email, v_prize, v_code);

  -- The wheel doubles as a newsletter capture — consented by playing.
  insert into public.newsletter_subscribers (email, source)
  values (v_email, 'wheel')
  on conflict (email) do nothing;

  return jsonb_build_object('already_played', false, 'prize', v_prize, 'code', v_code);
end;
$function$;

-- 8 ── product-media bucket: images + short videos only, 20 MB max ─────────
update storage.buckets
set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'video/mp4'],
    file_size_limit = 20971520
where id = 'product-media';
