-- «الزبون ما استلم» — the customer didn't receive the order (founder 2026-10-25).
-- A delivery the courier brings back (status 'shipped'), or a pickup nobody came
-- for (packed / ready), is a RETURN of the whole order, recorded like any other:
--   * the pieces go back on the shelf (they left it at 'packed');
--   * an order_returns row (kind 'not_received') credits the whole invoice, so
--     every report that nets returns (dashboard, reports, invoices) shows the
--     sale as zero; loyalty reversal and return-request triggers run as usual;
--   * nothing was collected, so there is no refund payment (the drawer and EOD
--     are untouched); a wallet-paid order gets its wallet money back and the
--     promo / birthday code is released, as on a cancel;
--   * the order becomes 'returned' (it never reached 'delivered', so it earned no
--     points and the courier never held its cash).
-- This replaces the cancel-after-packing for pickups added in 20261016120000:
-- one path, and the order shows as returned instead of cancelled.

alter table public.order_returns drop constraint order_returns_kind_check;
alter table public.order_returns
  add constraint order_returns_kind_check check (kind in ('return', 'exchange', 'not_received'));

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

create or replace function public.mark_not_received(p_order_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_order record;
  v_lines integer;
  v_goods integer;
  v_return uuid;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier', 'support_agent') then
    raise exception 'not allowed';
  end if;
  select * into v_order from public.orders where id = p_order_id and channel = 'online' for update;
  if v_order is null then raise exception 'online order not found'; end if;
  -- out with the courier, or a pickup set aside / ready: the pieces are off the shelf
  if not (v_order.status = 'shipped' or (v_order.fulfilment = 'pickup' and v_order.status = 'packed')) then
    raise exception 'order % is %, not out for delivery or waiting for pickup', v_order.number, v_order.status;
  end if;

  -- back on the shelf
  insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
  select oi.variant_id, v_order.branch_id, oi.quantity, 'return', p_order_id, auth.uid()
  from public.order_items oi where oi.order_id = p_order_id and oi.variant_id is not null;

  -- the whole invoice comes back: pieces at what they cost, the delivery fee too
  select coalesce(sum(line_total_usd_cents), 0) into v_lines from public.order_items where order_id = p_order_id;
  v_goods := greatest(v_order.total_usd_cents - coalesce(v_order.delivery_usd_cents, 0), 0);
  if v_order.total_usd_cents > 0 then
    insert into public.order_returns (order_id, kind, branch_id, cashier_id, lbp_per_usd, credit_usd_cents, note)
    values (
      p_order_id, 'not_received', v_order.branch_id, auth.uid(), v_order.lbp_per_usd, v_order.total_usd_cents,
      coalesce(nullif(trim(coalesce(p_note, '')), ''),
               case when v_order.fulfilment = 'pickup' then 'Customer did not collect' else 'Customer did not receive' end)
    )
    returning id into v_return;
    insert into public.order_return_items (return_id, order_item_id, variant_id, quantity, credit_usd_cents)
    select v_return, oi.id, oi.variant_id, oi.quantity,
           case when v_lines > 0 then round(oi.line_total_usd_cents::numeric * v_goods / v_lines)::integer else 0 end
    from public.order_items oi where oi.order_id = p_order_id and oi.variant_id is not null;
  end if;

  -- nothing was collected: a wallet payment goes back, the promo use is released
  perform public._release_order_money(p_order_id);

  update public.orders set status = 'returned', updated_at = now() where id = p_order_id;
end $$;

revoke all on function public.mark_not_received(uuid, text) from public;
grant execute on function public.mark_not_received(uuid, text) to authenticated;
