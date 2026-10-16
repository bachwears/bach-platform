-- Gapless invoice numbers (20261016090000_invoice_numbers). Rolled back.
do $$
declare br uuid; v uuid; unit int; r record; n1 bigint; n2 bigint; n3 bigint; ok boolean; total bigint;
begin
  -- backfill: 1..N with no holes
  select count(*) into total from orders;
  if (select max(invoice_number) from orders) <> total or (select count(distinct invoice_number) from orders) <> total
     or (select min(invoice_number) from orders) <> 1 then
    raise exception 'TESTFAIL backfill';
  end if;
  if (select last_number from invoice_counters where series = 'main') <> total then
    raise exception 'TESTFAIL counter';
  end if;

  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id, coalesce(pv.price_usd_cents_override, least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v, unit
  from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status <> 'archived'
    and not exists (select 1 from outfit_items oi where oi.product_id = p.id)
  limit 1;
  update inventory_levels set quantity = quantity + 10 where variant_id = v and branch_id = br;

  -- a sale takes the next number
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)));
  select invoice_number into n1 from orders where id = r.order_id;
  if n1 <> total + 1 then raise exception 'TESTFAIL first sale %', n1; end if;

  -- a failed sale gives its number back
  begin
    drop table if exists _lines;
    perform pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      '[{"currency":"USD","amount_minor":1,"net":true}]'::jsonb);
  exception when others then null;
  end;
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)));
  select invoice_number into n2 from orders where id = r.order_id;
  if n2 <> n1 + 1 then raise exception 'TESTFAIL gap after failed sale % %', n1, n2; end if;

  -- numbers never change, invoices are never deleted
  ok := false;
  begin
    update orders set invoice_number = 999999 where id = r.order_id;
  exception when others then ok := sqlerrm like '%never changes%';
  end;
  if not ok then raise exception 'TESTFAIL renumber allowed'; end if;
  ok := false;
  begin
    delete from orders where id = r.order_id;
  exception when others then ok := sqlerrm like '%invoices are kept%';
  end;
  if not ok then raise exception 'TESTFAIL delete allowed'; end if;
end $$;
