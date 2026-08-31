-- Returns & exchanges: credit computed from what was actually paid,
-- refunds in mixed USD/LBP, exchanges settle only the difference.

alter type public.payment_kind add value if not exists 'credit';

create table public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  exchange_order_id uuid references public.orders (id),
  kind text not null check (kind in ('return', 'exchange')),
  branch_id uuid not null references public.branches (id),
  cashier_id uuid references public.profiles (id),
  lbp_per_usd numeric(14, 2) not null check (lbp_per_usd > 0),
  credit_usd_cents integer not null check (credit_usd_cents > 0),
  note text,
  created_at timestamptz not null default now()
);
create index order_returns_order_idx on public.order_returns (order_id);

create table public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id),
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  credit_usd_cents integer not null check (credit_usd_cents >= 0)
);
create index order_return_items_return_idx on public.order_return_items (return_id);
create index order_return_items_item_idx on public.order_return_items (order_item_id);

-- direction 'out' = money handed to the customer (refund),
-- 'in' = customer paid an exchange difference in cash.
create table public.order_return_payments (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  currency text not null check (currency in ('USD', 'LBP')),
  amount_minor bigint not null check (amount_minor > 0),
  usd_equiv_cents integer not null check (usd_equiv_cents > 0)
);
create index order_return_payments_return_idx on public.order_return_payments (return_id);

alter table public.order_returns enable row level security;
alter table public.order_return_items enable row level security;
alter table public.order_return_payments enable row level security;

create policy "staff read returns" on public.order_returns
  for select to authenticated using (public.is_staff());
create policy "staff read return items" on public.order_return_items
  for select to authenticated using (public.is_staff());
create policy "staff read return payments" on public.order_return_payments
  for select to authenticated using (public.is_staff());
-- Writes happen only through the definer functions below.

-- Credit for one order item: what the customer effectively paid per unit,
-- i.e. the line total scaled by (order total / order subtotal).
create or replace function public._return_credit(
  p_line_total integer, p_line_qty integer, p_qty integer,
  p_order_subtotal integer, p_order_total integer
) returns integer language sql immutable as $$
  select round(
    (p_line_total::numeric * p_qty / p_line_qty)
    * p_order_total / greatest(p_order_subtotal, 1)
  )::integer
$$;

-- Shared validation: loads the order, checks role/status, and returns
-- per-item credit for the requested return quantities.
create or replace function public._validate_return(
  p_order_id uuid, p_items jsonb
) returns table (
  order_item_id uuid, variant_id uuid, quantity integer, credit integer,
  o_branch uuid, o_subtotal integer, o_total integer
) language plpgsql security definer set search_path = public as $$
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
      v_order.subtotal_usd_cents, v_order.total_usd_cents
    );
    o_branch := v_order.branch_id;
    o_subtotal := v_order.subtotal_usd_cents;
    o_total := v_order.total_usd_cents;
    return next;
  end loop;
end;
$$;

-- Cash return: items come back to stock, customer gets refunded.
-- p_items:   [{"order_item_id": uuid, "quantity": int}]
-- p_refunds: [{"currency": "USD"|"LBP", "amount_minor": int}]
create or replace function public.pos_return(
  p_order_id uuid,
  p_items jsonb,
  p_refunds jsonb,
  p_note text default null
)
returns table (return_id uuid, credit_usd_cents integer)
language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric(14, 2);
  v_credit integer := 0;
  v_refunded integer := 0;
  v_return_id uuid;
  v_branch uuid;
  v_pay record;
  v_total_sold integer;
  v_total_returned integer;
begin
  select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then raise exception 'no exchange rate configured'; end if;

  create temp table _ret on commit drop as
  select * from public._validate_return(p_order_id, p_items);

  select sum(credit) into v_credit from _ret;
  select o_branch into v_branch from _ret limit 1;

  for v_pay in
    select p->>'currency' as currency, (p->>'amount_minor')::bigint as amount_minor
    from jsonb_array_elements(coalesce(p_refunds, '[]'::jsonb)) p
  loop
    if v_pay.currency not in ('USD', 'LBP') or coalesce(v_pay.amount_minor, 0) <= 0 then
      raise exception 'invalid refund line';
    end if;
    v_refunded := v_refunded + case v_pay.currency
      when 'USD' then v_pay.amount_minor::integer
      else round((v_pay.amount_minor::numeric / v_rate) * 100)::integer
    end;
  end loop;
  if abs(v_refunded - v_credit) > 5 then
    raise exception 'refund % does not match credit %', v_refunded, v_credit;
  end if;

  insert into public.order_returns (order_id, kind, branch_id, cashier_id, lbp_per_usd, credit_usd_cents, note)
  values (p_order_id, 'return', v_branch, auth.uid(), v_rate, v_credit, p_note)
  returning id into v_return_id;

  insert into public.order_return_items (return_id, order_item_id, variant_id, quantity, credit_usd_cents)
  select v_return_id, order_item_id, variant_id, quantity, credit from _ret;

  insert into public.order_return_payments (return_id, direction, currency, amount_minor, usd_equiv_cents)
  select v_return_id, 'out', p->>'currency', (p->>'amount_minor')::bigint,
    case p->>'currency' when 'USD' then (p->>'amount_minor')::integer
      else round(((p->>'amount_minor')::numeric / v_rate) * 100)::integer end
  from jsonb_array_elements(p_refunds) p;

  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select variant_id, v_branch, quantity, 'return', v_return_id, auth.uid() from _ret;

  -- Fully returned order flips to 'returned'.
  select sum(quantity) into v_total_sold from public.order_items where order_id = p_order_id;
  select coalesce(sum(ri.quantity), 0) into v_total_returned
  from public.order_return_items ri
  join public.order_returns r on r.id = ri.return_id
  where r.order_id = p_order_id;
  if v_total_returned >= v_total_sold then
    update public.orders set status = 'returned', updated_at = now() where id = p_order_id;
  end if;

  return query select v_return_id, v_credit;
end;
$$;

-- Exchange: returned items become credit against a brand-new order.
-- Customer pays the difference in cash, or gets refunded the excess.
-- p_new_items: [{"variant_id": uuid, "quantity": int}]
-- p_payments:  cash IN  [{"currency", "amount_minor"}] when new total > credit
-- p_refunds:   cash OUT [{"currency", "amount_minor"}] when credit > new total
create or replace function public.pos_exchange(
  p_order_id uuid,
  p_return_items jsonb,
  p_new_items jsonb,
  p_payments jsonb default '[]'::jsonb,
  p_refunds jsonb default '[]'::jsonb,
  p_note text default null
)
returns table (return_id uuid, new_order_id uuid, new_order_number bigint, credit_usd_cents integer, new_total_usd_cents integer)
language plpgsql security definer set search_path = public as $$
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
  if v_net < -5 and abs(v_paid_out + v_net) > 5 then
    raise exception 'refund % does not match customer credit %', v_paid_out, -v_net;
  end if;

  -- New order carrying the exchange items.
  insert into public.orders (
    channel, status, branch_id, cashier_id, lbp_per_usd,
    subtotal_usd_cents, discount_usd_cents, tva_usd_cents,
    tva_rate_basis_points, prices_include_tva, total_usd_cents, note
  ) values (
    'pos', 'completed', v_branch, auth.uid(), v_rate,
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

  return query select v_return_id, v_new_order, v_new_number, v_credit, v_new_total;
end;
$$;

revoke all on function public.pos_return(uuid, jsonb, jsonb, text) from public;
revoke all on function public.pos_exchange(uuid, jsonb, jsonb, jsonb, jsonb, text) from public;
grant execute on function public.pos_return(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.pos_exchange(uuid, jsonb, jsonb, jsonb, jsonb, text) to authenticated;
