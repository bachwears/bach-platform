-- Outfits — rolled-back tests (run with the migrations in one transaction that
-- ends in rollback; a failure raises 'TESTFAIL …').

-- Task 1: tables, barcode, one piece once per outfit
do $$
declare o uuid; jkt uuid; hod uuid; bot uuid;
begin
  select id into jkt from products where slug = 'corduroy-jacket-with-fireman-clasps';
  select id into hod from products where slug = 'basic-relaxed-fit-hoodie';
  select id into bot from products where slug = 'lug-sole-leather-chelsea-boots';
  if jkt is null or hod is null or bot is null then raise exception 'TESTFAIL test products missing'; end if;
  insert into outfits (slug, name_en, name_ar, status, price_kind, percent_off)
  values ('zz-test-look', 'ZZ Test Look', 'طقم تجريبي', 'published', 'percent', 15) returning id into o;
  insert into outfit_items (outfit_id, product_id, sort) values (o, jkt, 0), (o, hod, 1), (o, bot, 2);
  if (select barcode from outfits where id = o) !~ '^2\d{12}$' then raise exception 'TESTFAIL outfit barcode'; end if;
  begin
    insert into outfit_items (outfit_id, product_id, sort) values (o, jkt, 3);
    raise exception 'TESTFAIL duplicate piece accepted';
  exception when unique_violation then null;
  end;
end $$;

-- Task 2: a piece belongs to one exclusive outfit at most
do $$
declare a uuid; b uuid; jkt uuid; hod uuid; bot uuid;
begin
  select id into jkt from products where slug = 'corduroy-jacket-with-fireman-clasps';
  select id into hod from products where slug = 'basic-relaxed-fit-hoodie';
  select id into bot from products where slug = 'lug-sole-leather-chelsea-boots';
  insert into outfits (slug, name_en, name_ar, sell_mode) values ('zz-a', 'A', 'أ', 'exclusive') returning id into a;
  insert into outfit_items (outfit_id, product_id, sort) values (a, jkt, 0), (a, hod, 1);
  insert into outfits (slug, name_en, name_ar, sell_mode) values ('zz-b', 'B', 'ب', 'whole') returning id into b;
  -- a whole-look outfit may share the piece
  insert into outfit_items (outfit_id, product_id, sort) values (b, jkt, 0), (b, bot, 1);
  begin
    update outfits set sell_mode = 'exclusive' where id = b;
    raise exception 'TESTFAIL two exclusive outfits share a piece';
  exception when raise_exception then
    if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  -- adding a shared piece to an exclusive outfit is refused too
  update outfits set sell_mode = 'flexible' where id = b;
  delete from outfit_items where outfit_id = b and product_id = jkt;
  update outfits set sell_mode = 'exclusive' where id = b;
  begin
    insert into outfit_items (outfit_id, product_id, sort) values (b, jkt, 2);
    raise exception 'TESTFAIL exclusive piece added to a second exclusive outfit';
  exception when raise_exception then
    if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  delete from outfit_items where outfit_id in (a, b);
  delete from outfits where id in (a, b);
end $$;

-- Task 3: price_cart
do $$
declare o uuid; v_j uuid; v_h uuid; v_b uuid; r jsonb; lines jsonb;
begin
  select id into o from outfits where slug = 'zz-test-look';
  select pv.id into v_j from product_variants pv join products p on p.id = pv.product_id where p.slug = 'corduroy-jacket-with-fireman-clasps' and pv.is_active limit 1;
  select pv.id into v_h from product_variants pv join products p on p.id = pv.product_id where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active limit 1;
  select pv.id into v_b from product_variants pv join products p on p.id = pv.product_id where p.slug = 'lug-sole-leather-chelsea-boots' and pv.is_active limit 1;
  lines := jsonb_build_array(
    jsonb_build_object('key','1','variant_id',v_j,'quantity',1,'unit',12900,'outfit_id',o,'outfit_group','g1'),
    jsonb_build_object('key','2','variant_id',v_h,'quantity',1,'unit',4500,'outfit_id',o,'outfit_group','g1'),
    jsonb_build_object('key','3','variant_id',v_b,'quantity',1,'unit',8900,'outfit_id',o,'outfit_group','g1'));
  -- 15% of the full prices 263.00 = 39.45, split exactly
  r := price_cart(lines);
  if (r->>'outfit_discount')::int <> 3945 then raise exception 'TESTFAIL percent: %', r; end if;
  if (select sum((x->>'outfit_discount')::int) from jsonb_array_elements(r->'lines') x) <> 3945 then raise exception 'TESTFAIL split: %', r; end if;
  -- a flexible look with a piece left out: no discount
  r := price_cart(lines - 2);
  if (r->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL incomplete discounted: %', r; end if;
  -- fixed 199.00 → 64.00 off
  update outfits set price_kind = 'fixed', fixed_usd_cents = 19900 where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 6400 then raise exception 'TESTFAIL fixed: %', price_cart(lines); end if;
  -- fixed above the sum → nothing off
  update outfits set fixed_usd_cents = 30000 where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL fixed above sum'; end if;
  -- best deal, never stacked: jacket on sale at 109 → current 243 vs 15% off full 223.55 → 19.45 off
  update outfits set price_kind = 'percent', percent_off = 15 where id = o;
  lines := jsonb_set(lines, '{0,unit}', '10900');
  if (price_cart(lines)->>'outfit_discount')::int <> 1945 then raise exception 'TESTFAIL best deal: %', price_cart(lines); end if;
  lines := jsonb_set(lines, '{0,unit}', '12900');
  -- promo exclude (default): the discounted look isn't in the code's base
  r := price_cart(lines, 'percent_bp', 1000);
  if (r->>'promo_base')::int <> 0 or (r->>'promo_discount')::int <> 0 then raise exception 'TESTFAIL exclude: %', r; end if;
  -- stack: base 263.00 - 39.45 = 223.55 → 10% = 22.36
  update outfits set promo_mode = 'stack' where id = o;
  r := price_cart(lines, 'percent_bp', 1000);
  if (r->>'promo_base')::int <> 22355 or (r->>'promo_discount')::int <> 2236 then raise exception 'TESTFAIL stack: %', r; end if;
  -- best: a 30% code (78.90) beats the look's 39.45 → the look's discount goes, the code applies
  update outfits set promo_mode = 'best' where id = o;
  r := price_cart(lines, 'percent_bp', 3000);
  if (r->>'outfit_discount')::int <> 0 or (r->>'promo_discount')::int <> 7890 then raise exception 'TESTFAIL best: %', r; end if;
  -- best: a 5% code (13.15) loses to the look → look kept, code base 0
  r := price_cart(lines, 'percent_bp', 500);
  if (r->>'outfit_discount')::int <> 3945 or (r->>'promo_discount')::int <> 0 then raise exception 'TESTFAIL best small code: %', r; end if;
  -- a fixed $10 code with exclude on a cart that also has a loose piece: base = the loose piece
  update outfits set promo_mode = 'exclude' where id = o;
  r := price_cart(lines || jsonb_build_array(jsonb_build_object('key','4','variant_id',v_h,'quantity',2,'unit',4500)), 'fixed', 1000);
  if (r->>'promo_base')::int <> 9000 or (r->>'promo_discount')::int <> 1000 then raise exception 'TESTFAIL fixed code: %', r; end if;
  -- whole: a look with a piece missing is refused
  update outfits set sell_mode = 'whole' where id = o;
  begin
    perform price_cart(lines - 2);
    raise exception 'TESTFAIL whole incomplete accepted';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  -- exclusive: a piece on its own is refused
  update outfits set sell_mode = 'exclusive' where id = o;
  begin
    perform price_cart(jsonb_build_array(jsonb_build_object('key','x','variant_id',v_h,'quantity',1,'unit',4500)));
    raise exception 'TESTFAIL exclusive piece alone accepted';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  -- a draft look never discounts
  update outfits set sell_mode = 'flexible', status = 'draft' where id = o;
  if (price_cart(lines)->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL draft discounted'; end if;
  -- quantity 2 of a piece in the look: not the look
  update outfits set status = 'published' where id = o;
  if (price_cart(jsonb_set(lines, '{1,quantity}', '2'))->>'outfit_discount')::int <> 0 then raise exception 'TESTFAIL qty 2 discounted'; end if;
  -- no outfits at all: plain cart
  r := price_cart(jsonb_build_array(jsonb_build_object('key','p','variant_id',v_h,'quantity',1,'unit',4500)), 'percent_bp', 1000);
  if (r->>'promo_base')::int <> 4500 or (r->>'promo_discount')::int <> 450 then raise exception 'TESTFAIL plain: %', r; end if;
end $$;

-- Task 4: a return refunds what the line actually cost (a POS line discount isn't taken twice)
do $$
declare v_order uuid; v_line uuid; v_var uuid; r record; br uuid;
begin
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id into v_var from product_variants pv join products p on p.id = pv.product_id where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active limit 1;
  -- $100 piece, 10% line discount → line total $90, invoice total $90
  insert into orders (channel, status, branch_id, lbp_per_usd, subtotal_usd_cents, discount_usd_cents, tva_usd_cents, total_usd_cents)
  values ('pos', 'completed', br, 89500, 10000, 1000, 0, 9000) returning id into v_order;
  insert into order_items (order_id, variant_id, sku, name_en, name_ar, size, color_en, color_ar, quantity, unit_price_usd_cents, line_total_usd_cents)
  values (v_order, v_var, 'T', 'T', 'T', 'M', 'Grey', 'رمادي', 1, 10000, 9000) returning id into v_line;
  select * into r from _validate_return(v_order, jsonb_build_array(jsonb_build_object('order_item_id', v_line, 'quantity', 1)));
  if r.credit <> 9000 then raise exception 'TESTFAIL credit %', r.credit; end if;
  delete from order_items where order_id = v_order;
  delete from orders where id = v_order;
end $$;

-- Task 5: storefront_checkout sells a look
do $$
declare o uuid; v_j uuid; v_h uuid; v_b uuid; r record; br uuid; shares int; n int; res0 int; res1 int;
begin
  select id into o from outfits where slug = 'zz-test-look';
  update outfits set price_kind = 'percent', percent_off = 15, promo_mode = 'exclude', sell_mode = 'flexible', status = 'published' where id = o;
  select id into br from branches where is_active order by created_at limit 1;
  -- a variant of each piece with stock at the web branch
  select pv.id into v_j from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'corduroy-jacket-with-fireman-clasps' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_h from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_b from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'lug-sole-leather-chelsea-boots' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  if v_j is null or v_h is null or v_b is null then raise exception 'TESTFAIL no stock for the test look'; end if;
  select reserved into res0 from inventory_levels where variant_id = v_h and branch_id = br;
  select * into r from storefront_checkout(
    jsonb_build_array(
      jsonb_build_object('variant_id', v_j, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'look-1'),
      jsonb_build_object('variant_id', v_h, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'look-1'),
      jsonb_build_object('variant_id', v_b, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'look-1')),
    'Test Buyer', '+96170000001', 'Tripoli', 'Test street', null, null, null, 'cod', false, 'delivery');
  if r.discount_usd_cents <> 3945 then raise exception 'TESTFAIL web look discount %', r.discount_usd_cents; end if;
  select coalesce(sum(outfit_discount_cents), 0), count(*) filter (where outfit_id = o and outfit_group is not null)
    into shares, n from order_items where order_id = r.order_id;
  if shares <> 3945 or n <> 3 then raise exception 'TESTFAIL web order items: shares % lines %', shares, n; end if;
  if (select total_usd_cents from orders where id = r.order_id) <> 26300 - 3945 then
    raise exception 'TESTFAIL web total %', (select total_usd_cents from orders where id = r.order_id);
  end if;
  select reserved into res1 from inventory_levels where variant_id = v_h and branch_id = br;
  if res1 <> res0 + 1 then raise exception 'TESTFAIL reserve % → %', res0, res1; end if;
  -- a plain cart is priced as before (each real checkout is its own transaction)
  drop table if exists _web;
  select * into r from storefront_checkout(
    jsonb_build_array(jsonb_build_object('variant_id', v_h, 'quantity', 1)),
    'Test Buyer', '+96170000001', 'Tripoli', 'Test street', null, null, null, 'cod', false, 'delivery');
  if r.discount_usd_cents <> 0 or (select total_usd_cents from orders where id = r.order_id) <> 4500 + 500 then
    raise exception 'TESTFAIL plain web order changed: % %', r.discount_usd_cents, (select total_usd_cents from orders where id = r.order_id);
  end if;
end $$;

-- Task 6: pos_checkout sells a look; the invoice discount follows the look's promo mode
do $$
declare o uuid; v_j uuid; v_h uuid; v_b uuid; r record; br uuid; shares int; items jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  select id into o from outfits where slug = 'zz-test-look';
  update outfits set price_kind = 'percent', percent_off = 15, promo_mode = 'exclude', sell_mode = 'flexible', status = 'published' where id = o;
  select id into br from branches where is_active order by created_at limit 1;
  -- test stock (rolled back with everything else)
  update inventory_levels l set quantity = l.quantity + 5
  from product_variants pv join products p on p.id = pv.product_id
  where l.variant_id = pv.id and l.branch_id = br
    and p.slug in ('corduroy-jacket-with-fireman-clasps', 'basic-relaxed-fit-hoodie', 'lug-sole-leather-chelsea-boots');
  select pv.id into v_j from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'corduroy-jacket-with-fireman-clasps' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_h from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_b from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'lug-sole-leather-chelsea-boots' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  items := jsonb_build_array(
    jsonb_build_object('variant_id', v_j, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'),
    jsonb_build_object('variant_id', v_h, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'),
    jsonb_build_object('variant_id', v_b, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'));
  drop table if exists _lines;
  select * into r from pos_checkout(br, items, '[{"currency":"USD","amount_minor":22355,"net":true}]'::jsonb);
  if (select discount_usd_cents from orders where id = r.order_id) <> 3945 then
    raise exception 'TESTFAIL pos look discount %', (select discount_usd_cents from orders where id = r.order_id);
  end if;
  select sum(outfit_discount_cents) into shares from order_items where order_id = r.order_id and outfit_id = o;
  if shares <> 3945 then raise exception 'TESTFAIL pos shares %', shares; end if;
  -- 10% invoice discount, exclude: the look keeps its own price, nothing more
  drop table if exists _lines;
  select * into r from pos_checkout(br, items, '[{"currency":"USD","amount_minor":22355,"net":true}]'::jsonb, 1000);
  if (select discount_usd_cents from orders where id = r.order_id) <> 3945 then
    raise exception 'TESTFAIL pos exclude %', (select discount_usd_cents from orders where id = r.order_id);
  end if;
  -- a line discount on a look piece is refused
  drop table if exists _lines;
  begin
    perform pos_checkout(br, jsonb_set(items, '{0,line_discount_bp}', '500'), '[{"currency":"USD","amount_minor":22355,"net":true}]'::jsonb);
    raise exception 'TESTFAIL line discount on a look accepted';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  -- a plain POS sale with 10% off is unchanged: 45.00 → 40.50
  drop table if exists _lines;
  select * into r from pos_checkout(br, jsonb_build_array(jsonb_build_object('variant_id', v_h, 'quantity', 1)),
    '[{"currency":"USD","amount_minor":4050,"net":true}]'::jsonb, 1000);
  if (select total_usd_cents from orders where id = r.order_id) <> 4050 then
    raise exception 'TESTFAIL plain pos %', (select total_usd_cents from orders where id = r.order_id);
  end if;
end $$;

-- Task 7: returning a piece of a look
do $$
declare o uuid; v_j uuid; v_h uuid; v_b uuid; r record; br uuid; items jsonb; hood uuid; c record; all_lines jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"2e815687-492b-44f4-824e-95345681530a","role":"authenticated"}', true);
  select id into o from outfits where slug = 'zz-test-look';
  update outfits set price_kind = 'percent', percent_off = 15, promo_mode = 'exclude', sell_mode = 'flexible', status = 'published' where id = o;
  select id into br from branches where is_active order by created_at limit 1;
  select pv.id into v_j from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'corduroy-jacket-with-fireman-clasps' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_h from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'basic-relaxed-fit-hoodie' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  select pv.id into v_b from product_variants pv join products p on p.id = pv.product_id join inventory_levels l on l.variant_id = pv.id and l.branch_id = br
    where p.slug = 'lug-sole-leather-chelsea-boots' and pv.is_active and l.quantity - l.reserved > 0 limit 1;
  items := jsonb_build_array(
    jsonb_build_object('variant_id', v_j, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'),
    jsonb_build_object('variant_id', v_h, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'),
    jsonb_build_object('variant_id', v_b, 'quantity', 1, 'outfit_id', o, 'outfit_group', 'g'));
  -- flexible: the hoodie alone comes back at its paid share 45.00 - 6.75 = 38.25
  drop table if exists _lines;
  select * into r from pos_checkout(br, items, '[{"currency":"USD","amount_minor":22355,"net":true}]'::jsonb);
  select id into hood from order_items where order_id = r.order_id and variant_id = v_h;
  select * into c from _validate_return(r.order_id, jsonb_build_array(jsonb_build_object('order_item_id', hood, 'quantity', 1)));
  if c.credit <> 3825 then raise exception 'TESTFAIL flexible piece credit %', c.credit; end if;
  -- exclusive: the hoodie alone is refused, the whole look is accepted
  update outfits set sell_mode = 'exclusive' where id = o;
  drop table if exists _lines;
  select * into r from pos_checkout(br, items, '[{"currency":"USD","amount_minor":22355,"net":true}]'::jsonb);
  select id into hood from order_items where order_id = r.order_id and variant_id = v_h;
  begin
    perform * from _validate_return(r.order_id, jsonb_build_array(jsonb_build_object('order_item_id', hood, 'quantity', 1)));
    raise exception 'TESTFAIL exclusive piece returned alone';
  exception when raise_exception then if sqlerrm like 'TESTFAIL%' then raise; end if;
  end;
  select jsonb_agg(jsonb_build_object('order_item_id', id, 'quantity', 1)) into all_lines from order_items where order_id = r.order_id;
  if (select sum(credit) from _validate_return(r.order_id, all_lines)) <> 22355 then
    raise exception 'TESTFAIL exclusive whole return credit %', (select sum(credit) from _validate_return(r.order_id, all_lines));
  end if;
  -- the returned line copies its look
  update outfits set sell_mode = 'flexible' where id = o;
end $$;
