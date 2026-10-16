-- Orders taken for a customer from the POS (20261016100000_staff_customer_orders). Rolled back.
do $$
declare br uuid; v uuid; unit int; r record; o record; ok boolean; staff uuid := '2e815687-492b-44f4-824e-95345681530a';
begin
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id, coalesce(pv.price_usd_cents_override, least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v, unit
  from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status = 'published' and p.price_usd_cents < 10000
    and not exists (select 1 from outfit_items oi where oi.product_id = p.id)
  limit 1;
  update inventory_levels set quantity = quantity + 10 where variant_id = v and branch_id = br;

  -- a guest can't use it
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  ok := false;
  begin
    perform staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      'Test Customer', '+96170000111', 'Beirut', 'Hamra street', 'whatsapp');
  exception when others then ok := sqlerrm like '%not allowed%';
  end;
  if not ok then raise exception 'TESTFAIL anon allowed'; end if;

  -- staff place it: a website order, cash on delivery, from WhatsApp, taken by them
  perform set_config('request.jwt.claims', '{"sub":"' || staff || '","role":"authenticated"}', true);
  drop table if exists _web;
  select * into r from staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    'Test Customer', '+96170000111', 'Beirut', 'Hamra street', 'whatsapp', p_note => 'call before');
  select * into o from orders where id = r.order_id;
  if o.channel <> 'online' or o.status <> 'pending' or o.payment_method <> 'cod' or o.source <> 'whatsapp'
     or o.taken_by <> staff or o.ship_phone <> '+96170000111' or o.fulfilment <> 'delivery' then
    raise exception 'TESTFAIL order fields % % % % %', o.channel, o.status, o.payment_method, o.source, o.taken_by;
  end if;
  -- priced like the website: pieces + delivery fee under the free threshold
  if o.total_usd_cents <> unit + o.delivery_usd_cents or o.delivery_usd_cents <= 0 then
    raise exception 'TESTFAIL total % unit % delivery %', o.total_usd_cents, unit, o.delivery_usd_cents;
  end if;
  -- the customer is the caller's customer, not the staff member's own account
  if (select phone from customers where id = o.customer_id) <> '+96170000111' then
    raise exception 'TESTFAIL customer linked to staff';
  end if;
  -- stock reserved, session restored
  if auth.uid() <> staff then raise exception 'TESTFAIL session not restored'; end if;

  -- a bad source is refused
  ok := false;
  begin
    drop table if exists _web;
    perform staff_customer_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      'Test Customer', '+96170000111', 'Beirut', 'Hamra street', 'tiktok');
  exception when others then ok := sqlerrm like '%invalid source%';
  end;
  if not ok then raise exception 'TESTFAIL bad source accepted'; end if;
end $$;
