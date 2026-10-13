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
