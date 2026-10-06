-- Founder decisions 2026-10-06.
-- 1. Returns policy: return within 3 days, exchange within 7 days, counted from
--    when the customer RECEIVED the order (online: delivered/collected — the
--    courier can be late; in store: the sale). A $5 delivery fee is kept on
--    returns/exchanges of online delivery orders (a manager can waive it, e.g.
--    the piece came back to the shop). All three numbers live in site_content
--    'returns' (MGMT-editable). Cashiers can't go past a window; managers can.
-- 2. Courier cash (COD): a delivered COD order is money WITH THE COURIER, not
--    in the shop, until the courier pays it over (up to a week later).
--    courier_settlements records each payment received, the orders it covers,
--    where the money went and who recorded it; orders carry cod_settled_at.
-- 3. staff_audit_log: who created / changed / reset / switched off staff
--    accounts (written by the staff-admin edge function).
-- 4. colours: one list of colours (code, English + Arabic name, swatch, family
--    for shades) that products pick from, so the same colour can't be typed
--    twice with two codes. Seeded from the catalogue; existing variant codes
--    (printed on labels inside SKUs) stay as they are — only spellings unify.

-- 1 ── returns policy ────────────────────────────────────────────────────────
insert into public.site_content (key, value)
values ('returns', '{"return_days": 3, "exchange_days": 7, "fee_usd_cents": 500}')
on conflict (key) do nothing;

create or replace function public.returns_policy()
returns table (return_days integer, exchange_days integer, fee_usd_cents integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    least(greatest(coalesce((v->>'return_days')::integer, 3), 0), 365),
    least(greatest(coalesce((v->>'exchange_days')::integer, 7), 0), 365),
    least(greatest(coalesce((v->>'fee_usd_cents')::integer, 500), 0), 100000)
  from (select coalesce((select value from public.site_content where key = 'returns'), '{}'::jsonb) as v) s;
$$;
grant execute on function public.returns_policy() to anon, authenticated;

alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.order_returns add column if not exists fee_usd_cents integer not null default 0 check (fee_usd_cents >= 0);

-- Stamp when an order reaches the customer (online: delivered / collected).
create or replace function public.orders_stamp_delivered()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists orders_stamp_delivered on public.orders;
create trigger orders_stamp_delivered
  before update of status on public.orders
  for each row execute function public.orders_stamp_delivered();

-- Orders already delivered before this: their last update is the best guess.
update public.orders
set delivered_at = updated_at
where channel = 'online' and delivered_at is null
  and status in ('delivered', 'completed', 'returned', 'exchanged');

-- When the customer had the order, and until when it can be returned/exchanged.
create or replace function public._return_windows(p_order_id uuid)
returns table (received_at timestamptz, return_until timestamptz, exchange_until timestamptz, fee_usd_cents integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o record;
  p record;
begin
  select channel, fulfilment, created_at, delivered_at into o from public.orders where id = p_order_id;
  select * into p from public.returns_policy();
  received_at := case when o.channel = 'online' then o.delivered_at else o.created_at end;
  -- not received yet: nothing is open
  return_until := received_at + make_interval(days => p.return_days);
  exchange_until := received_at + make_interval(days => p.exchange_days);
  -- the courier fee applies to online orders that travelled by delivery
  fee_usd_cents := case when o.channel = 'online' and coalesce(o.fulfilment, 'delivery') = 'delivery' then p.fee_usd_cents else 0 end;
  return next;
end;
$$;
revoke all on function public._return_windows(uuid) from public, anon, authenticated;

-- POS check before a return/exchange: the window (managers may go past it) and
-- the fee to keep (managers may waive it). Returns the fee in cents.
create or replace function public._return_policy_check(p_order_id uuid, p_kind text, p_waive_fee boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_role public.app_role := public.current_app_role();
  v_manager boolean := v_role in ('super_admin', 'store_manager');
begin
  select * into w from public._return_windows(p_order_id);
  if w.received_at is not null
     and now() > (case p_kind when 'return' then w.return_until else w.exchange_until end)
     and not v_manager then
    raise exception '% window passed — a manager can approve it', p_kind;
  end if;
  if p_waive_fee and w.fee_usd_cents > 0 and not v_manager then
    raise exception 'only a manager can waive the delivery fee';
  end if;
  return case when p_waive_fee then 0 else w.fee_usd_cents end;
end;
$$;
revoke all on function public._return_policy_check(uuid, text, boolean) from public, anon, authenticated;

drop function if exists public.lookup_order_for_return(bigint, text);
CREATE OR REPLACE FUNCTION public.lookup_order_for_return(p_number bigint, p_phone text)
 RETURNS TABLE(order_number bigint, order_status text, ordered_at timestamp with time zone, eligible boolean, ineligible_reason text, items jsonb, requests jsonb, received_at timestamp with time zone, return_until timestamp with time zone, exchange_until timestamp with time zone, fee_usd_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_reason text;
  v_w record;
begin
  perform public._rate_limit('order_lookup:number', p_number::text, 10, interval '1 hour');
  perform public._rate_limit('lookup:phone', right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8), 20, interval '1 hour');
  select o.* into v_order
  from public.orders o
  where o.number = p_number and public._phone_matches(o.ship_phone, p_phone);
  if v_order.id is null then
    return; -- empty result: not found / phone mismatch (indistinguishable on purpose)
  end if;

  select * into v_w from public._return_windows(v_order.id);
  v_reason := case
    when v_order.channel <> 'online' then 'pos_order'
    when v_order.status not in ('delivered', 'completed') then 'not_delivered'
    when now() > greatest(v_w.return_until, v_w.exchange_until) then 'window_passed'
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
    ), '[]'::jsonb),
    v_w.received_at,
    v_w.return_until,
    v_w.exchange_until,
    v_w.fee_usd_cents;
end;
$function$;

grant execute on function public.lookup_order_for_return(bigint, text) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_return_request(p_number bigint, p_phone text, p_kind text, p_reason text, p_items jsonb, p_exchange_note text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_ordered integer;
  v_id uuid;
  v_summary text := '';
  v_email text;
  v_w record;
begin
  if p_kind not in ('return', 'exchange') then
    raise exception 'invalid kind';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'no items selected';
  end if;

  select o.* into v_order
  from public.orders o
  where o.number = p_number and public._phone_matches(o.ship_phone, p_phone);
  if v_order.id is null then
    raise exception 'order not found';
  end if;
  if v_order.channel <> 'online' then
    raise exception 'pos orders are handled in store';
  end if;
  if v_order.status not in ('delivered', 'completed') then
    raise exception 'order not delivered yet';
  end if;
  -- returns and exchanges have their own windows, counted from delivery
  select * into v_w from public._return_windows(v_order.id);
  if now() > (case p_kind when 'return' then v_w.return_until else v_w.exchange_until end) then
    raise exception 'return window passed';
  end if;
  if exists (
    select 1 from public.return_requests r
    where r.order_id = v_order.id and r.status in ('requested', 'approved')
  ) then
    raise exception 'open request exists';
  end if;

  -- Validate each item belongs to the order and quantity is sane.
  for v_item in select * from jsonb_array_elements(p_items) loop
    select oi.quantity into v_ordered
    from public.order_items oi
    where oi.id = (v_item->>'order_item_id')::uuid and oi.order_id = v_order.id;
    if v_ordered is null then
      raise exception 'item not on this order';
    end if;
    if coalesce((v_item->>'quantity')::integer, 0) < 1
       or (v_item->>'quantity')::integer > v_ordered then
      raise exception 'invalid quantity';
    end if;
    select coalesce(v_summary || oi.name_en || ' ' || oi.size || ' ×' || (v_item->>'quantity') || '، ', v_summary)
      into v_summary
    from public.order_items oi where oi.id = (v_item->>'order_item_id')::uuid;
  end loop;

  insert into public.return_requests (order_id, kind, items, reason, phone, exchange_note)
  values (
    v_order.id,
    p_kind,
    (select jsonb_agg(jsonb_build_object(
       'order_item_id', e->>'order_item_id',
       'quantity', (e->>'quantity')::integer))
     from jsonb_array_elements(p_items) e),
    trim(p_reason),
    p_phone,
    nullif(trim(coalesce(p_exchange_note, '')), '')
  )
  returning id into v_id;

  -- Tell the shop; confirm to the customer by email when we know one.
  perform public._enqueue_notification(
    'return_requested', 'whatsapp', 'shop', 'ar',
    jsonb_build_object(
      'order_number', v_order.number,
      'kind', p_kind,
      'items_summary', rtrim(v_summary, '، '),
      'reason', trim(p_reason),
      'customer_name', coalesce(v_order.ship_name, '')
    )
  );
  select c.email into v_email
  from public.customers c where c.id = v_order.customer_id and c.email is not null;
  if v_email is not null then
    perform public._enqueue_notification(
      'return_requested', 'email', v_email, 'en',
      jsonb_build_object(
        'order_number', v_order.number,
        'kind', p_kind,
        'customer_name', coalesce(v_order.ship_name, ''),
        'care_phone', '+961 71 566 296'
      )
    );
  end if;

  return query select v_id;
end;
$function$;

drop function if exists public.pos_return(uuid, jsonb, jsonb, text, boolean);
CREATE OR REPLACE FUNCTION public.pos_return(p_order_id uuid, p_items jsonb, p_refunds jsonb, p_note text DEFAULT NULL::text, p_to_wallet boolean DEFAULT false, p_waive_fee boolean DEFAULT false)
 RETURNS TABLE(return_id uuid, credit_usd_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_rate numeric(14, 2);
  v_credit integer := 0;
  v_refunded integer := 0;
  v_return_id uuid;
  v_branch uuid;
  v_pay record;
  v_total_sold integer;
  v_total_returned integer;
  v_customer uuid;
  v_number bigint;
  v_fee integer;
begin
  select lbp_per_usd into v_rate from public.exchange_rates order by effective_at desc limit 1;
  if v_rate is null then raise exception 'no exchange rate configured'; end if;

  create temp table _ret on commit drop as
  select * from public._validate_return(p_order_id, p_items);

  select sum(credit) into v_credit from _ret;
  select o_branch into v_branch from _ret limit 1;
  -- policy: the return window, and the delivery fee kept on online deliveries
  v_fee := public._return_policy_check(p_order_id, 'return', p_waive_fee);
  v_credit := greatest(v_credit - v_fee, 0);

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
  -- Wallet refund: the whole credit goes to the customer's wallet, no cash leaves the drawer.
  if p_to_wallet then
    select customer_id, number into v_customer, v_number from public.orders where id = p_order_id;
    if v_customer is null then raise exception 'wallet refund needs a customer on the order'; end if;
    if v_refunded <> 0 then raise exception 'wallet refund takes no cash refund lines'; end if;
  elsif abs(v_refunded - v_credit) > 5 then
    raise exception 'refund % does not match credit %', v_refunded, v_credit;
  end if;

  insert into public.order_returns (order_id, kind, branch_id, cashier_id, lbp_per_usd, credit_usd_cents, fee_usd_cents, note)
  values (p_order_id, 'return', v_branch, auth.uid(), v_rate, v_credit, v_fee, p_note)
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

  if p_to_wallet and v_credit > 0 then
    perform public.credit_wallet(v_customer, v_credit, 'return_credit', 'مرتجع فاتورة #' || v_number, v_return_id);
  end if;

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
$function$;

drop function if exists public.pos_exchange(uuid, jsonb, jsonb, jsonb, jsonb, text, boolean);
CREATE OR REPLACE FUNCTION public.pos_exchange(p_order_id uuid, p_return_items jsonb, p_new_items jsonb, p_payments jsonb DEFAULT '[]'::jsonb, p_refunds jsonb DEFAULT '[]'::jsonb, p_note text DEFAULT NULL::text, p_to_wallet boolean DEFAULT false, p_waive_fee boolean DEFAULT false)
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
  v_fee integer;
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
  -- policy: the exchange window, and the delivery fee kept on online deliveries
  v_fee := public._return_policy_check(p_order_id, 'exchange', p_waive_fee);
  v_credit := greatest(v_credit - v_fee, 0);

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
  insert into public.order_returns (order_id, exchange_order_id, kind, branch_id, cashier_id, lbp_per_usd, credit_usd_cents, fee_usd_cents, note)
  values (p_order_id, v_new_order, 'exchange', v_branch, auth.uid(), v_rate, v_credit, v_fee, p_note)
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

revoke all on function public.pos_return(uuid, jsonb, jsonb, text, boolean, boolean) from public, anon;
revoke all on function public.pos_exchange(uuid, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) from public, anon;
grant execute on function public.pos_return(uuid, jsonb, jsonb, text, boolean, boolean) to authenticated;
grant execute on function public.pos_exchange(uuid, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) to authenticated;

-- 2 ── courier cash (COD settlements) ────────────────────────────────────────
create table if not exists public.courier_settlements (
  id uuid primary key default gen_random_uuid(),
  received_on date not null default ((now() at time zone 'Asia/Beirut')::date),
  usd_cents integer not null default 0 check (usd_cents >= 0),
  lbp bigint not null default 0 check (lbp >= 0),
  -- what the orders were worth, to show a short or over payment
  expected_usd_cents integer not null default 0,
  destination text not null default 'drawer' check (destination in ('drawer', 'safe', 'bank', 'other')),
  branch_id uuid references public.branches (id),
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
alter table public.courier_settlements enable row level security;
create policy "managers read courier settlements" on public.courier_settlements
  for select to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'support_agent', 'cashier'));
revoke all on public.courier_settlements from anon, authenticated;
grant select on public.courier_settlements to authenticated;

alter table public.orders
  add column if not exists cod_settled_at timestamptz,
  add column if not exists cod_settlement_id uuid references public.courier_settlements (id);
create index if not exists orders_cod_open_idx on public.orders (delivered_at)
  where channel = 'online' and payment_method = 'cod' and cod_settled_at is null;

-- Record money received from the courier for a set of delivered COD orders.
create or replace function public.record_courier_settlement(
  p_order_ids uuid[], p_usd_cents integer, p_lbp bigint, p_destination text, p_branch_id uuid default null, p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_expected integer;
  v_n integer;
begin
  if public.current_app_role() not in ('super_admin', 'store_manager') then raise exception 'not allowed'; end if;
  if coalesce(array_length(p_order_ids, 1), 0) = 0 then raise exception 'no orders'; end if;
  if coalesce(p_usd_cents, 0) < 0 or coalesce(p_lbp, 0) < 0 then raise exception 'invalid amount'; end if;
  if coalesce(p_usd_cents, 0) = 0 and coalesce(p_lbp, 0) = 0 then raise exception 'amount required'; end if;
  if p_destination not in ('drawer', 'safe', 'bank', 'other') then raise exception 'invalid destination'; end if;

  perform 1 from public.orders where id = any(p_order_ids) for update;
  -- only delivered cash-on-delivery orders still with the courier
  select count(*), coalesce(sum(total_usd_cents), 0) into v_n, v_expected
  from public.orders
  where id = any(p_order_ids) and channel = 'online' and payment_method = 'cod'
    and coalesce(fulfilment, 'delivery') = 'delivery'
    and status in ('delivered', 'completed', 'returned', 'exchanged')
    and cod_settled_at is null;
  if v_n <> array_length(p_order_ids, 1) then
    raise exception 'some orders are not waiting for courier cash';
  end if;

  insert into public.courier_settlements (usd_cents, lbp, expected_usd_cents, destination, branch_id, note, created_by)
  values (coalesce(p_usd_cents, 0), coalesce(p_lbp, 0), v_expected, p_destination,
          coalesce(p_branch_id, (select id from public.branches order by created_at limit 1)),
          nullif(trim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;

  update public.orders set cod_settled_at = now(), cod_settlement_id = v_id, updated_at = now()
  where id = any(p_order_ids);
  return v_id;
end;
$$;
revoke all on function public.record_courier_settlement(uuid[], integer, bigint, text, uuid, text) from public, anon;
grant execute on function public.record_courier_settlement(uuid[], integer, bigint, text, uuid, text) to authenticated;

-- 3 ── staff audit log ───────────────────────────────────────────────────────
create table if not exists public.staff_audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.staff_audit_log enable row level security;
create policy "super admin reads staff audit" on public.staff_audit_log
  for select to authenticated using (public.current_app_role() = 'super_admin');
revoke all on public.staff_audit_log from anon, authenticated;
grant select on public.staff_audit_log to authenticated;

-- 4 ── colours ───────────────────────────────────────────────────────────────
create table if not exists public.colours (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name_en text not null,
  name_ar text not null,
  -- swatch; two-tone colours ("Beige/Blue") carry the second half too
  hex text check (hex ~ '^#[0-9a-fA-F]{6}$'),
  hex2 text check (hex2 ~ '^#[0-9a-fA-F]{6}$'),
  -- the base colour a shade belongs to (Light Grey → Grey), for grouping
  family text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists colours_name_en_key on public.colours (lower(name_en));
alter table public.colours enable row level security;
create policy "anyone reads colours" on public.colours for select to anon, authenticated using (true);
create policy "catalogue staff manage colours" on public.colours for all to authenticated
  using (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager', 'inventory_manager'))
  with check (public.current_app_role() in ('super_admin', 'store_manager', 'marketing_manager', 'inventory_manager'));
revoke all on public.colours from anon, authenticated;
grant select on public.colours to anon, authenticated;
grant insert, update on public.colours to authenticated;

insert into public.colours (code, name_en, name_ar, hex, hex2, family) values
  ('BEI', 'Beige', 'بيج', '#d8c9a9', null, 'Beige'),
  ('BBL', 'Beige/Blue', 'بيج, أزرق', '#d8c9a9', '#3b5b8c', 'Beige'),
  ('BEB', 'Beige/White', 'بيج, أبيض', '#d8c9a9', '#f7f7f5', 'Beige'),
  ('BLA', 'Black', 'أسود', '#141414', null, 'Black'),
  ('BBR', 'Black/Brown', 'أسود, بني', '#141414', '#6b4a32', 'Black'),
  ('BGR', 'Black/Green', 'أسود, أخضر', '#141414', '#3f5c47', 'Black'),
  ('BWH', 'Black/White', 'أسود, أبيض', '#141414', '#f7f7f5', 'Black'),
  ('BYE', 'Black/Yellow', 'أسود, أصفر', '#141414', '#d9b64a', 'Black'),
  ('BLU', 'Blue', 'أزرق', '#3b5b8c', null, 'Blue'),
  ('BLB', 'Blue/Yellow', 'أزرق, أصفر', '#3b5b8c', '#d9b64a', 'Blue'),
  ('BRI', 'Brick', 'بريك', '#9a4a35', null, 'Red'),
  ('BRO', 'Brown', 'بني', '#6b4a32', null, 'Brown'),
  ('BBE', 'Brown/Beige', 'بني, بيج', '#6b4a32', '#d8c9a9', 'Brown'),
  ('BCA', 'Brown/Camel', 'بني, كاميل', '#6b4a32', '#b5885a', 'Brown'),
  ('BUR', 'Burgundy', 'خمري', '#5d2230', null, 'Red'),
  ('CAM', 'Camel', 'كاميل', '#b5885a', null, 'Brown'),
  ('CGR', 'Camel/Green', 'كاميل, أخضر', '#b5885a', '#3f5c47', 'Brown'),
  ('DBE', 'Dark Beige', 'بيج غامق', '#b9a582', null, 'Beige'),
  ('DBL', 'Dark Blue', 'أزرق غامق', '#1e3150', null, 'Blue'),
  ('DAR', 'Dark Green', 'أخضر غامق', '#2c3f30', null, 'Green'),
  ('DGR', 'Dark Grey', 'رمادي غامق', '#4a4a4a', null, 'Grey'),
  ('DGC', 'Dark Grey/Camel', 'رمادي غامق, كاميل', '#4a4a4a', '#b5885a', 'Grey'),
  ('GRA', 'Green', 'أخضر', '#3f5c47', null, 'Green'),
  ('GWH', 'Green/White', 'أخضر, أبيض', '#3f5c47', '#f7f7f5', 'Green'),
  ('GRE', 'Grey', 'رمادي', '#8c8c8c', null, 'Grey'),
  ('GRB', 'Grey/Blue', 'رمادي, أزرق', '#8c8c8c', '#3b5b8c', 'Grey'),
  ('LBL', 'Light Blue', 'أزرق فاتح', '#a9c1dc', null, 'Blue'),
  ('LGR', 'Light Grey', 'رمادي فاتح', '#c4c4c1', null, 'Grey'),
  ('LGB', 'Light Grey/Black', 'رمادي فاتح, أسود', '#c4c4c1', '#141414', 'Grey'),
  ('LIG', 'Light Grey/Blue', 'رمادي فاتح, أزرق', '#c4c4c1', '#3b5b8c', 'Grey'),
  ('LGM', 'Light Grey/Mint', 'رمادي فاتح, مينت', '#c4c4c1', '#a8d5c2', 'Grey'),
  ('MAU', 'Mauve', 'موف', '#a88a96', null, 'Pink'),
  ('MIN', 'Mint', 'مينت', '#a8d5c2', null, 'Green'),
  ('NAV', 'Navy', 'كحلي', '#1f2a44', null, 'Blue'),
  ('NYE', 'Navy/Yellow', 'كحلي, أصفر', '#1f2a44', '#d9b64a', 'Blue'),
  ('OWH', 'Off-White', 'أوف وايت', '#efece4', null, 'White'),
  ('OWB', 'Off-White/Black', 'أوف وايت, أسود', '#efece4', '#141414', 'White'),
  ('OFF', 'Off-White/Brown', 'أوف وايت, بني', '#efece4', '#6b4a32', 'White'),
  ('OWG', 'Off-White/Green', 'أوف وايت, أخضر', '#efece4', '#3f5c47', 'White'),
  ('OWL', 'Off-White/Light Grey', 'أوف وايت, رمادي فاتح', '#efece4', '#c4c4c1', 'White'),
  ('OWM', 'Off-White/Mint', 'أوف وايت, مينت', '#efece4', '#a8d5c2', 'White'),
  ('OWP', 'Off-White/Pink', 'أوف وايت, وردي', '#efece4', '#d6a5b1', 'White'),
  ('OLI', 'Olive', 'زيتي', '#6b6b45', null, 'Green'),
  ('ORE', 'Olive/Red', 'زيتي, أحمر', '#6b6b45', '#a33131', 'Green'),
  ('OLG', 'Orange/Light Grey', 'برتقالي, رمادي فاتح', '#c97b3d', '#c4c4c1', 'Orange'),
  ('PIN', 'Pink', 'وردي', '#d6a5b1', null, 'Pink'),
  ('RED', 'Red', 'أحمر', '#a33131', null, 'Red'),
  ('WHI', 'White', 'أبيض', '#f7f7f5', null, 'White'),
  ('WBL', 'White/Blue', 'أبيض, أزرق', '#f7f7f5', '#3b5b8c', 'White'),
  ('WBR', 'White/Brown', 'أبيض, بني', '#f7f7f5', '#6b4a32', 'White'),
  ('WDG', 'White/Dark Grey', 'أبيض, رمادي غامق', '#f7f7f5', '#4a4a4a', 'White'),
  ('WNA', 'White/Navy', 'أبيض, كحلي', '#f7f7f5', '#1f2a44', 'White'),
  ('WRE', 'White/Red', 'أبيض, أحمر', '#f7f7f5', '#a33131', 'White'),
  ('YEL', 'Yellow', 'أصفر', '#d9b64a', null, 'Yellow'),
  ('YDG', 'Yellow/Dark Grey', 'أصفر, رمادي غامق', '#d9b64a', '#4a4a4a', 'Yellow')
on conflict (code) do nothing;

-- One spelling per colour on the pieces (case and Arabic hamza variants).
update public.product_variants v
set color_en = c.name_en, color_ar = c.name_ar
from public.colours c
where lower(v.color_en) = lower(c.name_en)
  and (v.color_en is distinct from c.name_en or v.color_ar is distinct from c.name_ar);
update public.media_assets m
set color_en = c.name_en
from public.colours c
where lower(m.color_en) = lower(c.name_en) and m.color_en is distinct from c.name_en;
