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
