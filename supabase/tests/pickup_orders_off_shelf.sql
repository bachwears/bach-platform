-- Pickup orders taken for a customer leave the shelf at once (20261016120000). Rolled back.
do $$
declare br uuid; v uuid; q0 int; r0 int; q1 int; r1 int; r record; o record; ok boolean;
  staff uuid := '2e815687-492b-44f4-824e-95345681530a';
begin
  -- pickup offered (rolled back with everything else)
  insert into site_content (key, value, updated_at)
  values ('pickup', '{"enabled": true, "address": "Test shop address", "hours": "10-8"}'::jsonb, now())
  on conflict (key) do update set value = excluded.value;
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id into v
  from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status = 'published'
    and not exists (select 1 from outfit_items oi where oi.product_id = p.id)
  limit 1;
  update inventory_levels set quantity = quantity + 10 where variant_id = v and branch_id = br;
  select quantity, reserved into q0, r0 from inventory_levels where variant_id = v and branch_id = br;
  perform set_config('request.jwt.claims', '{"sub":"' || staff || '","role":"authenticated"}', true);

  -- 1. a pickup: packed at once, off the shelf (quantity down, nothing left reserved)
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 2)),
    'Test Customer', '+96170000222', '', '', 'whatsapp', p_fulfilment => 'pickup');
  select * into o from orders where id = r.order_id;
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if o.status <> 'packed' or o.fulfilment <> 'pickup' or q1 <> q0 - 2 or r1 <> r0 then
    raise exception 'TESTFAIL pickup off shelf: status % qty %->% reserved %->%', o.status, q0, q1, r0, r1;
  end if;
  if (select count(*) from inventory_movements where reference_id = r.order_id and reason = 'sale' and delta = -2) <> 1 then
    raise exception 'TESTFAIL sale movement';
  end if;

  -- 2. ready, then the customer never comes: cancel puts the pieces back
  perform advance_online_order(r.order_id, 'shipped');
  perform advance_online_order(r.order_id, 'cancelled');
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if (select status from orders where id = r.order_id) <> 'cancelled' or q1 <> q0 or r1 <> r0 then
    raise exception 'TESTFAIL uncollected cancel: qty %->% reserved %->%', q0, q1, r0, r1;
  end if;

  -- 3. a pickup collected: money recorded, stock stays sold (taken once only)
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Test Customer', '+96170000222', '', '', 'instagram', p_fulfilment => 'pickup');
  perform advance_online_order(r.order_id, 'shipped');
  perform advance_online_order(r.order_id, 'delivered');
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if q1 <> q0 - 1 or r1 <> r0 then raise exception 'TESTFAIL collected stock qty %->% reserved %->%', q0, q1, r0, r1; end if;
  if (select coalesce(sum(usd_equiv_cents), 0) from order_payments where order_id = r.order_id)
     < (select total_usd_cents from orders where id = r.order_id) then
    raise exception 'TESTFAIL pickup payment not recorded';
  end if;

  -- 4. a delivery order is unchanged: pending, reserved, still on the shelf
  select quantity, reserved into q0, r0 from inventory_levels where variant_id = v and branch_id = br;
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Test Customer', '+96170000222', 'Beirut', 'Hamra', 'phone');
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if (select status from orders where id = r.order_id) <> 'pending' or q1 <> q0 or r1 <> r0 + 1 then
    raise exception 'TESTFAIL delivery changed';
  end if;

  -- 5. a delivery order still can't be cancelled once packed
  perform advance_online_order(r.order_id, 'confirmed');
  perform advance_online_order(r.order_id, 'picking');
  perform advance_online_order(r.order_id, 'packed');
  ok := false;
  begin
    perform advance_online_order(r.order_id, 'cancelled');
  exception when others then ok := sqlerrm like '%not allowed%';
  end;
  if not ok then raise exception 'TESTFAIL packed delivery cancelled'; end if;
end $$;
