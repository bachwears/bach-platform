-- Cash-on-delivery orders never had their payment recorded: the order went
-- "delivered" with no order_payments row, yet a later cash refund recorded
-- money going out — the books drifted. Delivering a COD order now records the
-- cash the courier collected (method 'cod', so it never counts as till cash).
--
-- p_paid_usd_cents / p_paid_lbp: what was collected. Both null = the full
-- order total in USD (the POS queue's one-tap "delivered").

drop function if exists public.advance_online_order(uuid, public.order_status);

create or replace function public.advance_online_order(
  p_order_id uuid,
  p_next public.order_status,
  p_paid_usd_cents integer default null,
  p_paid_lbp bigint default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
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
$$;

revoke all on function public.advance_online_order(uuid, public.order_status, integer, bigint) from public;
grant execute on function public.advance_online_order(uuid, public.order_status, integer, bigint) to authenticated;
