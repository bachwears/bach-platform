-- «الزبون ما استلم» (20261025090000_not_received_returns). Rolled back.
do $$
declare br uuid; v uuid; q0 int; r0 int; q1 int; r1 int; r record; o record; ret record; ok boolean;
  staff uuid := '2e815687-492b-44f4-824e-95345681530a';
begin
  insert into site_content (key, value, updated_at)
  values ('pickup', '{"enabled": true, "address": "Test shop address", "hours": "10-8"}'::jsonb, now())
  on conflict (key) do update set value = excluded.value;
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id into v
  from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status = 'published' and p.price_usd_cents < 10000
    and not exists (select 1 from outfit_items oi where oi.product_id = p.id)
  limit 1;
  update inventory_levels set quantity = quantity + 10 where variant_id = v and branch_id = br;
  select quantity, reserved into q0, r0 from inventory_levels where variant_id = v and branch_id = br;
  perform set_config('request.jwt.claims', '{"sub":"' || staff || '","role":"authenticated"}', true);

  -- 1. a delivery out with the courier comes back
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 2)),
    'Test Customer', '+96170000333', 'Beirut', 'Hamra', 'whatsapp');
  -- not yet out: refused
  ok := false;
  begin
    perform mark_not_received(r.order_id);
  exception when others then ok := sqlerrm like '%not out for delivery%';
  end;
  if not ok then raise exception 'TESTFAIL pending marked not received'; end if;
  perform advance_online_order(r.order_id, 'confirmed');
  perform advance_online_order(r.order_id, 'picking');
  perform advance_online_order(r.order_id, 'packed');
  perform advance_online_order(r.order_id, 'shipped');
  perform mark_not_received(r.order_id);
  select * into o from orders where id = r.order_id;
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if o.status <> 'returned' or q1 <> q0 or r1 <> r0 or o.delivered_at is not null then
    raise exception 'TESTFAIL delivery back: status % qty %->% reserved %->%', o.status, q0, q1, r0, r1;
  end if;
  select * into ret from order_returns where order_id = r.order_id;
  if ret.kind <> 'not_received' or ret.credit_usd_cents <> o.total_usd_cents then
    raise exception 'TESTFAIL return record % %', ret.kind, ret.credit_usd_cents;
  end if;
  if (select sum(quantity) from order_return_items where return_id = ret.id) <> 2
     or (select sum(credit_usd_cents) from order_return_items where return_id = ret.id) <> o.total_usd_cents - o.delivery_usd_cents then
    raise exception 'TESTFAIL return items';
  end if;
  if exists (select 1 from order_payments where order_id = r.order_id) then raise exception 'TESTFAIL payment recorded'; end if;
  -- the invoice is kept
  if o.invoice_number is null then raise exception 'TESTFAIL invoice lost'; end if;
  -- twice: refused
  ok := false;
  begin
    perform mark_not_received(r.order_id);
  exception when others then ok := true;
  end;
  if not ok then raise exception 'TESTFAIL marked twice'; end if;

  -- 2. a pickup set aside, never collected
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Test Customer', '+96170000333', '', '', 'instagram', p_fulfilment => 'pickup');
  perform mark_not_received(r.order_id);
  select quantity, reserved into q1, r1 from inventory_levels where variant_id = v and branch_id = br;
  if (select status from orders where id = r.order_id) <> 'returned' or q1 <> q0 or r1 <> r0 then
    raise exception 'TESTFAIL pickup back qty %->%', q0, q1;
  end if;

  -- 3. a packed pickup can no longer be "cancelled" (one path: not received)
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Test Customer', '+96170000333', '', '', 'phone', p_fulfilment => 'pickup');
  ok := false;
  begin
    perform advance_online_order(r.order_id, 'cancelled');
  exception when others then ok := sqlerrm like '%not allowed%';
  end;
  if not ok then raise exception 'TESTFAIL packed pickup cancelled'; end if;

  -- 4. a cashier may do it, a guest may not
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  ok := false;
  begin
    perform mark_not_received(r.order_id);
  exception when others then ok := sqlerrm like '%not allowed%';
  end;
  if not ok then raise exception 'TESTFAIL anon allowed'; end if;
end $$;
