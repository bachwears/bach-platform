-- POS invoice discount: a percentage OR an amount in USD (founder 2026-10-14).
-- pos_checkout gains p_discount_usd_cents (default 0, so older tills and queued
-- offline sales keep working). Both end up in orders.discount_usd_cents.
-- A cashier still gives up to 10% alone; an amount above 10% of the invoice
-- needs a manager, same as the percentage.

drop function if exists public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean, uuid, uuid);

CREATE OR REPLACE FUNCTION public.pos_checkout(p_branch_id uuid, p_items jsonb, p_payments jsonb, p_discount_basis_points integer DEFAULT 0, p_customer_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_apply_birthday boolean DEFAULT false, p_acting_cashier uuid DEFAULT NULL::uuid, p_client_ref uuid DEFAULT NULL::uuid, p_discount_usd_cents integer DEFAULT 0)
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
  v_base integer;
  v_needs_manager boolean;
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

  if p_discount_basis_points < 0 or p_discount_basis_points > 10000
     or coalesce(p_discount_usd_cents, 0) < 0 then
    raise exception 'invalid discount';
  end if;
  -- the invoice discount is a percentage or an amount, not both
  if p_discount_basis_points > 0 and coalesce(p_discount_usd_cents, 0) > 0 then
    raise exception 'one invoice discount only';
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
    case when coalesce(p_discount_usd_cents, 0) > 0 then 'fixed' when v_discount_bp > 0 then 'percent_bp' end,
    case when coalesce(p_discount_usd_cents, 0) > 0 then p_discount_usd_cents else v_discount_bp end)
  into v_priced;
  update _lines l set outfit_discount = (x->>'outfit_discount')::integer
  from jsonb_array_elements(v_priced->'lines') x
  where x->>'key' = l.key;
  v_outfit := (v_priced->>'outfit_discount')::integer;
  -- the invoice discount comes off what is left after line discounts and looks
  v_base := (v_priced->>'promo_base')::integer - v_line_discounts;
  if coalesce(p_discount_usd_cents, 0) > greatest(v_base, 0) then
    raise exception 'discount above total';
  end if;
  v_invoice := greatest(
    coalesce(p_discount_usd_cents, 0),
    round((v_base::numeric * v_discount_bp) / 10000)::integer
  );

  -- Invoice discount: a cashier goes up to 10% (a percentage, or an amount
  -- worth up to 10% of the invoice). More needs a manager, either
  -- signed in on the till or switched in on this device with their PIN.
  v_actor_role := v_role;
  if p_acting_cashier is not null then
    select role into v_actor_role from public.profiles where id = p_acting_cashier;
  end if;
  v_needs_manager := p_discount_basis_points > 1000
    or coalesce(p_discount_usd_cents, 0)::numeric * 10 > greatest(v_base, 0);
  if v_needs_manager then
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

revoke all on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean, uuid, uuid, integer) from public;
grant execute on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean, uuid, uuid, integer) to authenticated;
