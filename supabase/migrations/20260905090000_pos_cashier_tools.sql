-- POS cashier tools (Deep-Research gate, cashier cluster):
--  1. per-line discounts in pos_checkout (p_items[].line_discount_bp)
--  2. PIN-based cashier switching on a shared device (attribution)
--  3. parked sales (park a cart, resume on any device of the branch)

-- ---------- 2. PIN switching ----------

alter table public.profiles add column if not exists pos_pin_hash text;

-- Staff set their own PIN; the super admin can set anyone's.
create or replace function public.set_pos_pin(p_pin text, p_profile_id uuid default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_target uuid := coalesce(p_profile_id, auth.uid());
begin
  if public.current_app_role() is null then
    raise exception 'not allowed';
  end if;
  if v_target <> auth.uid() and public.current_app_role() <> 'super_admin' then
    raise exception 'only the super admin can set another cashier''s PIN';
  end if;
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4-6 digits';
  end if;
  update public.profiles
  set pos_pin_hash = crypt(p_pin, gen_salt('bf', 8)), updated_at = now()
  where id = v_target;
end;
$$;

-- Who can ring sales on this device. has_pin lets the UI grey out unset accounts.
create or replace function public.pos_cashiers()
returns table (profile_id uuid, full_name text, role public.app_role, has_pin boolean)
language sql security definer set search_path = public stable as $$
  select p.id, p.full_name, p.role, p.pos_pin_hash is not null
  from public.profiles p
  where p.role in ('super_admin', 'store_manager', 'cashier')
    and public.current_app_role() is not null
  order by p.role, p.full_name;
$$;

create or replace function public.verify_pos_pin(p_profile_id uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
begin
  if public.current_app_role() is null then
    raise exception 'not allowed';
  end if;
  select pos_pin_hash into v_hash from public.profiles where id = p_profile_id;
  if v_hash is null then return false; end if;
  return v_hash = crypt(p_pin, v_hash);
end;
$$;

revoke all on function public.set_pos_pin(text, uuid) from public;
revoke all on function public.pos_cashiers() from public;
revoke all on function public.verify_pos_pin(uuid, text) from public;
grant execute on function public.set_pos_pin(text, uuid) to authenticated;
grant execute on function public.pos_cashiers() to authenticated;
grant execute on function public.verify_pos_pin(uuid, text) to authenticated;

-- ---------- 3. Parked sales ----------

create table public.parked_sales (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  label text not null,
  -- Cashier cart snapshot: [{variant_id, quantity, line_discount_bp}]
  cart jsonb not null,
  customer_id uuid references public.customers (id),
  parked_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index parked_sales_branch_idx on public.parked_sales (branch_id, created_at desc);

alter table public.parked_sales enable row level security;

create policy "parked_sales_staff_all" on public.parked_sales
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------- 1 + attribution: pos_checkout ----------

drop function if exists public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean);

create or replace function public.pos_checkout(
  p_branch_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount_basis_points integer default 0,
  p_customer_id uuid default null,
  p_note text default null,
  p_apply_birthday boolean default false,
  p_acting_cashier uuid default null
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

  -- Attribution: a PIN-switched cashier on a shared device.
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
  -- Line discounts are a manager/admin lever; plain cashiers use the order-level control only.
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

  -- Order-level discount applies to what remains after line discounts.
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
    'pos', 'completed', p_branch_id, p_customer_id, v_cashier, v_rate,
    v_subtotal, v_discount, v_tva_cents,
    case when coalesce(v_tva.enabled, false) then v_tva.rate_basis_points else 0 end,
    coalesce(v_tva.prices_include_tva, true), v_total, p_note, 'cash'
  ) returning id, number into v_order_id, v_order_number;

  -- Line totals carry their own discount; unit price stays the list price.
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

revoke all on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean, uuid) from public;
grant execute on function public.pos_checkout(uuid, jsonb, jsonb, integer, uuid, text, boolean, uuid) to authenticated;
