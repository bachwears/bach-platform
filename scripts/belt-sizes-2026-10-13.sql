-- Belts sized like the big brands (founder request 2026-10-13): length in cm,
-- 85–110 as the usual run, ≈ trouser waist + 10 cm. Safe to re-run.
do $$
declare
  belt uuid;
  c record;
  s text;
begin
  -- size guide for belts (shown on every belt's product page)
  insert into public.size_guides (guide_key, name_en, name_ar, note_en, note_ar, headers_en, headers_ar, rows, category_codes, updated_at)
  values (
    'belts', 'Belts', 'الأحزمة',
    'Belt size is the length in cm from the buckle to the middle hole. Take your trouser waist size and add about 10 cm — or measure a belt that already fits you.',
    'مقاس الحزام هو طولو بالسنتيمتر من الإبزيم لنص التقوب. خود مقاس خصر البنطلون وزيد حوالي 10 سم — أو قيس حزام بيجي عليك.',
    array['Belt size (cm)', 'Waist (cm)', 'Jeans (in)', 'EU'],
    array['مقاس الحزام (سم)', 'الخصر (سم)', 'الجينز (إنش)', 'EU'],
    '[["80","70–74","28","44"],["85","75–79","30","46"],["90","80–84","32","48"],["95","85–89","34","50"],["100","90–94","36","52"],["105","95–99","38","54"],["110","100–104","40","56"],["115","105–109","42","58"],["120","110–114","44","60"]]'::jsonb,
    array['BLT'],
    now()
  )
  on conflict (guide_key) do update set
    name_en = excluded.name_en, name_ar = excluded.name_ar, note_en = excluded.note_en, note_ar = excluded.note_ar,
    headers_en = excluded.headers_en, headers_ar = excluded.headers_ar, rows = excluded.rows,
    category_codes = excluded.category_codes, updated_at = now();

  -- Braided Leather Belt: One Size (0 in stock) → 85–110 in each colour
  select id into belt from public.products where slug = 'braided-leather-belt';
  if belt is null then return; end if;
  update public.products set fit = null, updated_at = now() where id = belt and fit = 'One size';
  for c in
    select distinct color_code, color_en, color_ar from public.product_variants
    where product_id = belt and size = 'One Size'
  loop
    foreach s in array array['85', '90', '95', '100', '105', '110'] loop
      insert into public.product_variants (product_id, size, color_code, color_en, color_ar, is_active)
      values (belt, s, c.color_code, c.color_en, c.color_ar, true)
      on conflict (product_id, size, color_code) do nothing;
    end loop;
  end loop;
  -- the one-size rows stay (history, old tags) but no longer sell; they had no stock
  update public.product_variants v set is_active = false
  where v.product_id = belt and v.size = 'One Size'
    and coalesce((select sum(l.quantity + l.reserved) from public.inventory_levels l where l.variant_id = v.id), 0) = 0;
end $$;
