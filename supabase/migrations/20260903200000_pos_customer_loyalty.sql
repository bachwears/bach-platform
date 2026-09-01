-- POS customer lookup + in-store birthday redemption (§7).
-- pos_checkout gains p_apply_birthday: validated server-side against the
-- same window/once-a-year rules as online, recorded in redemptions.

drop function if exists public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text);

create or replace function public.pos_checkout(
  p_branch_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount_basis_points integer default 0,
  p_customer_id uuid default null,
  p_note text default null,
  p_apply_birthday boolean default false
)
returns table (order_id uuid, order_number bigint)
language plpgsql security definer set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_rate numeric(14, 2);
  v_tva record;
  v_item record;
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal integer := 0;
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
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier') then
    raise exception 'not allowed';
  end if;
  if p_discount_basis_points < 0 or p_discount_basis_points > 10000 then
    raise exception 'invalid discount';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'empty cart';
  end if;

  -- In-store birthday gift: same rules as online, cashier-assisted.
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
    (i->>'quantity')::int as quantity
  from jsonb_array_elements(p_items) i;

  if exists (select 1 from _lines where quantity is null or quantity <= 0) then
    raise exception 'invalid quantity';
  end if;

  for v_item in
    select l.variant_id, l.quantity,
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
  end loop;

  if (select count(*) from _lines) <> (
    select count(*) from _lines l
    join public.product_variants pv on pv.id = l.variant_id and pv.is_active
  ) then
    raise exception 'unknown or inactive variant in cart';
  end if;

  v_discount := round((v_subtotal::numeric * v_discount_bp) / 10000);
  v_total := v_subtotal - v_discount;

  if coalesce(v_tva.enabled, false) then
    if v_tva.prices_include_tva then
      v_tva_cents := v_total - round(v_total::numeric * 10000 / (10000 + v_tva.rate_basis_points));
    else
      v_tva_cents := round(v_total::numeric * v_tva.rate_basis_points / 10000);
      v_total := v_total + v_tva_cents;
    end if;
  end if;

  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) p
  loop
    if v_pay.currency not in ('USD', 'LBP') or v_pay.amount_minor is null or v_pay.amount_minor <= 0 then
      raise exception 'invalid payment line';
    end if;
    v_usd_equiv := case v_pay.currency
      when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer
    end;
    v_paid_usd := v_paid_usd + v_usd_equiv;
  end loop;

  if v_paid_usd < v_total - 5 then
    raise exception 'payment % does not cover total %', v_paid_usd, v_total;
  end if;

  insert into public.orders (
    channel, status, branch_id, customer_id, cashier_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, note, payment_method
  ) values (
    'pos', 'completed', p_branch_id, p_customer_id, auth.uid(), v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, p_note, 'cash'
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
  from jsonb_array_elements(p_payments) p;

  if p_apply_birthday then
    insert into public.promocode_redemptions (promocode_id, customer_id, order_id, redemption_year)
    values (v_promo.id, p_customer_id, v_order_id, extract(year from current_date)::integer);
  end if;

  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select l.variant_id, p_branch_id, -l.quantity, 'sale', v_order_id, auth.uid()
  from _lines l;

  return query select v_order_id, v_order_number;
end;
$$;

revoke all on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean) from public;
grant execute on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean) to authenticated;

-- Cashier-side eligibility check for the birthday hint.
create or replace function public.pos_birthday_eligibility(p_customer_id uuid)
returns table (eligible boolean, percent integer, reason text)
language plpgsql security definer set search_path = public as $$
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
$$;

grant execute on function public.pos_birthday_eligibility(uuid) to authenticated;
