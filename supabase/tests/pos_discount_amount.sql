-- POS invoice discount as a percentage or an amount (20261014120000_pos_discount_amount).
-- Runs inside one rolled-back transaction.
do $$
declare br uuid; v uuid; unit int; r record; d int; t int; ok boolean;
begin
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  select id into br from branches where is_active order by created_at limit 1;
  -- a loose piece, priced over $20, with test stock (rolled back)
  select pv.id, coalesce(pv.price_usd_cents_override, least(coalesce(p.sale_price_usd_cents, p.price_usd_cents), p.price_usd_cents))
    into v, unit
  from product_variants pv join products p on p.id = pv.product_id
  join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
  where pv.is_active and p.status <> 'archived' and p.price_usd_cents > 2000
    and not exists (select 1 from outfit_items oi where oi.product_id = p.id)
  limit 1;
  update inventory_levels set quantity = quantity + 10 where variant_id = v and branch_id = br;

  -- 1. percentage: 10% recorded on the order
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)), 1000);
  select discount_usd_cents, total_usd_cents into d, t from orders where id = r.order_id;
  if d <> round(unit * 0.1) or t <> unit - d then raise exception 'TESTFAIL percent % %', d, t; end if;

  -- 2. amount: $2 off recorded on the order
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit - 200, 'net', true)),
    p_discount_usd_cents => 200);
  select discount_usd_cents, total_usd_cents into d, t from orders where id = r.order_id;
  if d <> 200 or t <> unit - 200 then raise exception 'TESTFAIL amount % %', d, t; end if;

  -- 3. amount above the total is refused
  ok := false;
  begin
    drop table if exists _lines;
    perform pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      '[{"currency":"USD","amount_minor":100,"net":true}]'::jsonb, p_discount_usd_cents => unit + 1);
  exception when others then ok := sqlerrm like '%discount above total%';
  end;
  if not ok then raise exception 'TESTFAIL amount above total accepted'; end if;

  -- 4. percentage and amount together are refused
  ok := false;
  begin
    drop table if exists _lines;
    perform pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)), 500,
      p_discount_usd_cents => 100);
  exception when others then ok := sqlerrm like '%one invoice discount only%';
  end;
  if not ok then raise exception 'TESTFAIL both discounts accepted'; end if;

  -- 5. a cashier: an amount worth more than 10% needs a manager; 10% or less goes through
  perform set_config('request.jwt.claims', '{"sub":"48380338-465e-4fb4-ad38-abc653f6fadc","role":"authenticated"}', true);
  ok := false;
  begin
    drop table if exists _lines;
    perform pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
      jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)),
      p_discount_usd_cents => (unit / 10) + 100);
  exception when others then ok := sqlerrm like '%needs a manager%';
  end;
  if not ok then raise exception 'TESTFAIL cashier amount above 10%% accepted'; end if;
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)),
    p_discount_usd_cents => unit / 10);
  if (select discount_usd_cents from orders where id = r.order_id) <> unit / 10 then
    raise exception 'TESTFAIL cashier 10%% amount';
  end if;

  -- 6. older tills (no amount argument) still work
  drop table if exists _lines;
  select * into r from pos_checkout(p_branch_id => br,
    p_items => jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)),
    p_payments => jsonb_build_array(jsonb_build_object('currency', 'USD', 'amount_minor', unit, 'net', true)),
    p_discount_basis_points => 0);
  if (select discount_usd_cents from orders where id = r.order_id) <> 0 then raise exception 'TESTFAIL no discount'; end if;
end $$;
