-- Pickup orders taken for a customer leave the shelf at once (founder 2026-10-16).
-- An order the team takes for a customer who will collect it at the shop (POS →
-- «طلب زبون», pickup) is set aside straight away, like a till sale: it is created
-- already 'packed' — the step where an online order's reservation becomes a sale
-- and the stock leaves the shelf — so the pieces can't be sold to anyone else.
-- The team then presses «جاهز للاستلام» to tell the customer, and «انستلم» takes
-- the money as for any pickup.
-- A pickup the customer never comes for can now be cancelled after packing
-- (website pickups too): the pieces go back on the shelf.

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
  )
  -- a pickup the customer never came for can still be called off once its
  -- pieces are off the shelf (packed / ready): they go back on the shelf
  or (v_order.fulfilment = 'pickup' and v_order.status in ('packed', 'shipped') and p_next = 'cancelled');
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
  elsif p_next = 'cancelled' and v_order.status in ('packed', 'shipped') then
    -- already taken off the shelf at 'packed': put the pieces back
    insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
    select oi.variant_id, v_order.branch_id, oi.quantity, 'return', p_order_id, auth.uid()
    from public.order_items oi where oi.order_id = p_order_id;
    perform public._release_order_money(p_order_id);
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

create or replace function public.staff_customer_order(
  p_items jsonb,
  p_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_source text,
  p_note text default null,
  p_email text default null,
  p_promocode text default null,
  p_fulfilment text default 'delivery'
)
returns table (order_id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_staff uuid := auth.uid();
  v_claims text := current_setting('request.jwt.claims', true);
  v_sub text := current_setting('request.jwt.claim.sub', true);
  v_order record;
  v_branch uuid;
begin
  if v_role is null or v_role not in ('super_admin', 'store_manager', 'cashier', 'support_agent') then
    raise exception 'not allowed';
  end if;
  if p_source is null or p_source not in ('instagram', 'whatsapp', 'phone', 'other') then
    raise exception 'invalid source';
  end if;

  -- The order belongs to the customer, never to the staff member taking it:
  -- run the website checkout as a guest (auth.uid() is null inside), so it finds
  -- or creates the customer by phone exactly as it does for a guest order.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select * into v_order
  from public.storefront_checkout(
    p_items => p_items,
    p_name => p_name,
    p_phone => p_phone,
    p_city => p_city,
    p_address => p_address,
    p_note => p_note,
    p_email => p_email,
    p_promocode => p_promocode,
    p_payment_method => 'cod',
    p_use_wallet => false,
    p_fulfilment => p_fulfilment
  );
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);

  update public.orders
  set source = p_source, taken_by = v_staff
  where id = v_order.order_id
  returning branch_id into v_branch;

  -- a pickup is set aside now, like a till sale: the reservation becomes a sale
  -- and the pieces leave the shelf (what 'packed' does for any online order)
  if lower(coalesce(p_fulfilment, 'delivery')) = 'pickup' then
    update public.inventory_levels il
    set reserved = il.reserved - oi.quantity, updated_at = now()
    from public.order_items oi
    where oi.order_id = v_order.order_id
      and il.variant_id = oi.variant_id and il.branch_id = v_branch;
    insert into public.inventory_movements (variant_id, branch_id, delta, reason, reference_id, created_by)
    select oi.variant_id, v_branch, -oi.quantity, 'sale', v_order.order_id, v_staff
    from public.order_items oi where oi.order_id = v_order.order_id;
    update public.orders set status = 'packed', updated_at = now() where id = v_order.order_id;
  end if;

  return query select v_order.order_id, v_order.order_number;
end $$;
