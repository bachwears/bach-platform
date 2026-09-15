-- Stocktake import 2026-09-15: 261 products / 1148 variants / 1323 units (founder-approved review file).
-- Products land as drafts; stock on the main branch; label printing works immediately.
do $$
declare b uuid; pid uuid; vid uuid;
begin
  select id into b from public.branches order by created_at limit 1;
  if b is null then raise exception 'no branch found'; end if;

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('bold-letter-jacquard-scarf', 'Bold Letter Jacquard Scarf', 'Bold Letter Jacquard Scarf', 'The detail that does the talking — crafted in cotton. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGB', 'Light Grey/Black', 'رمادي فاتح, أسود', 'BW-ACC-001-LGB-M', '2000000000015') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('diagonal-monogram-scarf', 'Diagonal Monogram Scarf', 'Diagonal Monogram Scarf', 'The detail that does the talking — crafted in cotton. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BBE', 'Brown/Beige', 'بني, بيج', 'BW-ACC-002-BBE-M', '2000000000022') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('geometric-maze-scarf', 'Geometric Maze Scarf', 'Geometric Maze Scarf', 'The detail that does the talking — crafted in cotton. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BBR', 'Black/Brown', 'أسود, بني', 'BW-ACC-003-BBR-M', '2000000000039') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('heritage-floral-monogram-scarf', 'Heritage Floral Monogram Scarf', 'Heritage Floral Monogram Scarf', 'A finishing touch in cotton that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGC', 'Dark Grey/Camel', 'رمادي غامق, كاميل', 'BW-ACC-004-DGC-M', '2000000000046') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ivory-fringed-scarf', 'Ivory Fringed Scarf', 'Ivory Fringed Scarf', 'Quiet and considered, crafted in cotton — the BACH way to finish an outfit. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-ACC-005-OWH-M', '2000000000053') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('monogram-jacuqard-scarf', 'Monogram Jacquard Scarf', 'Monogram Jacquard Scarf', 'A finishing touch in cotton that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGB', 'Light Grey/Black', 'رمادي فاتح, أسود', 'BW-ACC-006-LGB-M', '2000000000060') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ornamental-dot-scarf', 'Ornamental Dot Scarf', 'Ornamental Dot Scarf', 'The detail that does the talking — crafted in cotton. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BBE', 'Brown/Beige', 'بني, بيج', 'BW-ACC-007-BBE-M', '2000000000077') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-beanie', 'Ribbed Knit Beanie', 'Ribbed Knit Beanie', 'A finishing touch in cotton that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2500,
          'Cotton', null, array['hats','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-ACC-008-BLA-M', '2000000000084') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-ACC-008-WHI-M', '2000000000091') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-ACC-008-NAV-M', '2000000000107') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-ACC-008-BEI-M', '2000000000114') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 4);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-ACC-008-OLI-M', '2000000000121') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRE', 'Grey', 'رمادي', 'BW-ACC-008-GRE-M', '2000000000138') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-ACC-008-CAM-M', '2000000000145') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-ACC-008-BRO-M', '2000000000152') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'RED', 'Red', 'أحمر', 'BW-ACC-008-RED-M', '2000000000169') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('sand-beige-fringed-scarf', 'Sand Beige Fringed Scarf', 'Sand Beige Fringed Scarf', 'The detail that does the talking — crafted in cotton. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-ACC-009-BEI-M', '2000000000176') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('signature-letter-scarf', 'Signature Letter Scarf', 'Signature Letter Scarf', 'Quiet and considered, crafted in cotton — the BACH way to finish an outfit. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BCA', 'Brown/Camel', 'بني, كاميل', 'BW-ACC-010-BCA-M', '2000000000183') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('statement-logo-scarf', 'Statement Logo Scarf', 'Statement Logo Scarf', 'A finishing touch in cotton that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'ACC'), 2900,
          'Cotton', null, array['scarves','accessory','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BYE', 'Black/Yellow', 'أسود, أصفر', 'BW-ACC-011-BYE-M', '2000000000190') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('basic-relaxed-fit-hoodie', 'Basic Relaxed Fit Hoodie', 'Basic Relaxed Fit Hoodie', 'A hoodie with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-HOD-001-BUR-L', '2000000000206') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BUR', 'Burgundy', 'خمري', 'BW-HOD-001-BUR-M', '2000000000213') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BUR', 'Burgundy', 'خمري', 'BW-HOD-001-BUR-XL', '2000000000220') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-HOD-001-OLI-L', '2000000000237') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-HOD-001-OLI-M', '2000000000244') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-HOD-001-OLI-XL', '2000000000251') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-HOD-001-LGR-L', '2000000000268') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-HOD-001-LGR-M', '2000000000275') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-HOD-001-LGR-XL', '2000000000282') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-HOD-001-NAV-L', '2000000000299') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-HOD-001-GRA-M', '2000000000305') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-HOD-001-GRA-S', '2000000000312') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'GRA', 'Green', 'أخضر', 'BW-HOD-001-GRA-XXL', '2000000000329') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-HOD-001-BEI-M', '2000000000336') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-HOD-001-BEI-XL', '2000000000343') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('color-block-pullover-hoodie', 'Color Block Pullover Hoodie', 'Color Block Pullover Hoodie', 'A hoodie with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GBL', 'Green/Black', 'أخضر, أسود', 'BW-HOD-002-GBL-S', '2000000000350') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-stitch-washed-hoodie', 'Contrast Stitch Washed Hoodie', 'Contrast Stitch Washed Hoodie', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-HOD-003-GRA-L', '2000000000367') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-HOD-003-GRA-M', '2000000000374') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-HOD-003-GRA-XL', '2000000000381') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cropped-boxy-hoodie', 'Cropped Boxy Hoodie', 'Cropped Boxy Hoodie', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 5500,
          'Cotton', 'Regular fit', array['hoodies & sweatshirts','hoodie','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-HOD-004-BLA-M', '2000000000398') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-HOD-004-BLA-S', '2000000000404') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XS', 'BLA', 'Black', 'أسود', 'BW-HOD-004-BLA-XS', '2000000000411') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('essential-fleece-zip-hoodie', 'Essential Fleece Zip Hoodie', 'Essential Fleece Zip Hoodie', 'A hoodie with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 5500,
          'Cotton Blend', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-HOD-005-BLA-S', '2000000000428') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'RED', 'Red', 'أحمر', 'BW-HOD-005-RED-M', '2000000000435') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'RED', 'Red', 'أحمر', 'BW-HOD-005-RED-S', '2000000000442') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('essential-zip-up-hoodie', 'Essential Zip-up Hoodie', 'Essential Zip-up Hoodie', 'A hoodie with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 5500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-HOD-006-BLA-L', '2000000000459') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-HOD-006-WHI-L', '2000000000466') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-HOD-006-WHI-XL', '2000000000473') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('future-paisley-hoodie-white', 'Future Paisley Hoodie White', 'Future Paisley Hoodie White', 'A hoodie with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-HOD-007-WHI-XL', '2000000000480') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('gothic-sleeve-print-hoodie', 'Gothic Sleeve Print Hoodie', 'Gothic Sleeve Print Hoodie', 'Cut in cotton with an oversized fit, a hoodie built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-HOD-008-BLA-XXL', '2000000000497') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('monogram-graphic-pullover-hoodie', 'Monogram Graphic Pullover Hoodie', 'Monogram Graphic Pullover Hoodie', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 3900,
          'Cotton', 'Slim fit', array['hoodies & sweatshirts','hoodie','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-HOD-009-WHI-M', '2000000000503') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-HOD-009-GRA-M', '2000000000510') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-HOD-009-GRA-S', '2000000000527') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('multilingual-logo-print-hoodie', 'Multilingual Logo Print Hoodie', 'Multilingual Logo Print Hoodie', 'Cut in cotton with an oversized fit. The kind of hoodie that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-HOD-010-BLU-XL', '2000000000534') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLU', 'Blue', 'أزرق', 'BW-HOD-010-BLU-XXL', '2000000000541') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('paisley-print-pullover-hoodie', 'Paisley Print Pullover Hoodie', 'Paisley Print Pullover Hoodie', 'Cut in cotton with an oversized fit. The kind of hoodie that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-HOD-011-WHI-L', '2000000000558') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('three-stripe-zip-up-hoodie', 'Three-stripe Zip-up Hoodie', 'Three-stripe Zip-up Hoodie', 'Cut in cotton with an oversized fit, a hoodie built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 5500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-HOD-012-WHI-L', '2000000000565') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-HOD-012-WHI-M', '2000000000572') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('varsity-contrast-zip-hoodie', 'Varsity Contrast Zip Hoodie', 'Varsity Contrast Zip Hoodie', 'Cut in cotton with an oversized fit. The kind of hoodie that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 5500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-HOD-013-BLA-S', '2000000000589') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-HOD-013-GRA-S', '2000000000596') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-wash-graphic-hoodie', 'Vintage Wash Graphic Hoodie', 'Vintage Wash Graphic Hoodie', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-HOD-014-OLI-L', '2000000000602') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-HOD-014-OLI-M', '2000000000619') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-HOD-014-OLI-XL', '2000000000626') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-wash-pullover-hoodie', 'Vintage Wash Pullover Hoodie', 'Vintage Wash Pullover Hoodie', 'Cut in cotton with an oversized fit. The kind of hoodie that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'HOD'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','hoodie','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MAU', 'Mauve', 'موف', 'BW-HOD-015-MAU-M', '2000000000633') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('belted-utility-faux-leather-jacket', 'Belted Utility Faux Leather Jacket', 'Belted Utility Faux Leather Jacket', 'Considered lines, clean finish. Cut in faux leather with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11900,
          'Faux Leather', 'Oversized', array['jackets','jacket','oversized','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-001-BLA-L', '2000000000640') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-JKT-001-BLA-M', '2000000000657') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-JKT-001-BRO-L', '2000000000664') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-001-BRO-S', '2000000000671') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-JKT-001-BRO-XL', '2000000000688') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('biker-leather-jacket', 'Biker Leather Jacket', 'Biker Leather Jacket', 'Cut in faux leather with a slim fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Faux Leather', 'Slim fit', array['jackets','jacket','slim fit','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-002-BLA-S', '2000000000695') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-JKT-002-WHI-L', '2000000000701') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('buckle-collar-shearling-aviator-jacket', 'Buckle Collar Shearling Aviator Jacket', 'Buckle Collar Shearling Aviator Jacket', 'Cut in faux leather with a regular fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Faux Leather', 'Regular fit', array['jackets','jacket','regular fit','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-003-BLA-S', '2000000000718') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-003-BEI-S', '2000000000725') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-leather-bomber-jacket', 'Classic Leather Bomber Jacket', 'Classic Leather Bomber Jacket', 'A jacket with quiet intent — cut in leather with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Leather', 'Regular fit', array['jackets','jacket','regular fit','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-004-BLA-S', '2000000000732') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-trucker-denim-jacket', 'Classic Trucker Denim Jacket', 'Classic Trucker Denim Jacket', 'Cut in denim with a regular fit, a jacket built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Denim', 'Regular fit', array['jackets','jacket','regular fit','denim','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JKT-005-BRO-M', '2000000000749') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-005-BRO-S', '2000000000756') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-JKT-005-BRO-XL', '2000000000763') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-JKT-005-BRO-XXL', '2000000000770') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-005-LGR-L', '2000000000787') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-005-LGR-M', '2000000000794') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-005-LGR-S', '2000000000800') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-005-LGR-XL', '2000000000817') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-005-LGR-XXL', '2000000000824') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('clean-line-leather-jacket', 'Clean Line Leather Jacket', 'Clean Line Leather Jacket', 'Considered lines, clean finish. Cut in leather with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-JKT-006-BLA-XL', '2000000000831') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-collar-canvas-jacket', 'Contrast Collar Canvas Jacket', 'Contrast Collar Canvas Jacket', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Cotton', 'Regular fit', array['jackets','jacket','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-JKT-007-CAM-L', '2000000000848') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-JKT-007-CAM-M', '2000000000855') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-JKT-007-CAM-XL', '2000000000862') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-JKT-007-OWH-L', '2000000000879') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-JKT-007-OWH-M', '2000000000886') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-JKT-007-OWH-XL', '2000000000893') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-JKT-007-OLI-L', '2000000000909') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-JKT-007-OLI-XL', '2000000000916') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-collar-fireman-clasps-jacket', 'Contrast Collar Fireman Clasps Jacket', 'Contrast Collar Fireman Clasps Jacket', 'A jacket with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Cotton', 'Oversized', array['jackets','jacket','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-JKT-008-BEI-L', '2000000000923') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-collar-jacket-with-fireman-clasps', 'Contrast Collar Jacket with Fireman Clasps', 'Contrast Collar Jacket with Fireman Clasps', 'Cut in cotton with an oversized fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 12900,
          'Cotton', 'Oversized', array['jackets','jacket','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-JKT-009-NAV-M', '2000000000930') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-corduroy-collar-harrington-jacket', 'Contrast Corduroy Collar Harrington Jacket', 'Contrast Corduroy Collar Harrington Jacket', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Cotton', 'Regular fit', array['jackets','jacket','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-JKT-010-OWH-S', '2000000000947') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-JKT-010-OLI-M', '2000000000954') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-JKT-010-OLI-XL', '2000000000961') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-faux-leather-collar-coach-jacket', 'Contrast Faux Leather Collar Coach Jacket', 'Contrast Faux Leather Collar Coach Jacket', 'Cut in polyester with a regular fit, a jacket built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-JKT-011-OLI-L', '2000000000978') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-JKT-011-OLI-XL', '2000000000985') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OLI', 'Olive', 'زيتي', 'BW-JKT-011-OLI-XXL', '2000000000992') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-harrington-jacket', 'Corduroy Harrington Jacket', 'Corduroy Harrington Jacket', 'Cut in velvet with an oversized fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6500,
          'Velvet', 'Oversized', array['jackets','jacket','oversized','velvet','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-JKT-012-BEI-L', '2000000001005') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-012-BEI-S', '2000000001012') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-jacket-with-fireman-clasps', 'Corduroy Jacket with Fireman Clasps', 'Corduroy Jacket with Fireman Clasps', 'A jacket with quiet intent — cut in velvet with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 12900,
          'Velvet', 'Oversized', array['jackets','jacket','oversized','velvet','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-013-BLA-S', '2000000001029') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-jacket-with-hood-and-fireman-clasps', 'Corduroy Jacket with Hood and Fireman Clasps', 'Corduroy Jacket with Hood and Fireman Clasps', 'A jacket with quiet intent — cut in velvet with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 12900,
          'Velvet', 'Oversized', array['jackets','jacket','oversized','velvet','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JKT-014-BRO-M', '2000000001036') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cropped-faux-leather-jacket', 'Cropped Faux Leather Jacket', 'Cropped Faux Leather Jacket', 'A jacket with quiet intent — cut in leather with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Leather', 'Regular fit', array['jackets','jacket','regular fit','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-015-BLA-L', '2000000001043') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-015-BLA-S', '2000000001050') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cropped-fit-striped-fireman-clasps-jacket', 'Cropped Fit Striped Fireman Clasps Jacket', 'Cropped Fit Striped Fireman Clasps Jacket', 'A jacket with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Cotton', 'Oversized', array['jackets','jacket','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-JKT-016-WHI-S', '2000000001067') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('diagonal-twill-zip-jacket', 'Diagonal Twill Zip Jacket', 'Diagonal Twill Zip Jacket', 'Cut in polyester with a regular fit, a jacket built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-017-DGR-S', '2000000001074') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('diamond-quilted-bomber-jacket', 'Diamond Quilted Bomber Jacket', 'Diamond Quilted Bomber Jacket', 'Cut in cotton blend with a regular fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5900,
          'Cotton Blend', 'Regular fit', array['jackets','jacket','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-JKT-018-GRA-L', '2000000001081') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-JKT-018-GRA-M', '2000000001098') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('distressed-leather-zip-up-jacket', 'Distressed Leather Zip-up Jacket', 'Distressed Leather Zip-up Jacket', 'Considered lines, clean finish. Cut in leather with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-JKT-019-BLA-M', '2000000001104') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('embossed-faux-leather-bomber-jacket-ford', 'Embossed Faux Leather Bomber Jacket Ford', 'Embossed Faux Leather Bomber Jacket Ford', 'Cut in leather with an oversized fit, a jacket built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JKT-020-BRO-M', '2000000001111') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('embroidered-faux-leather-jacket', 'Embroidered Faux Leather Jacket', 'Embroidered Faux Leather Jacket', 'A jacket with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 8900,
          'Cotton', 'Oversized', array['jackets','jacket','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BUR', 'Burgundy', 'خمري', 'BW-JKT-021-BUR-XXL', '2000000001128') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('faded-wash-denim-jacket', 'Faded Wash Denim Jacket', 'Faded Wash Denim Jacket', 'Cut in denim with a slim fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Denim', 'Slim fit', array['jackets','jacket','slim fit','denim','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-JKT-022-BRO-L', '2000000001135') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-022-BRO-S', '2000000001142') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-JKT-022-BRO-XL', '2000000001159') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('faux-leather-bomber-jacket', 'Faux Leather Bomber Jacket', 'Faux Leather Bomber Jacket', 'Considered lines, clean finish. Cut in faux leather with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Faux Leather', 'Regular fit', array['jackets','jacket','regular fit','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-JKT-023-OLI-L', '2000000001166') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('faux-leather-zip-up-jacket', 'Faux Leather Zip-up Jacket', 'Faux Leather Zip-up Jacket', 'A jacket with quiet intent — cut in leather with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-024-BLA-S', '2000000001173') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('grain-leather-bomber-jacket', 'Grain Leather Bomber Jacket', 'Grain Leather Bomber Jacket', 'Cut in leather with an oversized fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JKT-025-BRO-M', '2000000001180') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-025-BRO-S', '2000000001197') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('herringbone-utility-zip-jacket', 'Herringbone Utility Zip Jacket', 'Herringbone Utility Zip Jacket', 'A jacket with quiet intent — cut in polyester with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-026-DGR-L', '2000000001203') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-026-LGR-XL', '2000000001210') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('leather-bomber-jacket-with-ribbed-hem', 'Leather Bomber Jacket with Ribbed Hem', 'Leather Bomber Jacket with Ribbed Hem', 'A jacket with quiet intent — cut in leather with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Leather', 'Regular fit', array['jackets','jacket','regular fit','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-027-BLA-S', '2000000001227') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('leather-effect-jacket-with-detachable-collar', 'Leather Effect Jacket with Detachable Collar', 'Leather Effect Jacket with Detachable Collar', 'Considered lines, clean finish. Cut in leather with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 12900,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JKT-028-BRO-M', '2000000001234') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('leather-effect-jacket-with-fireman-clasps', 'Leather Effect Jacket with Fireman Clasps', 'Leather Effect Jacket with Fireman Clasps', 'Considered lines, clean finish. Cut in leather with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 12900,
          'Leather', 'Regular fit', array['jackets','jacket','regular fit','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-029-BLA-S', '2000000001241') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('leather-overshirt-jacket', 'Leather Overshirt Jacket', 'Leather Overshirt Jacket', 'Cut in leather with an oversized fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-JKT-030-OLI-M', '2000000001258') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('minimal-button-up-jacket', 'Minimal Button-up Jacket', 'Minimal Button-up Jacket', 'Considered lines, clean finish. Cut in polyester with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5500,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-JKT-031-NAV-L', '2000000001265') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-JKT-031-NAV-M', '2000000001272') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-031-BLA-S', '2000000001289') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-JKT-031-BLA-XL', '2000000001296') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-031-LGR-XL', '2000000001302') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('minimal-zip-up-jacket', 'Minimal Zip-up Jacket', 'Minimal Zip-up Jacket', 'A jacket with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Cotton Blend', 'Regular fit', array['jackets','jacket','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-032-BLA-L', '2000000001319') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-JKT-032-BLA-M', '2000000001326') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-032-BLA-S', '2000000001333') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-JKT-032-NAV-M', '2000000001340') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-JKT-032-NAV-S', '2000000001357') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-JKT-032-BEI-XL', '2000000001364') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-zip-up-jacket', 'Ribbed Zip-up Jacket', 'Ribbed Zip-up Jacket', 'Considered lines, clean finish. Cut in polyester with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5500,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-033-LGR-L', '2000000001371') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-033-LGR-S', '2000000001388') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-033-LGR-XL', '2000000001395') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-JKT-033-BEI-L', '2000000001401') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-JKT-033-BEI-M', '2000000001418') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-033-BEI-S', '2000000001425') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-JKT-033-BRO-L', '2000000001432') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-033-BRO-S', '2000000001449') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-JKT-033-BRO-XL', '2000000001456') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('rushed-sleeve-bomber-jacket', 'Ruched Sleeve Bomber Jacket', 'Ruched Sleeve Bomber Jacket', 'Cut in cotton blend with a slim fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Cotton Blend', 'Slim fit', array['jackets','jacket','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-JKT-034-BLA-M', '2000000001463') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-034-BLA-S', '2000000001470') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('shearling-collar-leather-jacket', 'Shearling Collar Leather Jacket', 'Shearling Collar Leather Jacket', 'Cut in faux leather with a regular fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Faux Leather', 'Regular fit', array['jackets','jacket','regular fit','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-035-BEI-S', '2000000001487') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-JKT-035-BEI-XL', '2000000001494') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('shearling-trim-aviator-jacket', 'Shearling Trim Aviator Jacket', 'Shearling Trim Aviator Jacket', 'A jacket with quiet intent — cut in faux fur with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Faux Fur', 'Slim fit', array['jackets','jacket','slim fit','faux fur','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-036-DGR-S', '2000000001500') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('suede-effect-chore-jacket', 'Suede-effect Chore Jacket', 'Suede-effect Chore Jacket', 'Considered lines, clean finish. Cut in polyester with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-037-BLA-L', '2000000001517') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-JKT-037-BLA-M', '2000000001524') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JKT-037-BLA-S', '2000000001531') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-JKT-037-NAV-L', '2000000001548') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-JKT-037-NAV-S', '2000000001555') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-JKT-037-NAV-XL', '2000000001562') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-037-DGR-L', '2000000001579') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-037-DGR-S', '2000000001586') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-037-DGR-XL', '2000000001593') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('suede-effect-zip-jacket', 'Suede-effect Zip Jacket', 'Suede-effect Zip Jacket', 'A jacket with quiet intent — cut in polyester with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-JKT-038-BLA-XL', '2000000001609') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-knit-overshirt', 'Textured Knit Overshirt', 'Textured Knit Overshirt', 'Cut in cotton blend with a regular fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5500,
          'Cotton Blend', 'Regular fit', array['jackets','jacket','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-039-BLA-L', '2000000001616') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-039-DGR-M', '2000000001623') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-JKT-039-DGR-S', '2000000001630') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-moto-jacket', 'Textured Moto Jacket', 'Textured Moto Jacket', 'A jacket with quiet intent — cut in polyester with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6500,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-040-LGR-M', '2000000001647') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-JKT-040-LGR-S', '2000000001654') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-JKT-040-BLA-L', '2000000001661') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-JKT-040-BLA-XL', '2000000001678') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-JKT-040-BEI-L', '2000000001685') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-040-BEI-S', '2000000001692') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-JKT-040-BEI-XL', '2000000001708') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-stripe-zip-up-jacket', 'Textured Stripe Zip-up Jacket', 'Textured Stripe Zip-up Jacket', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5500,
          'Cotton Blend', 'Regular fit', array['jackets','jacket','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-JKT-041-NAV-L', '2000000001715') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-JKT-041-NAV-M', '2000000001722') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-JKT-041-NAV-S', '2000000001739') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-JKT-041-NAV-XL', '2000000001746') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-JKT-041-BEI-L', '2000000001753') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-JKT-041-BEI-M', '2000000001760') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-JKT-041-BEI-S', '2000000001777') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-JKT-041-BEI-XL', '2000000001784') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('utility-puffer-jacket', 'Utility Puffer Jacket', 'Utility Puffer Jacket', 'A jacket with quiet intent — cut in polyester with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 5900,
          'Polyester', 'Regular fit', array['jackets','jacket','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-JKT-042-WHI-XL', '2000000001791') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('utility-zip-jacket', 'Utility Zip Jacket', 'Utility Zip Jacket', 'Cut in cotton with a regular fit. The kind of jacket that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 7500,
          'Cotton', 'Regular fit', array['jackets','jacket','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-JKT-043-OWH-XL', '2000000001807') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-JKT-043-MIN-L', '2000000001814') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-JKT-043-MIN-M', '2000000001821') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'MIN', 'Mint', 'مينت', 'BW-JKT-043-MIN-S', '2000000001838') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-JKT-043-OLI-L', '2000000001845') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-JKT-043-OLI-XL', '2000000001852') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-leather-utility-jacket', 'Vintage Leather Utility Jacket', 'Vintage Leather Utility Jacket', 'A jacket with quiet intent — cut in leather with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 11000,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-JKT-044-BUR-L', '2000000001869') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BUR', 'Burgundy', 'خمري', 'BW-JKT-044-BUR-S', '2000000001876') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-stand-collar-leather-jacket', 'Vintage Stand Collar Leather Jacket', 'Vintage Stand Collar Leather Jacket', 'A jacket with quiet intent — cut in faux leather with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 8900,
          'Faux Leather', 'Oversized', array['jackets','jacket','oversized','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-JKT-045-CAM-M', '2000000001883') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-trucker-leather-jacket', 'Vintage Trucker Leather Jacket', 'Vintage Trucker Leather Jacket', 'A jacket with quiet intent — cut in faux leather with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 8900,
          'Faux Leather', 'Oversized', array['jackets','jacket','oversized','faux leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-JKT-046-BLA-XL', '2000000001890') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-JKT-046-BLA-XXL', '2000000001906') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-JKT-046-CAM-S', '2000000001913') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-wash-denim-jacket', 'Vintage Wash Denim Jacket', 'Vintage Wash Denim Jacket', 'Considered lines, clean finish. Cut in denim with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 6900,
          'Denim', 'Slim fit', array['jackets','jacket','slim fit','denim','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-047-BRO-S', '2000000001920') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-faux-suede-jacket', 'Washed Faux Suede Jacket', 'Washed Faux Suede Jacket', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Cotton', 'Oversized', array['jackets','jacket','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRE', 'Grey', 'رمادي', 'BW-JKT-048-GRE-L', '2000000001937') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-leather-effect-jacket', 'Washed Leather Effect Jacket', 'Washed Leather Effect Jacket', 'Cut in leather with an oversized fit, a jacket built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JKT'), 9500,
          'Leather', 'Oversized', array['jackets','jacket','oversized','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-JKT-049-BRO-S', '2000000001944') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-jogger-sweatpants', 'Classic Jogger Sweatpants', 'Classic Jogger Sweatpants', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JOG'), 3500,
          'Cotton', 'Slim fit', array['joggers','joggers','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-JOG-001-GRA-L', '2000000001951') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-JOG-001-GRA-S', '2000000001968') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('piped-jogger-sweatpants', 'Piped Jogger Sweatpants', 'Piped Jogger Sweatpants', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JOG'), 3500,
          'Cotton', 'Slim fit', array['joggers','joggers','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-JOG-002-CAM-L', '2000000001975') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('varsity-logo-jogger-sweatpants', 'Varsity Logo Jogger Sweatpants', 'Varsity Logo Jogger Sweatpants', 'Cut in cotton with a slim fit. The kind of joggers that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JOG'), 3500,
          'Cotton', 'Slim fit', array['joggers','joggers','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-JOG-003-BLA-S', '2000000001982') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-JOG-003-WHI-M', '2000000001999') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-JOG-003-OWH-S', '2000000002002') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-wide-leg-sweatpants', 'Washed Wide-leg Sweatpants', 'Washed Wide-leg Sweatpants', 'A joggers with quiet intent — cut in cotton with a baggy fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JOG'), 4900,
          'Cotton', 'Baggy fit', array['joggers','joggers','baggy fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-JOG-004-BEI-XL', '2000000002019') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-leg-sweatpants', 'Wide-leg Sweatpants', 'Wide-leg Sweatpants', 'Cut in cotton with a baggy fit, a joggers built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'JOG'), 4500,
          'Cotton', 'Baggy fit', array['joggers','joggers','baggy fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-JOG-005-BRO-L', '2000000002026') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-JOG-005-BRO-M', '2000000002033') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chunky-ribbed-button-cardigan', 'Chunky Ribbed Button Cardigan', 'Chunky Ribbed Button Cardigan', 'Cut in wool blend with an oversized fit, a cardigan built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'KNT'), 5500,
          'Wool Blend', 'Oversized', array['cardigans','cardigan','oversized','wool blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-KNT-001-OWH-L', '2000000002040') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-KNT-001-OWH-XL', '2000000002057') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-KNT-001-BRO-L', '2000000002064') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-KNT-001-BRO-M', '2000000002071') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-KNT-001-BRO-XL', '2000000002088') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('open-knit-collar-cardigan', 'Open-knit Collar Cardigan', 'Open-knit Collar Cardigan', 'Cut in wool blend with an oversized fit, a cardigan built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'KNT'), 5500,
          'Wool Blend', 'Oversized', array['cardigans','cardigan','oversized','wool blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-KNT-002-BLA-M', '2000000002095') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'YEL', 'Yellow', 'أصفر', 'BW-KNT-002-YEL-XL', '2000000002101') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-full-zip-knit-cardigan', 'Ribbed Full-zip Knit Cardigan', 'Ribbed Full-zip Knit Cardigan', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'KNT'), 5500,
          'Cotton Blend', 'Regular fit', array['cardigans','cardigan','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-KNT-003-BLU-M', '2000000002118') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-polo-cardigan', 'Ribbed Polo Cardigan', 'Ribbed Polo Cardigan', 'A cardigan with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'KNT'), 5500,
          'Cotton Blend', 'Regular fit', array['cardigans','cardigan','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'YEL', 'Yellow', 'أصفر', 'BW-KNT-004-YEL-XL', '2000000002125') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('aztec-pattern-overshirt', 'Aztec Pattern Overshirt', 'Aztec Pattern Overshirt', 'Cut in cotton with a regular fit, an overshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 3900,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLB', 'Blue/Yellow', 'أزرق, أصفر', 'BW-OVS-001-BLB-L', '2000000002132') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLB', 'Blue/Yellow', 'أزرق, أصفر', 'BW-OVS-001-BLB-M', '2000000002149') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLB', 'Blue/Yellow', 'أزرق, أصفر', 'BW-OVS-001-BLB-S', '2000000002156') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('bold-colour-block-overshirt', 'Bold Colour Block Overshirt', 'Bold Colour Block Overshirt', 'An overshirt with quiet intent — cut in cotton with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 3900,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRB', 'Grey/Blue', 'رمادي, أزرق', 'BW-OVS-002-GRB-L', '2000000002163') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRB', 'Grey/Blue', 'رمادي, أزرق', 'BW-OVS-002-GRB-M', '2000000002170') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BYE', 'Black/Yellow', 'أسود, أصفر', 'BW-OVS-002-BYE-S', '2000000002187') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLG', 'Orange/Light Grey', 'برتقالي, رمادي فاتح', 'BW-OVS-002-OLG-L', '2000000002194') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('brushed-overshirt', 'Brushed Overshirt', 'Brushed Overshirt', 'Cut in cotton blend with a regular fit. The kind of overshirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Cotton Blend', 'Regular fit', array['shirts','overshirt','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-OVS-003-BEI-L', '2000000002200') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-OVS-003-BEI-M', '2000000002217') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-003-LBL-L', '2000000002224') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-003-LBL-M', '2000000002231') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-003-LBL-S', '2000000002248') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-003-LBL-XL', '2000000002255') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-OVS-003-GRA-L', '2000000002262') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-OVS-003-NAV-L', '2000000002279') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-OVS-003-NAV-M', '2000000002286') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-OVS-003-NAV-S', '2000000002293') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-OVS-003-NAV-XL', '2000000002309') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('brushed-wool-effect-overshirt', 'Brushed Wool-effect Overshirt', 'Brushed Wool-effect Overshirt', 'Cut in wool with an oversized fit, an overshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Wool', 'Oversized', array['shirts','overshirt','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-OVS-004-CAM-L', '2000000002316') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-button-up-overshirt', 'Corduroy Button-up Overshirt', 'Corduroy Button-up Overshirt', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Cotton Blend', 'Regular fit', array['shirts','overshirt','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-OVS-005-BRO-L', '2000000002323') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-OVS-005-OLI-L', '2000000002330') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-OVS-005-OLI-M', '2000000002347') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-OVS-005-OLI-XL', '2000000002354') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-OVS-005-GRA-L', '2000000002361') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-OVS-005-GRA-M', '2000000002378') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-OVS-005-GRA-S', '2000000002385') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-005-LBL-L', '2000000002392') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-005-LBL-M', '2000000002408') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-OVS-005-BEI-L', '2000000002415') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-OVS-005-BEI-M', '2000000002422') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-OVS-005-MIN-L', '2000000002439') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-OVS-005-MIN-M', '2000000002446') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('desert-geo-overshirt', 'Desert Geo Overshirt', 'Desert Geo Overshirt', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 3900,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WDG', 'White/Dark Grey', 'أبيض, رمادي غامق', 'BW-OVS-006-WDG-L', '2000000002453') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WDG', 'White/Dark Grey', 'أبيض, رمادي غامق', 'BW-OVS-006-WDG-M', '2000000002460') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BGR', 'Black/Green', 'أسود, أخضر', 'BW-OVS-006-BGR-L', '2000000002477') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BGR', 'Black/Green', 'أسود, أخضر', 'BW-OVS-006-BGR-M', '2000000002484') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('double-pocket-denim-overshirt', 'Double Pocket Denim Overshirt', 'Double Pocket Denim Overshirt', 'Cut in denim with a regular fit. The kind of overshirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Denim', 'Regular fit', array['shirts','overshirt','regular fit','denim','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-OVS-007-BLA-L', '2000000002491') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-OVS-007-BLA-M', '2000000002507') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-OVS-007-BLA-XL', '2000000002514') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-OVS-007-BLA-XXL', '2000000002521') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-007-OWH-L', '2000000002538') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-007-OWH-M', '2000000002545') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-007-OWH-S', '2000000002552') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-007-OWH-XL', '2000000002569') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-007-OWH-XXL', '2000000002576') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-OVS-007-BEI-M', '2000000002583') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BEI', 'Beige', 'بيج', 'BW-OVS-007-BEI-XXL', '2000000002590') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-OVS-007-OLI-M', '2000000002606') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-OVS-007-OLI-S', '2000000002613') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-OVS-007-OLI-XL', '2000000002620') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OLI', 'Olive', 'زيتي', 'BW-OVS-007-OLI-XXL', '2000000002637') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-007-LBL-L', '2000000002644') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-007-LBL-M', '2000000002651') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-007-LBL-XL', '2000000002668') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-OVS-007-LBL-XXL', '2000000002675') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('double-pocket-snap-button-overshirt', 'Double Pocket Snap-button Overshirt', 'Double Pocket Snap-button Overshirt', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Cotton Blend', 'Oversized', array['shirts','overshirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-OVS-008-BLU-L', '2000000002682') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-OVS-008-BLU-M', '2000000002699') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-OVS-008-BLU-S', '2000000002705') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-OVS-008-DGR-M', '2000000002712') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fully-mohair-effect-overshirt', 'Fully Mohair-effect Overshirt', 'Fully Mohair-effect Overshirt', 'Cut in polyester with a regular fit, an overshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 6500,
          'Polyester', 'Regular fit', array['shirts','overshirt','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-009-OWH-M', '2000000002729') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-009-OWH-S', '2000000002736') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-009-OWH-XL', '2000000002743') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-OVS-009-BRO-L', '2000000002750') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-OVS-009-BRO-M', '2000000002767') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-OVS-009-BRO-S', '2000000002774') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('haigland-tartan-overshirt', 'Highland Tartan Overshirt', 'Highland Tartan Overshirt', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'ORE', 'Olive/Red', 'زيتي, أحمر', 'BW-OVS-010-ORE-S', '2000000002781') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'ORE', 'Olive/Red', 'زيتي, أحمر', 'BW-OVS-010-ORE-XL', '2000000002798') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('heritage-tartan-overshirt', 'Heritage Tartan Overshirt', 'Heritage Tartan Overshirt', 'Cut in cotton with a regular fit. The kind of overshirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 3900,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NYE', 'Navy/Yellow', 'كحلي, أصفر', 'BW-OVS-011-NYE-M', '2000000002804') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NYE', 'Navy/Yellow', 'كحلي, أصفر', 'BW-OVS-011-NYE-S', '2000000002811') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('minimal-wool-feel-overshirt', 'Minimal Wool-feel Overshirt', 'Minimal Wool-feel Overshirt', 'Cut in cotton blend with an oversized fit, an overshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Cotton Blend', 'Oversized', array['shirts','overshirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-OVS-012-BLA-L', '2000000002828') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-OVS-012-BLA-M', '2000000002835') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-OVS-012-BLA-XL', '2000000002842') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-OVS-012-NAV-XL', '2000000002859') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('oversized-plaid-wool-blend-overshirt', 'Oversized Plaid Wool-blend Overshirt', 'Oversized Plaid Wool-blend Overshirt', 'An overshirt with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Cotton Blend', 'Oversized', array['shirts','overshirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-013-OWH-L', '2000000002866') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-013-OWH-XL', '2000000002873') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-OVS-013-BRO-L', '2000000002880') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CGR', 'Camel/Green', 'كاميل, أخضر', 'BW-OVS-013-CGR-M', '2000000002897') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('oversized-twill-overshirt', 'Oversized Twill Overshirt', 'Oversized Twill Overshirt', 'An overshirt with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Cotton Blend', 'Oversized', array['shirts','overshirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-OVS-014-BLA-L', '2000000002903') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-OVS-014-BLA-M', '2000000002910') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('oxford-check-overshirt', 'Oxford Check Overshirt', 'Oxford Check Overshirt', 'An overshirt with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Cotton', 'Oversized', array['shirts','overshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BBL', 'Beige/Blue', 'بيج, أزرق', 'BW-OVS-015-BBL-XL', '2000000002927') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLC', 'Blue/Beige', 'أزرق, بيج', 'BW-OVS-015-BLC-L', '2000000002934') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pinstripe-utility-overshirt', 'Pinstripe Utility Overshirt', 'Pinstripe Utility Overshirt', 'Considered lines, clean finish. Cut in polyester with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Polyester', 'Regular fit', array['shirts','overshirt','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-OVS-016-BLA-S', '2000000002941') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-OVS-016-WHI-S', '2000000002958') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-OVS-016-WHI-XL', '2000000002965') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-OVS-016-NAV-XL', '2000000002972') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('polar-fleece-overshirt', 'Polar Fleece Overshirt', 'Polar Fleece Overshirt', 'An overshirt with quiet intent — cut in polyester with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Polyester', 'Oversized', array['shirts','overshirt','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-OVS-017-BEI-M', '2000000002989') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-OVS-017-BEI-S', '2000000002996') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-OVS-017-OLI-L', '2000000003009') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-OVS-017-OLI-M', '2000000003016') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-OVS-017-OLI-S', '2000000003023') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-OVS-017-DGR-M', '2000000003030') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-OVS-017-DGR-S', '2000000003047') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-OVS-017-CAM-XL', '2000000003054') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('polar-fleece-overshirt-with-pocket', 'Polar Fleece Overshirt with Pocket', 'Polar Fleece Overshirt with Pocket', 'Considered lines, clean finish. Cut in polyester with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 5500,
          'Polyester', 'Oversized', array['shirts','overshirt','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-018-OWH-L', '2000000003061') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-OVS-018-OWH-M', '2000000003078') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-double-pocket-overshirt-deep-blue', 'Ribbed Double Pocket Overshirt Deep Blue', 'Ribbed Double Pocket Overshirt Deep Blue', 'Cut in polyester with an oversized fit, an overshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 4500,
          'Polyester', 'Oversized', array['shirts','overshirt','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-OVS-019-BLU-L', '2000000003085') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('tribal-stripe-overshirt', 'Tribal Stripe Overshirt', 'Tribal Stripe Overshirt', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'OVS'), 3900,
          'Cotton', 'Regular fit', array['shirts','overshirt','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'YDG', 'Yellow/Dark Grey', 'أصفر, رمادي غامق', 'BW-OVS-020-YDG-L', '2000000003092') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'YDG', 'Yellow/Dark Grey', 'أصفر, رمادي غامق', 'BW-OVS-020-YDG-M', '2000000003108') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'YDG', 'Yellow/Dark Grey', 'أصفر, رمادي غامق', 'BW-OVS-020-YDG-S', '2000000003115') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LIG', 'Light Grey/Blue', 'رمادي فاتح, أزرق', 'BW-OVS-020-LIG-L', '2000000003122') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LIG', 'Light Grey/Blue', 'رمادي فاتح, أزرق', 'BW-OVS-020-LIG-M', '2000000003139') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-collar-ribbed-knit-polo', 'Contrast Collar Ribbed Knit Polo', 'Contrast Collar Ribbed Knit Polo', 'A polo with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton Blend', 'Slim fit', array['polos','polo','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-PLO-001-WHI-L', '2000000003146') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PLO-001-WHI-M', '2000000003153') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-PLO-001-WHI-S', '2000000003160') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-PLO-001-WHI-XL', '2000000003177') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'WHI', 'White', 'أبيض', 'BW-PLO-001-WHI-XXL', '2000000003184') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-PLO-001-NAV-L', '2000000003191') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PLO-001-NAV-M', '2000000003207') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-PLO-001-NAV-S', '2000000003214') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-PLO-001-NAV-XL', '2000000003221') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-PLO-001-NAV-XXL', '2000000003238') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-PLO-001-BRO-M', '2000000003245') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-PLO-001-BRO-XL', '2000000003252') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-PLO-001-BRO-XXL', '2000000003269') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-stitch-pocket-knit-polo', 'Contrast Stitch Pocket Knit Polo', 'Contrast Stitch Pocket Knit Polo', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton Blend', 'Slim fit', array['polos','polo','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-PLO-002-BLA-L', '2000000003276') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PLO-002-BLA-M', '2000000003283') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-PLO-002-BLA-S', '2000000003290') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-PLO-002-BLA-XL', '2000000003306') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-PLO-002-BLA-XXL', '2000000003313') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-PLO-002-WHI-L', '2000000003320') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PLO-002-WHI-M', '2000000003337') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-PLO-002-WHI-S', '2000000003344') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-PLO-002-WHI-XL', '2000000003351') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'WHI', 'White', 'أبيض', 'BW-PLO-002-WHI-XXL', '2000000003368') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('long-sleeve-knit-polo', 'Long-sleeve Knit Polo', 'Long-sleeve Knit Polo', 'Cut in wool with a regular fit, a polo built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Wool', 'Regular fit', array['polos','polo','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-PLO-003-WHI-L', '2000000003375') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PLO-003-WHI-M', '2000000003382') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-PLO-003-BEI-L', '2000000003399') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-PLO-003-BEI-M', '2000000003405') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-PLO-003-NAV-L', '2000000003412') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PLO-003-NAV-M', '2000000003429') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-PLO-003-NAV-S', '2000000003436') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-PLO-003-NAV-XL', '2000000003443') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-PLO-003-DGR-M', '2000000003450') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PLO-003-BLA-M', '2000000003467') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-PLO-003-BRO-M', '2000000003474') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('quarter-zip-polo-sweatshirt', 'Quarter-Zip Polo Sweatshirt', 'Quarter-Zip Polo Sweatshirt', 'Cut in cotton with an oversized fit. The kind of polo that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Oversized', array['polos','polo','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-PLO-004-BRO-L', '2000000003481') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-PLO-004-BRO-M', '2000000003498') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-PLO-004-BRO-XL', '2000000003504') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-PLO-004-OLI-L', '2000000003511') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-PLO-004-OLI-M', '2000000003528') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-PLO-004-NAV-L', '2000000003535') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PLO-004-NAV-M', '2000000003542') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-PLO-004-NAV-S', '2000000003559') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-PLO-004-NAV-XL', '2000000003566') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-half-zip-long-sleeve-polo', 'Ribbed Half-Zip Long Sleeve Polo', 'Ribbed Half-Zip Long Sleeve Polo', 'Cut in cotton with a slim fit, a polo built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Slim fit', array['polos','polo','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-PLO-005-BLA-L', '2000000003573') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PLO-005-BLA-M', '2000000003580') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-PLO-005-BLA-S', '2000000003597') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-PLO-005-BLA-XL', '2000000003603') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-long-sleeve-polo', 'Ribbed Knit Long Sleeve Polo', 'Ribbed Knit Long Sleeve Polo', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Slim fit', array['polos','polo','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-PLO-006-OLI-L', '2000000003610') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-PLO-006-OLI-M', '2000000003627') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PLO-006-WHI-M', '2000000003634') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-PLO-006-WHI-S', '2000000003641') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-006-LGR-L', '2000000003658') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-006-LGR-S', '2000000003665') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-PLO-006-BRO-M', '2000000003672') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-open-collar-long-sleeve-polo', 'Ribbed Open Collar Long Sleeve Polo', 'Ribbed Open Collar Long Sleeve Polo', 'A polo with quiet intent — cut in cotton with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Slim fit', array['polos','polo','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-PLO-007-BLA-L', '2000000003689') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PLO-007-BLA-M', '2000000003696') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-PLO-007-BLA-S', '2000000003702') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-PLO-007-BLA-XL', '2000000003719') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-knit-zip-polo', 'Textured Knit Zip Polo', 'Textured Knit Zip Polo', 'Considered lines, clean finish. Cut in wool with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 4500,
          'Wool', 'Oversized', array['polos','polo','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-PLO-008-WHI-XL', '2000000003726') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vertical-rib-open-collar-polo', 'Vertical Rib Open Collar Polo', 'Vertical Rib Open Collar Polo', 'Cut in cotton with a slim fit, a polo built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Slim fit', array['polos','polo','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-PLO-009-WHI-L', '2000000003733') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PLO-009-WHI-M', '2000000003740') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-PLO-009-WHI-S', '2000000003757') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-PLO-009-WHI-XL', '2000000003764') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vertical-stripe-terry-polo', 'Vertical Stripe Terry Polo', 'Vertical Stripe Terry Polo', 'Cut in cotton with an oversized fit. The kind of polo that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Oversized', array['polos','polo','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGB', 'Light Grey/Black', 'رمادي فاتح, أسود', 'BW-PLO-010-LGB-M', '2000000003771') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGM', 'Light Grey/Mint', 'رمادي فاتح, مينت', 'BW-PLO-010-LGM-M', '2000000003788') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGM', 'Light Grey/Mint', 'رمادي فاتح, مينت', 'BW-PLO-010-LGM-S', '2000000003795') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('waffle-textured-open-collar-polo', 'Waffle Textured Open Collar Polo', 'Waffle Textured Open Collar Polo', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PLO'), 3900,
          'Cotton', 'Slim fit', array['polos','polo','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-011-LGR-L', '2000000003801') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-011-LGR-M', '2000000003818') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-011-LGR-S', '2000000003825') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-PLO-011-LGR-XL', '2000000003832') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('belted-corduroy-trousers', 'Belted Corduroy Trousers', 'Belted Corduroy Trousers', 'Considered lines, clean finish. Cut in velvet with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Velvet', 'Regular fit', array['trousers','trousers','regular fit','velvet','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PNT-001-BLA-M', '2000000003849') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-PNT-001-CAM-S', '2000000003856') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pleated-wide-leg-corduroy-trousers', 'Pleated Wide-leg Corduroy Trousers', 'Pleated Wide-leg Corduroy Trousers', 'Considered lines, clean finish. Cut in cotton blend with a baggy fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Cotton Blend', 'Baggy fit', array['trousers','trousers','baggy fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PNT-002-NAV-M', '2000000003863') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-PNT-002-NAV-XXL', '2000000003870') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-PNT-002-OLI-M', '2000000003887') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-PNT-002-OLI-S', '2000000003894') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OLI', 'Olive', 'زيتي', 'BW-PNT-002-OLI-XXL', '2000000003900') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-PNT-002-BEI-M', '2000000003917') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-PNT-002-BEI-XL', '2000000003924') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('suede-panel-wide-leg-pants', 'Suede Panel Wide-leg Pants', 'Suede Panel Wide-leg Pants', 'Cut in polyester with a regular fit. The kind of trousers that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Polyester', 'Regular fit', array['trousers','trousers','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-PNT-003-BLU-L', '2000000003931') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-PNT-003-BLU-M', '2000000003948') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-PNT-003-BLU-S', '2000000003955') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-stripe-drawstring-trousers', 'Textured Stripe Drawstring Trousers', 'Textured Stripe Drawstring Trousers', 'A trousers with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Cotton Blend', 'Regular fit', array['trousers','trousers','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-PNT-004-NAV-L', '2000000003962') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PNT-004-NAV-M', '2000000003979') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-PNT-004-NAV-S', '2000000003986') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-PNT-004-NAV-XL', '2000000003993') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-PNT-004-BEI-L', '2000000004006') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-PNT-004-BEI-M', '2000000004013') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-PNT-004-BEI-S', '2000000004020') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-PNT-004-BEI-XL', '2000000004037') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-leg-corduroy-trousers', 'Wide-leg Corduroy Trousers', 'Wide-leg Corduroy Trousers', 'A trousers with quiet intent — cut in polyester with a baggy fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Polyester', 'Baggy fit', array['trousers','trousers','baggy fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-PNT-005-BRO-L', '2000000004044') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-PNT-005-BRO-M', '2000000004051') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-PNT-005-BRO-S', '2000000004068') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-PNT-005-BRO-XL', '2000000004075') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-PNT-005-OLI-L', '2000000004082') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-PNT-005-OLI-M', '2000000004099') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-PNT-005-OLI-S', '2000000004105') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-PNT-005-OLI-XL', '2000000004112') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-PNT-005-BLA-S', '2000000004129') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-PNT-005-BLA-XL', '2000000004136') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-PNT-005-WHI-M', '2000000004143') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-PNT-005-WHI-S', '2000000004150') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-PNT-005-WHI-XL', '2000000004167') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-PNT-005-NAV-L', '2000000004174') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-PNT-005-NAV-M', '2000000004181') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-PNT-005-NAV-S', '2000000004198') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-leg-polar-trousers', 'Wide-leg Polar Trousers', 'Wide-leg Polar Trousers', 'Cut in cotton with a baggy fit, a trousers built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'PNT'), 5500,
          'Cotton', 'Baggy fit', array['trousers','trousers','baggy fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-PNT-006-CAM-XL', '2000000004204') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-PNT-006-BLA-L', '2000000004211') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-PNT-006-BLA-M', '2000000004228') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-PNT-006-BLA-XL', '2000000004235') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('faux-leather-westren-shirt-jacket', 'Faux Leather Western Shirt Jacket', 'Faux Leather Western Shirt Jacket', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SH'), 5500,
          'Cotton Blend', 'Slim fit', array['shirts','shirt','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SH-001-BLA-M', '2000000004242') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SH-001-BLA-S', '2000000004259') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('oversized-denim-shirt', 'Oversized Denim Shirt', 'Oversized Denim Shirt', 'Cut in cotton with an oversized fit. The kind of shirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SH'), 5500,
          'Cotton', 'Oversized', array['shirts','shirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SH-002-NAV-L', '2000000004266') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SH-002-NAV-M', '2000000004273') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SH-002-NAV-XL', '2000000004280') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('suede-effect-button-up-shirt', 'Suede-effect Button-up Shirt', 'Suede-effect Button-up Shirt', 'Cut in polyester with an oversized fit. The kind of shirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SH'), 5500,
          'Polyester', 'Oversized', array['shirts','shirt','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BUR', 'Burgundy', 'خمري', 'BW-SH-003-BUR-M', '2000000004297') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BUR', 'Burgundy', 'خمري', 'BW-SH-003-BUR-S', '2000000004303') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SH-003-BLA-M', '2000000004310') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SH-003-BLA-S', '2000000004327') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SH-003-BEI-L', '2000000004334') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SH-003-BEI-M', '2000000004341') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SH-003-BEI-S', '2000000004358') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SH-003-BRO-M', '2000000004365') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-wale-corduroy-button-up-shirt', 'Wide-wale Corduroy Button-up Shirt', 'Wide-wale Corduroy Button-up Shirt', 'Cut in cotton blend with an oversized fit. The kind of shirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SH'), 4500,
          'Cotton Blend', 'Oversized', array['shirts','shirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SH-004-BLA-L', '2000000004372') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SH-004-BLA-M', '2000000004389') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SH-004-LGR-L', '2000000004396') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SH-004-LGR-M', '2000000004402') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SH-004-LGR-XL', '2000000004419') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SH-004-WHI-L', '2000000004426') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SH-004-WHI-M', '2000000004433') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SH-004-WHI-XL', '2000000004440') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SH-004-BRO-L', '2000000004457') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SH-004-BRO-M', '2000000004464') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SH-004-BRO-S', '2000000004471') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-SH-004-BRO-XL', '2000000004488') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-SH-004-OLI-L', '2000000004495') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SH-004-OLI-M', '2000000004501') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SH-004-NAV-L', '2000000004518') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SH-004-NAV-M', '2000000004525') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SH-004-NAV-S', '2000000004532') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chunky-lace-up-chukka-boots', 'Chunky Lace-up Chukka Boots', 'Chunky Lace-up Chukka Boots', 'Quiet and considered, crafted in leather — the BACH way to finish an outfit. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'CAM', 'Camel', 'كاميل', 'BW-SHO-001-CAM-42', '2000000004549') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'CAM', 'Camel', 'كاميل', 'BW-SHO-001-CAM-43', '2000000004556') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '44', 'CAM', 'Camel', 'كاميل', 'BW-SHO-001-CAM-44', '2000000004563') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'BRO', 'Brown', 'بني', 'BW-SHO-001-BRO-42', '2000000004570') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '44', 'BRO', 'Brown', 'بني', 'BW-SHO-001-BRO-44', '2000000004587') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chunky-suede-chelsea-boots', 'Chunky Suede Chelsea Boots', 'Chunky Suede Chelsea Boots', 'A finishing touch in leather that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 7900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '41', 'BEI', 'Beige', 'بيج', 'BW-SHO-002-BEI-41', '2000000004594') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'BEI', 'Beige', 'بيج', 'BW-SHO-002-BEI-43', '2000000004600') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('grain-leather-chelsea-boots', 'Grain Leather Chelsea Boots', 'Grain Leather Chelsea Boots', 'A finishing touch in leather that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '44', 'BLA', 'Black', 'أسود', 'BW-SHO-003-BLA-44', '2000000004617') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('leather-chunky-chelsea-boots', 'Leather Chunky Chelsea Boots', 'Leather Chunky Chelsea Boots', 'A finishing touch in leather that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'CAM', 'Camel', 'كاميل', 'BW-SHO-004-CAM-40', '2000000004624') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '41', 'CAM', 'Camel', 'كاميل', 'BW-SHO-004-CAM-41', '2000000004631') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'CAM', 'Camel', 'كاميل', 'BW-SHO-004-CAM-42', '2000000004648') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'BLA', 'Black', 'أسود', 'BW-SHO-004-BLA-43', '2000000004655') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'BRO', 'Brown', 'بني', 'BW-SHO-004-BRO-42', '2000000004662') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('lug-sole-leather-chelsea-boots', 'Lug-sole Leather Chelsea Boots', 'Lug-sole Leather Chelsea Boots', 'A finishing touch in leather that pulls the look together. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '44', 'BLA', 'Black', 'أسود', 'BW-SHO-005-BLA-44', '2000000004679') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('rugged-leather-chelsea-boots', 'Rugged Leather Chelsea Boots', 'Rugged Leather Chelsea Boots', 'Quiet and considered, crafted in leather — the BACH way to finish an outfit. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'BRO', 'Brown', 'بني', 'BW-SHO-006-BRO-40', '2000000004686') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'BRO', 'Brown', 'بني', 'BW-SHO-006-BRO-42', '2000000004693') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('suede-chelsea-boots', 'Suede Chelsea Boots', 'Suede Chelsea Boots', 'Quiet and considered, crafted in leather — the BACH way to finish an outfit. Made for the cold months.',
          (select id from public.categories where code = 'SHO'), 8900,
          'Leather', null, array['boots','boots','leather','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'NAV', 'Navy', 'كحلي', 'BW-SHO-007-NAV-40', '2000000004709') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '41', 'NAV', 'Navy', 'كحلي', 'BW-SHO-007-NAV-41', '2000000004716') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'NAV', 'Navy', 'كحلي', 'BW-SHO-007-NAV-42', '2000000004723') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '44', 'NAV', 'Navy', 'كحلي', 'BW-SHO-007-NAV-44', '2000000004730') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'OWH', 'Off-White', 'أوف وايت', 'BW-SHO-007-OWH-40', '2000000004747') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '41', 'OWH', 'Off-White', 'أوف وايت', 'BW-SHO-007-OWH-41', '2000000004754') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'OWH', 'Off-White', 'أوف وايت', 'BW-SHO-007-OWH-42', '2000000004761') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'OWH', 'Off-White', 'أوف وايت', 'BW-SHO-007-OWH-43', '2000000004778') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'BEI', 'Beige', 'بيج', 'BW-SHO-007-BEI-40', '2000000004785') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'BEI', 'Beige', 'بيج', 'BW-SHO-007-BEI-43', '2000000004792') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '40', 'CAM', 'Camel', 'كاميل', 'BW-SHO-007-CAM-40', '2000000004808') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'CAM', 'Camel', 'كاميل', 'BW-SHO-007-CAM-42', '2000000004815') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '42', 'BLA', 'Black', 'أسود', 'BW-SHO-007-BLA-42', '2000000004822') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, '43', 'BLA', 'Black', 'أسود', 'BW-SHO-007-BLA-43', '2000000004839') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('bandana-paisley-print-sweatshirt', 'Bandana Paisley Print Sweatshirt', 'Bandana Paisley Print Sweatshirt', 'A sweatshirt with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWS-001-WHI-S', '2000000004846') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('basic-relaxed-fit-sweatshirt', 'Basic Relaxed Fit Sweatshirt', 'Basic Relaxed Fit Sweatshirt', 'A sweatshirt with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWS-002-BLA-L', '2000000004853') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWS-002-BLA-XL', '2000000004860') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWS-002-WHI-L', '2000000004877') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWS-002-LGR-L', '2000000004884') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chicago-bears-varsity-sweatshirt', 'Chicago Bears Varsity Sweatshirt', 'Chicago Bears Varsity Sweatshirt', 'Cut in cotton with an oversized fit, a sweatshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWS-003-LGR-L', '2000000004891') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('dreamer-graphic-sweatshirt', 'Dreamer Graphic Sweatshirt', 'Dreamer Graphic Sweatshirt', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWS-004-LGR-L', '2000000004907') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWS-004-GRA-XL', '2000000004914') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('essential-panel-polo-sweatshirt-dusty-pink', 'Essential Panel Polo Sweatshirt Dusty Pink', 'Essential Panel Polo Sweatshirt Dusty Pink', 'Cut in cotton with an oversized fit, a sweatshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWP', 'Off-White/Pink', 'أوف وايت, وردي', 'BW-SWS-005-OWP-S', '2000000004921') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWP', 'Off-White/Pink', 'أوف وايت, وردي', 'BW-SWS-005-OWP-XL', '2000000004938') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('olive-green-crewneck-sweatshirt', 'Olive Green Crewneck Sweatshirt', 'Olive Green Crewneck Sweatshirt', 'Cut in cotton with an oversized fit. The kind of sweatshirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-SWS-006-OLI-L', '2000000004945') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWS-006-OLI-M', '2000000004952') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-SWS-006-OLI-XL', '2000000004969') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('panel-seam-crewneck-sweatshirt', 'Panel Seam Crewneck Sweatshirt', 'Panel Seam Crewneck Sweatshirt', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton Blend', 'Regular fit', array['hoodies & sweatshirts','sweatshirt','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWS-007-OWH-L', '2000000004976') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWS-007-OWH-M', '2000000004983') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWS-007-OWH-S', '2000000004990') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWS-007-OWH-XL', '2000000005003') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('raglan-sleeve-crewneck-sweatshirt', 'Raglan Sleeve Crewneck Sweatshirt', 'Raglan Sleeve Crewneck Sweatshirt', 'A sweatshirt with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWS-008-BEI-L', '2000000005010') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWS-008-BEI-XL', '2000000005027') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('trouble-maker-graphic-sweatshirt', 'Trouble Maker Graphic Sweatshirt', 'Trouble Maker Graphic Sweatshirt', 'Cut in cotton with an oversized fit, a sweatshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWS-009-BLA-L', '2000000005034') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('varsity-zip-detail-sweatshirt', 'Varsity Zip-detail Sweatshirt', 'Varsity Zip-detail Sweatshirt', 'A sweatshirt with quiet intent — cut in polyester with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 4500,
          'Polyester', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWS-010-WHI-XL', '2000000005041') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWS-010-DGR-XL', '2000000005058') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-v-inset-crewneck-sweatshirt', 'Vintage V-inset Crewneck Sweatshirt', 'Vintage V-inset Crewneck Sweatshirt', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton Blend', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWS-011-BEI-M', '2000000005065') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWS-011-GRA-XL', '2000000005072') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-wash-crewneck-sweatshirt', 'Vintage Wash Crewneck Sweatshirt', 'Vintage Wash Crewneck Sweatshirt', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWS-012-GRA-L', '2000000005089') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vintage-wash-raglan-sweatshirt', 'Vintage Wash Raglan Sweatshirt', 'Vintage Wash Raglan Sweatshirt', 'Cut in cotton with an oversized fit. The kind of sweatshirt that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 4500,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MAU', 'Mauve', 'موف', 'BW-SWS-013-MAU-XL', '2000000005096') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-SWS-013-OLI-XL', '2000000005102') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-darkness-graphic-sweatshirt', 'Washed Darkness Graphic Sweatshirt', 'Washed Darkness Graphic Sweatshirt', 'Cut in cotton with an oversized fit, a sweatshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'PIN', 'Pink', 'وردي', 'BW-SWS-014-PIN-L', '2000000005119') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'PIN', 'Pink', 'وردي', 'BW-SWS-014-PIN-M', '2000000005126') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWS-014-MIN-L', '2000000005133') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWS-014-MIN-M', '2000000005140') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWS-014-MIN-XL', '2000000005157') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-lavender-oversized-crewneck-sweatshirt', 'Washed Lavender Oversized Crewneck Sweatshirt', 'Washed Lavender Oversized Crewneck Sweatshirt', 'Cut in cotton with an oversized fit, a sweatshirt built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWS'), 3900,
          'Cotton', 'Oversized', array['hoodies & sweatshirts','sweatshirt','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MAU', 'Mauve', 'موف', 'BW-SWS-015-MAU-L', '2000000005164') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('abstract-brushstroke-sweatshit', 'Abstract Brushstroke Sweatshirt', 'Abstract Brushstroke Sweatshirt', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BBL', 'Beige/Blue', 'بيج, أزرق', 'BW-SWT-001-BBL-L', '2000000005171') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BBL', 'Beige/Blue', 'بيج, أزرق', 'BW-SWT-001-BBL-XL', '2000000005188') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('acid-wash-long-sleeve-tee', 'Acid Wash Long Sleeve Tee', 'Acid Wash Long Sleeve Tee', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-002-BLU-L', '2000000005195') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-002-BLU-M', '2000000005201') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-002-BLU-S', '2000000005218') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-SWT-002-BLU-XL', '2000000005225') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('basic-long-sleeve-crewneck-tee', 'Basic Long Sleeve Crewneck Tee', 'Basic Long Sleeve Crewneck Tee', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-003-BLA-M', '2000000005232') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-003-BLA-S', '2000000005249') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-003-BLA-XL', '2000000005256') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-003-WHI-S', '2000000005263') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-003-WHI-XL', '2000000005270') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-003-BEI-L', '2000000005287') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-003-BEI-M', '2000000005294') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-003-BEI-S', '2000000005300') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-003-BEI-XL', '2000000005317') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-003-MIN-L', '2000000005324') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWT-003-MIN-XL', '2000000005331') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('basket-weave-knit-sweater', 'Basket Weave Knit Sweater', 'Basket Weave Knit Sweater', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-004-BLA-M', '2000000005348') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('bold-stripe-open-collar-polo-sweater', 'Bold Stripe Open Collar Polo Sweater', 'Bold Stripe Open Collar Polo Sweater', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['polos','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEA', 'Beige/Brown', 'بيج, بني', 'BW-SWT-005-BEA-S', '2000000005355') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GWH', 'Green/White', 'أخضر, أبيض', 'BW-SWT-005-GWH-XL', '2000000005362') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WNA', 'White/Navy', 'أبيض, كحلي', 'BW-SWT-005-WNA-L', '2000000005379') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('breton-stripe-long-sleeve', 'Breton Stripe Long Sleeve', 'Breton Stripe Long Sleeve', 'Cut in cotton with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WBL', 'White/Blue', 'أبيض, أزرق', 'BW-SWT-006-WBL-M', '2000000005386') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WBR', 'White/Brown', 'أبيض, بني', 'BW-SWT-006-WBR-M', '2000000005393') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('broken-stripe-chunky-knit-sweater', 'Broken Stripe Chunky Knit Sweater', 'Broken Stripe Chunky Knit Sweater', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-007-BWH-S', '2000000005409') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('brushed-colour-block-knit-sweater', 'Brushed Colour Block Knit Sweater', 'Brushed Colour Block Knit Sweater', 'Cut in cotton with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-008-BRO-L', '2000000005416') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-008-BRO-M', '2000000005423') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'RED', 'Red', 'أحمر', 'BW-SWT-008-RED-L', '2000000005430') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'RED', 'Red', 'أحمر', 'BW-SWT-008-RED-M', '2000000005447') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-008-NAV-L', '2000000005454') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-008-NAV-M', '2000000005461') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('brushed-striped-crew-neck-sweater', 'Brushed Striped Crew Neck Sweater', 'Brushed Striped Crew Neck Sweater', 'Cut in wool blend with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool Blend', 'Oversized', array['knitwear','sweater','oversized','wool blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-009-BEI-L', '2000000005478') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWT-009-GRA-L', '2000000005485') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-009-GRA-M', '2000000005492') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('buttoned-henley-knit-sweater', 'Buttoned Henley Knit Sweater', 'Buttoned Henley Knit Sweater', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWT-010-GRA-L', '2000000005508') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-010-GRA-M', '2000000005515') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-010-GRA-S', '2000000005522') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWT-010-GRA-XL', '2000000005539') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-010-BLU-L', '2000000005546') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-010-BLU-M', '2000000005553') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-010-BLU-S', '2000000005560') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-SWT-010-BLU-XL', '2000000005577') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cable-knit-crew-neck-sweater', 'Cable Knit Crew Neck Sweater', 'Cable Knit Crew Neck Sweater', 'Cut in wool with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-011-WHI-XL', '2000000005584') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'WHI', 'White', 'أبيض', 'BW-SWT-011-WHI-XXL', '2000000005591') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-011-BEI-L', '2000000005607') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-011-BEI-XL', '2000000005614') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-011-NAV-S', '2000000005621') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cable-knit-crewneck-sweater', 'Cable Knit Crewneck Sweater', 'Cable Knit Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-012-BUR-L', '2000000005638') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-012-BUR-M', '2000000005645') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-012-BUR-S', '2000000005652') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-012-BUR-XXL', '2000000005669') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-012-BLA-L', '2000000005676') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-012-BLA-S', '2000000005683') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-012-BLA-XL', '2000000005690') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-SWT-012-BLA-XXL', '2000000005706') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-012-BRO-S', '2000000005713') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-SWT-012-BRO-XXL', '2000000005720') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-012-NAV-M', '2000000005737') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-012-NAV-S', '2000000005744') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-012-NAV-XXL', '2000000005751') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-012-OWH-S', '2000000005768') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cable-knit-polo-sweater', 'Cable Knit Polo Sweater', 'Cable Knit Polo Sweater', 'Considered lines, clean finish. Cut in wool with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['polos','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-013-BLA-M', '2000000005775') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-013-WHI-M', '2000000005782') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-013-BLU-L', '2000000005799') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-013-BLU-M', '2000000005805') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-013-BLU-S', '2000000005812') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cable-knit-quarter-zip-sweater', 'Cable Knit Quarter-Zip Sweater', 'Cable Knit Quarter-Zip Sweater', 'Cut in cotton blend with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-014-BEI-M', '2000000005829') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('cable-stripe-knit-polo-sweater', 'Cable Stripe Knit Polo Sweater', 'Cable Stripe Knit Polo Sweater', 'A sweater with quiet intent — cut in wool with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Slim fit', array['polos','sweater','slim fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-015-WHI-L', '2000000005836') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-015-WHI-M', '2000000005843') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-015-WHI-S', '2000000005850') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-015-WHI-XL', '2000000005867') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'WHI', 'White', 'أبيض', 'BW-SWT-015-WHI-XXL', '2000000005874') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWT-015-GRA-L', '2000000005881') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-015-GRA-M', '2000000005898') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-015-GRA-S', '2000000005904') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWT-015-GRA-XL', '2000000005911') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-015-NAV-L', '2000000005928') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-015-NAV-M', '2000000005935') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-015-NAV-S', '2000000005942') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-015-NAV-XL', '2000000005959') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-015-NAV-XXL', '2000000005966') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('camo-panel-knit-sweater', 'Camo Panel Knit Sweater', 'Camo Panel Knit Sweater', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3000,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWT-016-OLI-M', '2000000005973') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chunky-ribbed-crew-neck-sweater', 'Chunky Ribbed Crew Neck Sweater', 'Chunky Ribbed Crew Neck Sweater', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-017-LGR-L', '2000000005980') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-017-LGR-M', '2000000005997') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-017-LGR-S', '2000000006000') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-017-LGR-XL', '2000000006017') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('chunky-waffle-knit-crewneck-sweater', 'Chunky Waffle Knit Crewneck Sweater', 'Chunky Waffle Knit Crewneck Sweater', 'Cut in wool with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-018-BLA-S', '2000000006024') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-018-BLA-XL', '2000000006031') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-fine-knit-crewneck-sweater', 'Classic Fine Knit Crewneck Sweater', 'Classic Fine Knit Crewneck Sweater', 'Cut in cotton blend with a slim fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3000,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-019-LGR-L', '2000000006048') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-019-LGR-S', '2000000006055') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-019-LGR-XL', '2000000006062') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-turtleneck-knit-sweater', 'Classic Turtleneck Knit Sweater', 'Classic Turtleneck Knit Sweater', 'Cut in cotton blend with a slim fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 2900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'RED', 'Red', 'أحمر', 'BW-SWT-020-RED-L', '2000000006079') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'RED', 'Red', 'أحمر', 'BW-SWT-020-RED-M', '2000000006086') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'RED', 'Red', 'أحمر', 'BW-SWT-020-RED-S', '2000000006093') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'RED', 'Red', 'أحمر', 'BW-SWT-020-RED-XL', '2000000006109') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-020-BRO-L', '2000000006116') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-020-BRO-M', '2000000006123') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-020-BRO-S', '2000000006130') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-SWT-020-BRO-XL', '2000000006147') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-SWT-020-BRO-XXL', '2000000006154') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-020-OWH-L', '2000000006161') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-020-OWH-M', '2000000006178') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-020-OWH-S', '2000000006185') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-020-OWH-XL', '2000000006192') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-020-LBL-L', '2000000006208') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-020-LBL-XL', '2000000006215') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-020-LBL-XXL', '2000000006222') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-020-BEI-L', '2000000006239') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-020-BEI-M', '2000000006246') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-020-BEI-S', '2000000006253') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-020-BEI-XL', '2000000006260') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-SWT-020-OLI-L', '2000000006277') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWT-020-OLI-M', '2000000006284') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-SWT-020-OLI-S', '2000000006291') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-SWT-020-OLI-XL', '2000000006307') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OLI', 'Olive', 'زيتي', 'BW-SWT-020-OLI-XXL', '2000000006314') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-020-BLA-L', '2000000006321') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-020-BLA-M', '2000000006338') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-020-BLA-S', '2000000006345') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 4);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-020-WHI-L', '2000000006352') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-020-WHI-M', '2000000006369') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 3);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-020-WHI-S', '2000000006376') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 4);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-020-WHI-XL', '2000000006383') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-020-DGR-L', '2000000006390') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-020-DGR-M', '2000000006406') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-020-DGR-S', '2000000006413') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-020-DGR-XXL', '2000000006420') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-SWT-020-CAM-L', '2000000006437') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-SWT-020-CAM-M', '2000000006444') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-020-CAM-S', '2000000006451') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-SWT-020-CAM-XL', '2000000006468') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-020-LGR-L', '2000000006475') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-020-LGR-XL', '2000000006482') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('color-block-ribbed-knit-sweater', 'Color Block Ribbed Knit Sweater', 'Color Block Ribbed Knit Sweater', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3000,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-021-BWH-M', '2000000006499') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-breton-knit-sweater', 'Contrast Breton Knit Sweater', 'Contrast Breton Knit Sweater', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WRE', 'White/Red', 'أبيض, أحمر', 'BW-SWT-022-WRE-M', '2000000006505') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-v-neck-knit-sweater', 'Contrast V-neck Knit Sweater', 'Contrast V-neck Knit Sweater', 'A sweater with quiet intent — cut in wool with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-023-BLA-L', '2000000006512') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-023-BLA-M', '2000000006529') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-023-LBL-L', '2000000006536') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-023-LBL-S', '2000000006543') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-collar-quarter-zip-polo-sweater', 'Corduroy Collar Quarter-Zip Polo Sweater', 'Corduroy Collar Quarter-Zip Polo Sweater', 'A sweater with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['polos','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-024-WHI-L', '2000000006550') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-024-WHI-M', '2000000006567') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-024-WHI-XL', '2000000006574') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-024-BEI-L', '2000000006581') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-024-BEI-M', '2000000006598') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-024-BEI-S', '2000000006604') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-024-BEI-XL', '2000000006611') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('corduroy-texture-crewneck-sweater', 'Corduroy Texture Crewneck Sweater', 'Corduroy Texture Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-025-BEI-XL', '2000000006628') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-025-BRO-L', '2000000006635') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-025-BRO-S', '2000000006642') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-025-BLA-XL', '2000000006659') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('diagonal-textured-crew-neck-sweater', 'Diagonal Textured Crew Neck Sweater', 'Diagonal Textured Crew Neck Sweater', 'Cut in polyester with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-026-BLA-L', '2000000006666') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-026-BLA-M', '2000000006673') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-026-BLA-S', '2000000006680') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-026-BLA-XL', '2000000006697') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-026-WHI-L', '2000000006703') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-026-WHI-XL', '2000000006710') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-026-OWH-L', '2000000006727') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-026-OWH-M', '2000000006734') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-026-OWH-S', '2000000006741') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-026-OWH-XL', '2000000006758') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-026-BRO-L', '2000000006765') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-026-BRO-M', '2000000006772') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-026-BRO-S', '2000000006789') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-SWT-026-BRO-XL', '2000000006796') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('diamond-knit-sweater', 'Diamond Knit Sweater', 'Diamond Knit Sweater', 'A sweater with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-027-WHI-XL', '2000000006802') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('distressed-rib-crewneck-sweater', 'Distressed Rib Crewneck Sweater', 'Distressed Rib Crewneck Sweater', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-028-CAM-S', '2000000006819') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-SWT-028-CAM-XL', '2000000006826') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('distressed-textured-knit-sweater', 'Distressed Textured Knit Sweater', 'Distressed Textured Knit Sweater', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-029-BLA-L', '2000000006833') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-029-BLA-M', '2000000006840') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-029-BLA-S', '2000000006857') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('distressed-washed-knit-sweater', 'Distressed Washed Knit Sweater', 'Distressed Washed Knit Sweater', 'Cut in wool with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Oversized', array['knitwear','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-030-DGR-S', '2000000006864') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('dobby-textured-long-sleeve-top', 'Dobby Textured Long Sleeve Top', 'Dobby Textured Long Sleeve Top', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-SWT-031-CAM-L', '2000000006871') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-031-CAM-S', '2000000006888') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-031-WHI-XL', '2000000006895') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-cable-knit-sweater', 'Fine Cable Knit Sweater', 'Fine Cable Knit Sweater', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-032-WHI-XL', '2000000006901') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-knit-crewneck-sweater', 'Fine Knit Crewneck Sweater', 'Fine Knit Crewneck Sweater', 'A sweater with quiet intent — cut in polyester with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Slim fit', array['knitwear','sweater','slim fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-033-MIN-L', '2000000006918') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-033-MIN-M', '2000000006925') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'MIN', 'Mint', 'مينت', 'BW-SWT-033-MIN-S', '2000000006932') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-033-BLU-L', '2000000006949') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-033-BLU-S', '2000000006956') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-033-BEI-XL', '2000000006963') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-knit-long-sleeve-crewneck', 'Fine Knit Long Sleeve Crewneck', 'Fine Knit Long Sleeve Crewneck', 'Cut in cotton blend with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-034-BEI-L', '2000000006970') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-034-BEI-XL', '2000000006987') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-rib-crewneck-sweater', 'Fine Rib Crewneck Sweater', 'Fine Rib Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-035-NAV-L', '2000000006994') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-035-NAV-M', '2000000007007') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-035-NAV-S', '2000000007014') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-035-NAV-XL', '2000000007021') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-035-BEI-L', '2000000007038') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-035-BEI-M', '2000000007045') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-035-BEI-XL', '2000000007052') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-rib-crewneck-sweater-2', 'Fine Rib Crewneck Sweater', 'Fine Rib Crewneck Sweater', 'Considered lines, clean finish. Cut in polyester with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-036-DGR-L', '2000000007069') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-036-DGR-M', '2000000007076') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-036-DGR-S', '2000000007083') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fine-ribbed-long-sleeve-crewneck', 'Fine Ribbed Long Sleeve Crewneck', 'Fine Ribbed Long Sleeve Crewneck', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-037-BLA-XL', '2000000007090') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-037-BEI-L', '2000000007106') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-037-BEI-XL', '2000000007113') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fuzzy-knit-crewneck-sweater', 'Fuzzy Knit Crewneck Sweater', 'Fuzzy Knit Crewneck Sweater', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-038-BRO-M', '2000000007120') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fuzzy-knit-polo-sweater', 'Fuzzy Knit Polo Sweater', 'Fuzzy Knit Polo Sweater', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Cotton', 'Oversized', array['polos','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-039-BRO-M', '2000000007137') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('fuzzy-knit-polo-sweater-2', 'Fuzzy Knit Polo Sweater', 'Fuzzy Knit Polo Sweater', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['polos','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-040-BLU-L', '2000000007144') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('geometric-jacquard-knit-sweater', 'Geometric Jacquard Knit Sweater', 'Geometric Jacquard Knit Sweater', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3000,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-SWT-041-CAM-M', '2000000007151') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-041-CAM-S', '2000000007168') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('graphic-cable-knit-polo-sweater', 'Graphic Cable Knit Polo Sweater', 'Graphic Cable Knit Polo Sweater', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['polos','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-042-WHI-M', '2000000007175') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-042-LBL-L', '2000000007182') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-042-LBL-M', '2000000007199') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-042-LBL-XL', '2000000007205') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-SWT-042-OLI-XL', '2000000007212') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('graphic-stripe-knit-sweater', 'Graphic Stripe Knit Sweater', 'Graphic Stripe Knit Sweater', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-043-BWH-L', '2000000007229') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-043-BWH-S', '2000000007236') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-043-BWH-XL', '2000000007243') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEB', 'Beige/White', 'بيج, أبيض', 'BW-SWT-043-BEB-L', '2000000007250') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEB', 'Beige/White', 'بيج, أبيض', 'BW-SWT-043-BEB-XL', '2000000007267') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('half-zip-mock-neck-knit-sweater', 'Half-Zip Mock Neck Knit Sweater', 'Half-Zip Mock Neck Knit Sweater', 'Considered lines, clean finish. Cut in wool with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Slim fit', array['knitwear','sweater','slim fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-044-MIN-L', '2000000007274') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-044-MIN-M', '2000000007281') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWT-044-MIN-XL', '2000000007298') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-044-WHI-M', '2000000007304') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-044-WHI-XL', '2000000007311') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-044-BEI-M', '2000000007328') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-044-BEI-S', '2000000007335') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-044-BLU-L', '2000000007342') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-044-BLU-M', '2000000007359') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-044-BLU-S', '2000000007366') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-SWT-044-BLU-XL', '2000000007373') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-044-BLA-L', '2000000007380') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-044-BLA-M', '2000000007397') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-044-BLA-S', '2000000007403') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-044-BRO-L', '2000000007410') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-044-BRO-M', '2000000007427') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-SWT-044-BRO-XL', '2000000007434') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('horizontal-rib-knit-crewneck-sweater', 'Horizontal Rib Knit Crewneck Sweater', 'Horizontal Rib Knit Crewneck Sweater', 'Cut in cotton with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-045-DGR-L', '2000000007441') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-045-DGR-M', '2000000007458') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-045-DGR-S', '2000000007465') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-045-DGR-XL', '2000000007472') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('horizontal-ribbed-drop-shoulder-sweater', 'Horizontal Ribbed Drop Shoulder Sweater', 'Horizontal Ribbed Drop Shoulder Sweater', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-046-BLA-S', '2000000007489') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-046-BEI-XL', '2000000007496') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('horizontal-stripe-pocket-crewneck', 'Horizontal Stripe Pocket Crewneck', 'Horizontal Stripe Pocket Crewneck', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWB', 'Off-White/Black', 'أوف وايت, أسود', 'BW-SWT-047-OWB-XL', '2000000007502') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('jacquard-stripe-crewneck', 'Jacquard Stripe Crewneck', 'Jacquard Stripe Crewneck', 'Cut in polyester with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-048-BLA-XL', '2000000007519') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('melange-knit-crewneck-sweater', 'Melange Knit Crewneck Sweater', 'Melange Knit Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-049-BLA-XL', '2000000007526') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-049-WHI-XL', '2000000007533') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-049-BLU-S', '2000000007540') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-SWT-049-BLU-XL', '2000000007557') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('micro-ribbed-relaxed-fit-long-sleeve', 'Micro Ribbed Relaxed Fit Long Sleeve', 'Micro Ribbed Relaxed Fit Long Sleeve', 'Cut in cotton blend with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-050-BLA-S', '2000000007564') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-050-BEI-XL', '2000000007571') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('minimal-pocket-crewneck', 'Minimal Pocket Crewneck', 'Minimal Pocket Crewneck', 'Cut in polyester with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-051-BEI-L', '2000000007588') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('minimal-textured-crewneck', 'Minimal Textured Crewneck', 'Minimal Textured Crewneck', 'Cut in polyester with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-052-BLA-XL', '2000000007595') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('mock-neck-knit-sweater', 'Mock Neck Knit Sweater', 'Mock Neck Knit Sweater', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 2900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-053-BLA-S', '2000000007601') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-053-WHI-L', '2000000007618') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-053-WHI-M', '2000000007625') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-053-WHI-S', '2000000007632') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-053-DGR-L', '2000000007649') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-053-DGR-S', '2000000007656') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-053-DGR-XL', '2000000007663') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-SWT-053-CAM-L', '2000000007670') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-SWT-053-CAM-M', '2000000007687') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-053-CAM-S', '2000000007694') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-053-NAV-S', '2000000007700') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('multi-stripe-crewneck-knit-sweater', 'Multi-stripe Crewneck Knit Sweater', 'Multi-stripe Crewneck Knit Sweater', 'Cut in polyester with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Slim fit', array['knitwear','sweater','slim fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWG', 'Off-White/Green', 'أوف وايت, أخضر', 'BW-SWT-054-OWG-L', '2000000007717') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWG', 'Off-White/Green', 'أوف وايت, أخضر', 'BW-SWT-054-OWG-M', '2000000007724') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWG', 'Off-White/Green', 'أوف وايت, أخضر', 'BW-SWT-054-OWG-S', '2000000007731') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWG', 'Off-White/Green', 'أوف وايت, أخضر', 'BW-SWT-054-OWG-XL', '2000000007748') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWL', 'Off-White/Light Grey', 'أوف وايت, رمادي فاتح', 'BW-SWT-054-OWL-L', '2000000007755') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWL', 'Off-White/Light Grey', 'أوف وايت, رمادي فاتح', 'BW-SWT-054-OWL-M', '2000000007762') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWL', 'Off-White/Light Grey', 'أوف وايت, رمادي فاتح', 'BW-SWT-054-OWL-S', '2000000007779') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWL', 'Off-White/Light Grey', 'أوف وايت, رمادي فاتح', 'BW-SWT-054-OWL-XL', '2000000007786') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('open-collar-fine-knit-polo-sweater', 'Open Collar Fine Knit Polo Sweater', 'Open Collar Fine Knit Polo Sweater', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['polos','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-055-BLA-XL', '2000000007793') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-055-LGR-M', '2000000007809') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-055-LGR-S', '2000000007816') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-055-BRO-L', '2000000007823') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-055-BRO-M', '2000000007830') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('open-collar-ribbed-knit-polo-sweater', 'Open Collar Ribbed Knit Polo Sweater', 'Open Collar Ribbed Knit Polo Sweater', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['polos','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-056-BRO-L', '2000000007847') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-056-BRO-M', '2000000007854') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-056-BRO-S', '2000000007861') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-SWT-056-BRO-XXL', '2000000007878') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-056-WHI-L', '2000000007885') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-056-WHI-M', '2000000007892') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-056-WHI-XL', '2000000007908') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'WHI', 'White', 'أبيض', 'BW-SWT-056-WHI-XXL', '2000000007915') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-056-OWH-M', '2000000007922') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-056-OWH-XXL', '2000000007939') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWT-056-GRA-L', '2000000007946') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-056-GRA-M', '2000000007953') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-056-GRA-S', '2000000007960') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWT-056-GRA-XL', '2000000007977') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'GRA', 'Green', 'أخضر', 'BW-SWT-056-GRA-XXL', '2000000007984') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-056-LBL-L', '2000000007991') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-056-LBL-M', '2000000008004') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-056-LBL-S', '2000000008011') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-056-BLA-L', '2000000008028') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-056-BLA-M', '2000000008035') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-056-BLA-S', '2000000008042') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-SWT-056-BLA-XXL', '2000000008059') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('open-collar-knit-polo-sweater', 'Open-collar Knit Polo Sweater', 'Open-collar Knit Polo Sweater', 'A sweater with quiet intent — cut in wool with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Oversized', array['polos','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-057-BLA-L', '2000000008066') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-057-OWH-L', '2000000008073') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-057-BLU-L', '2000000008080') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('open-collar-v-neck-knit-sweater', 'Open-collar V-neck Knit Sweater', 'Open-collar V-neck Knit Sweater', 'A sweater with quiet intent — cut in cotton with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['polos','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-058-BLA-XL', '2000000008097') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-058-WHI-L', '2000000008103') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-058-WHI-M', '2000000008110') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-058-NAV-L', '2000000008127') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('panel-knit-crewneck-sweater', 'Panel Knit Crewneck Sweater', 'Panel Knit Crewneck Sweater', 'A sweater with quiet intent — cut in polyester with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Slim fit', array['knitwear','sweater','slim fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-059-MIN-L', '2000000008134') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-059-MIN-M', '2000000008141') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWT-059-MIN-XL', '2000000008158') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-059-BEI-S', '2000000008165') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-059-BEI-XL', '2000000008172') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-059-BLU-M', '2000000008189') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-059-BLU-S', '2000000008196') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('panelled-ribbed-crewneck-sweater', 'Panelled Ribbed Crewneck Sweater', 'Panelled Ribbed Crewneck Sweater', 'Cut in cotton blend with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-060-BEI-L', '2000000008202') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-060-BEI-M', '2000000008219') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-060-BEI-S', '2000000008226') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-060-LGR-L', '2000000008233') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-060-LGR-S', '2000000008240') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-060-LGR-XL', '2000000008257') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pin-rib-crewneck-long-sleeve', 'Pin Rib Crewneck Long Sleeve', 'Pin Rib Crewneck Long Sleeve', 'Cut in cotton blend with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-061-BEI-L', '2000000008264') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-061-BEI-M', '2000000008271') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-061-BEI-XL', '2000000008288') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pinstripe-crew-neck-knit-sweater', 'Pinstripe Crew Neck Knit Sweater', 'Pinstripe Crew Neck Knit Sweater', 'Cut in wool with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Oversized', array['knitwear','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-062-BUR-L', '2000000008295') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-062-BUR-XL', '2000000008301') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-062-BEI-L', '2000000008318') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-062-BEI-XL', '2000000008325') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pinstripe-ribbed-sweatshirt', 'Pinstripe Ribbed Sweatshirt', 'Pinstripe Ribbed Sweatshirt', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-063-LGR-L', '2000000008332') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-063-LGR-XL', '2000000008349') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-063-BLA-S', '2000000008356') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('pique-texture-crewneck-sweater', 'Pique Texture Crewneck Sweater', 'Pique Texture Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-064-LGR-L', '2000000008363') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-064-LGR-S', '2000000008370') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-064-LGR-XL', '2000000008387') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-064-BLA-L', '2000000008394') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-064-BLA-XL', '2000000008400') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('quarter-zip-knit-polo-sweater', 'Quarter-Zip Knit Polo Sweater', 'Quarter-Zip Knit Polo Sweater', 'Cut in wool with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Regular fit', array['polos','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-065-MIN-L', '2000000008417') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'MIN', 'Mint', 'مينت', 'BW-SWT-065-MIN-S', '2000000008424') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-065-BLU-L', '2000000008431') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRE', 'Grey', 'رمادي', 'BW-SWT-065-GRE-L', '2000000008448') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRE', 'Grey', 'رمادي', 'BW-SWT-065-GRE-M', '2000000008455') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRE', 'Grey', 'رمادي', 'BW-SWT-065-GRE-S', '2000000008462') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-065-WHI-L', '2000000008479') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-065-WHI-M', '2000000008486') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-065-BEI-L', '2000000008493') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-065-BRO-L', '2000000008509') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-065-BRO-S', '2000000008516') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-065-BLA-M', '2000000008523') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-065-BLA-XL', '2000000008530') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('quarter-zip-mock-neck-knit-sweater', 'Quarter-Zip Mock Neck Knit Sweater', 'Quarter-Zip Mock Neck Knit Sweater', 'Cut in wool with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-066-DGR-L', '2000000008547') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-066-DGR-M', '2000000008554') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-066-DGR-S', '2000000008561') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWT-066-OLI-M', '2000000008578') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-066-WHI-M', '2000000008585') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('raglan-knit-crewneck-sweater', 'Raglan Knit Crewneck Sweater', 'Raglan Knit Crewneck Sweater', 'Cut in cotton blend with a slim fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MAU', 'Mauve', 'موف', 'BW-SWT-067-MAU-M', '2000000008592') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'MAU', 'Mauve', 'موف', 'BW-SWT-067-MAU-S', '2000000008608') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-067-BEI-L', '2000000008615') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-067-BEI-M', '2000000008622') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-067-BEI-S', '2000000008639') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-067-BEI-XL', '2000000008646') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('raw-edge-mock-neck-sweatshirt', 'Raw Edge Mock Neck Sweatshirt', 'Raw Edge Mock Neck Sweatshirt', 'Considered lines, clean finish. Cut in cotton with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-068-BLA-L', '2000000008653') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-068-BLA-XL', '2000000008660') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-068-BEI-L', '2000000008677') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-068-LGR-XL', '2000000008684') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('raw-edge-oversized-sweatshirt', 'Raw Edge Oversized Sweatshirt', 'Raw Edge Oversized Sweatshirt', 'Cut in cotton with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWT-069-MIN-XL', '2000000008691') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('relaxed-fit-long-sleeve-crewneck', 'Relaxed Fit Long Sleeve Crewneck', 'Relaxed Fit Long Sleeve Crewneck', 'Cut in cotton blend with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-070-BLA-L', '2000000008707') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-070-BLA-M', '2000000008714') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-070-BLA-S', '2000000008721') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-070-BLA-XL', '2000000008738') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-070-WHI-M', '2000000008745') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-070-MIN-L', '2000000008752') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-070-MIN-M', '2000000008769') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-crew-neck-long-sleeve', 'Ribbed Crew Neck Long Sleeve', 'Ribbed Crew Neck Long Sleeve', 'Cut in cotton with a slim fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Cotton', 'Slim fit', array['knitwear','sweater','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-071-BLA-L', '2000000008776') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-071-BLA-XL', '2000000008783') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-071-NAV-L', '2000000008790') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-071-NAV-M', '2000000008806') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-071-NAV-XL', '2000000008813') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-crew-neck-sweater', 'Ribbed Knit Crew Neck Sweater', 'Ribbed Knit Crew Neck Sweater', 'A sweater with quiet intent — cut in wool with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-072-BUR-M', '2000000008820') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-072-BUR-XL', '2000000008837') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-SWT-072-OLI-L', '2000000008844') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWT-072-OLI-M', '2000000008851') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OLI', 'Olive', 'زيتي', 'BW-SWT-072-OLI-XL', '2000000008868') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-072-NAV-L', '2000000008875') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-072-NAV-S', '2000000008882') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-072-NAV-XL', '2000000008899') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-072-LBL-L', '2000000008905') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-072-LBL-S', '2000000008912') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-072-LBL-XL', '2000000008929') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRE', 'Grey', 'رمادي', 'BW-SWT-072-GRE-M', '2000000008936') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRE', 'Grey', 'رمادي', 'BW-SWT-072-GRE-S', '2000000008943') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-072-WHI-S', '2000000008950') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-072-BEI-L', '2000000008967') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-crew-neck-sweater-2', 'Ribbed Knit Crew Neck Sweater', 'Ribbed Knit Crew Neck Sweater', 'A sweater with quiet intent — cut in wool with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Oversized', array['knitwear','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWT-073-GRA-XL', '2000000008974') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-crewneck-sweater', 'Ribbed Knit Crewneck Sweater', 'Ribbed Knit Crewneck Sweater', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-074-BUR-L', '2000000008981') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-074-BUR-S', '2000000008998') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-074-BUR-XL', '2000000009001') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-074-BUR-XXL', '2000000009018') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-074-NAV-L', '2000000009025') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-074-NAV-M', '2000000009032') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-074-NAV-S', '2000000009049') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-074-NAV-XL', '2000000009056') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-074-NAV-XXL', '2000000009063') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-074-BRO-L', '2000000009070') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BRO', 'Brown', 'بني', 'BW-SWT-074-BRO-XXL', '2000000009087') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-henley-sweater', 'Ribbed Knit Henley Sweater', 'Ribbed Knit Henley Sweater', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-075-BUR-M', '2000000009094') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-polo-sweater', 'Ribbed Knit Polo Sweater', 'Ribbed Knit Polo Sweater', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['polos','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-076-WHI-XL', '2000000009100') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-076-BLU-L', '2000000009117') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-076-LGR-L', '2000000009124') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-076-LGR-XL', '2000000009131') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-polo-sweater-2', 'Ribbed Knit Polo Sweater', 'Ribbed Knit Polo Sweater', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['polos','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-077-OWH-L', '2000000009148') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-077-OWH-M', '2000000009155') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-077-OWH-S', '2000000009162') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-077-OWH-XL', '2000000009179') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-077-OWH-XXL', '2000000009186') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-077-NAV-M', '2000000009193') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-077-NAV-XL', '2000000009209') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-077-NAV-XXL', '2000000009216') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'GRA', 'Green', 'أخضر', 'BW-SWT-077-GRA-L', '2000000009223') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-077-GRA-M', '2000000009230') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-077-GRA-S', '2000000009247') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-077-BLA-L', '2000000009254') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-077-BLA-M', '2000000009261') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-077-BLA-S', '2000000009278') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-077-BLA-XL', '2000000009285') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'BLA', 'Black', 'أسود', 'BW-SWT-077-BLA-XXL', '2000000009292') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-knit-quarter-zip-polo-sweater', 'Ribbed Knit Quarter-Zip Polo Sweater', 'Ribbed Knit Quarter-Zip Polo Sweater', 'Cut in wool with a slim fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Slim fit', array['polos','sweater','slim fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DBL', 'Dark Blue', 'ازرق غامق', 'BW-SWT-078-DBL-L', '2000000009308') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DBL', 'Dark Blue', 'ازرق غامق', 'BW-SWT-078-DBL-M', '2000000009315') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DBL', 'Dark Blue', 'ازرق غامق', 'BW-SWT-078-DBL-XL', '2000000009322') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-078-LGR-L', '2000000009339') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-078-LGR-M', '2000000009346') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-078-LGR-XL', '2000000009353') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-078-WHI-L', '2000000009360') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-078-WHI-M', '2000000009377') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-078-DGR-L', '2000000009384') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-SWT-078-DGR-M', '2000000009391') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DAR', 'Dark Green', 'اخضر غامق', 'BW-SWT-078-DAR-L', '2000000009407') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'DAR', 'Dark Green', 'اخضر غامق', 'BW-SWT-078-DAR-M', '2000000009414') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DAR', 'Dark Green', 'اخضر غامق', 'BW-SWT-078-DAR-XL', '2000000009421') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-long-sleeve-crewneck', 'Ribbed Long Sleeve Crewneck', 'Ribbed Long Sleeve Crewneck', 'A sweater with quiet intent — cut in cotton with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-079-BUR-L', '2000000009438') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BUR', 'Burgundy', 'خمري', 'BW-SWT-079-BUR-XL', '2000000009445') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-079-BLU-L', '2000000009452') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-079-BLU-M', '2000000009469') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-079-BLU-S', '2000000009476') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLU', 'Blue', 'أزرق', 'BW-SWT-079-BLU-XL', '2000000009483') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('ribbed-pocket-crewneck', 'Ribbed Pocket Crewneck', 'Ribbed Pocket Crewneck', 'Considered lines, clean finish. Cut in polyester with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Oversized', array['knitwear','sweater','oversized','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-080-WHI-XL', '2000000009490') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('side-zip-ribbed-sweatshirt', 'Side-zip Ribbed Sweatshirt', 'Side-zip Ribbed Sweatshirt', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-081-MIN-L', '2000000009506') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-081-MIN-M', '2000000009513') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('silence-embroidered-crewneck-knit-sweater', 'Silence Embroidered Crewneck Knit Sweater', 'Silence Embroidered Crewneck Knit Sweater', 'A sweater with quiet intent — cut in wool with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Regular fit', array['knitwear','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-082-LBL-L', '2000000009520') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-082-LBL-M', '2000000009537') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-082-LBL-S', '2000000009544') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-082-NAV-L', '2000000009551') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-082-NAV-M', '2000000009568') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-082-NAV-XL', '2000000009575') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-082-BLA-L', '2000000009582') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-082-BLA-S', '2000000009599') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-082-BLA-XL', '2000000009605') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-082-OWH-L', '2000000009612') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-082-OWH-M', '2000000009629') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-082-OWH-XL', '2000000009636') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DBE', 'Dark Beige', 'بيج غامق', 'BW-SWT-082-DBE-L', '2000000009643') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DBE', 'Dark Beige', 'بيج غامق', 'BW-SWT-082-DBE-S', '2000000009650') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'DBE', 'Dark Beige', 'بيج غامق', 'BW-SWT-082-DBE-XL', '2000000009667') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('single-button-polo-knit-sweater', 'Single-button Polo Knit Sweater', 'Single-button Polo Knit Sweater', 'Considered lines, clean finish. Cut in wool with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Wool', 'Regular fit', array['polos','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-083-WHI-M', '2000000009674') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-083-NAV-M', '2000000009681') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-083-NAV-S', '2000000009698') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('slogan-knit-long-sleeve-sweater', 'Slogan Knit Long Sleeve Sweater', 'Slogan Knit Long Sleeve Sweater', 'Cut in cotton blend with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-084-BLA-M', '2000000009704') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-084-BLA-XL', '2000000009711') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('slogan-knit-long-sleeve-sweater-2', 'Slogan Knit Long Sleeve Sweater', 'Slogan Knit Long Sleeve Sweater', 'Cut in cotton blend with a regular fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-085-WHI-M', '2000000009728') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-085-BEI-L', '2000000009735') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('smooth-crewneck-long-sleeve', 'Smooth Crewneck Long Sleeve', 'Smooth Crewneck Long Sleeve', 'Considered lines, clean finish. Cut in cotton with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Regular fit', array['knitwear','sweater','regular fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-086-BLA-L', '2000000009742') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-086-BLA-M', '2000000009759') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-086-BLA-S', '2000000009766') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-086-BLA-XL', '2000000009773') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-086-WHI-L', '2000000009780') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-086-WHI-XL', '2000000009797') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-086-BEI-L', '2000000009803') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-086-BEI-M', '2000000009810') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-086-BEI-S', '2000000009827') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-086-BEI-XL', '2000000009834') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('striped-button-polo-knit-sweater', 'Striped Button Polo Knit Sweater', 'Striped Button Polo Knit Sweater', 'A sweater with quiet intent — cut in wool with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Oversized', array['polos','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-087-NAV-M', '2000000009841') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-087-NAV-S', '2000000009858') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-087-NAV-XL', '2000000009865') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-087-BRO-L', '2000000009872') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('striped-crewneck-knit-sweater', 'Striped Crewneck Knit Sweater', 'Striped Crewneck Knit Sweater', 'Cut in cotton blend with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-088-WHI-L', '2000000009889') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-088-WHI-M', '2000000009896') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'WHI', 'White', 'أبيض', 'BW-SWT-088-WHI-S', '2000000009902') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-088-OWH-L', '2000000009919') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-088-OWH-M', '2000000009926') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-088-OWH-S', '2000000009933') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('striped-fuzzy-knit-sweater', 'Striped Fuzzy Knit Sweater', 'Striped Fuzzy Knit Sweater', 'Cut in cotton blend with a slim fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-089-BRO-S', '2000000009940') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('striped-half-zip-polo-sweater', 'Striped Half-Zip Polo Sweater', 'Striped Half-Zip Polo Sweater', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['polos','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BBE', 'Brown/Beige', 'بني, بيج', 'BW-SWT-090-BBE-S', '2000000009957') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('striped-ribbed-henley-long-sleeve', 'Striped Ribbed Henley Long Sleeve', 'Striped Ribbed Henley Long Sleeve', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-091-BWH-L', '2000000009964') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-091-BWH-M', '2000000009971') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BWH', 'Black/White', 'أسود, أبيض', 'BW-SWT-091-BWH-S', '2000000009988') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OFF', 'Off-White/Brown', 'أوف وايت, بني', 'BW-SWT-091-OFF-L', '2000000009995') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OFF', 'Off-White/Brown', 'أوف وايت, بني', 'BW-SWT-091-OFF-M', '2000000010007') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OFF', 'Off-White/Brown', 'أوف وايت, بني', 'BW-SWT-091-OFF-S', '2000000010014') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OFF', 'Off-White/Brown', 'أوف وايت, بني', 'BW-SWT-091-OFF-XL', '2000000010021') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWM', 'Off-White/Mint', 'أوف وايت, مينت', 'BW-SWT-091-OWM-L', '2000000010038') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OWM', 'Off-White/Mint', 'أوف وايت, مينت', 'BW-SWT-091-OWM-M', '2000000010045') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWM', 'Off-White/Mint', 'أوف وايت, مينت', 'BW-SWT-091-OWM-S', '2000000010052') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWM', 'Off-White/Mint', 'أوف وايت, مينت', 'BW-SWT-091-OWM-XL', '2000000010069') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-fine-stripe-knit-sweater', 'Textured Fine-stripe Knit Sweater', 'Textured Fine-stripe Knit Sweater', 'Cut in cotton with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-092-BLA-L', '2000000010076') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-092-BLA-M', '2000000010083') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-092-BLA-S', '2000000010090') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLU', 'Blue', 'أزرق', 'BW-SWT-092-BLU-L', '2000000010106') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-092-BLU-M', '2000000010113') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'CAM', 'Camel', 'كاميل', 'BW-SWT-092-CAM-M', '2000000010120') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-092-CAM-S', '2000000010137') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-jacquard-crewneck-sweater', 'Textured Jacquard Crewneck Sweater', 'Textured Jacquard Crewneck Sweater', 'Cut in cotton blend with an oversized fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-093-BLA-L', '2000000010144') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-093-BEI-L', '2000000010151') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-093-BEI-M', '2000000010168') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-jacquard-crewneck-sweatshirt', 'Textured Jacquard Crewneck Sweatshirt', 'Textured Jacquard Crewneck Sweatshirt', 'Cut in polyester with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Regular fit', array['knitwear','sweater','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-094-BLA-L', '2000000010175') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-094-BLA-S', '2000000010182') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-094-BLA-XL', '2000000010199') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-094-WHI-L', '2000000010205') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-094-LGR-S', '2000000010212') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-094-LGR-XL', '2000000010229') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-094-BEI-L', '2000000010236') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-094-BEI-XL', '2000000010243') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-knit-crewneck-sweater', 'Textured Knit Crewneck Sweater', 'Textured Knit Crewneck Sweater', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-095-BEI-M', '2000000010250') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-095-BRO-M', '2000000010267') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-knit-polo-sweater', 'Textured Knit Polo Sweater', 'Textured Knit Polo Sweater', 'Considered lines, clean finish. Cut in wool with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Regular fit', array['polos','sweater','regular fit','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'MIN', 'Mint', 'مينت', 'BW-SWT-096-MIN-L', '2000000010274') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-096-MIN-M', '2000000010281') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'MIN', 'Mint', 'مينت', 'BW-SWT-096-MIN-S', '2000000010298') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'MIN', 'Mint', 'مينت', 'BW-SWT-096-MIN-XL', '2000000010304') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-096-BLA-M', '2000000010311') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-096-BLA-S', '2000000010328') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-096-BRO-S', '2000000010335') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OLI', 'Olive', 'زيتي', 'BW-SWT-096-OLI-L', '2000000010342') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-096-GRA-M', '2000000010359') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-096-GRA-S', '2000000010366') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-096-NAV-L', '2000000010373') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-096-NAV-M', '2000000010380') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-096-NAV-S', '2000000010397') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-ribbed-crewneck-sweater', 'Textured Ribbed Crewneck Sweater', 'Textured Ribbed Crewneck Sweater', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-097-LGR-L', '2000000010403') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-097-LGR-M', '2000000010410') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-097-LGR-S', '2000000010427') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-097-LGR-XL', '2000000010434') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-097-BEI-L', '2000000010441') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-097-BEI-S', '2000000010458') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-097-BEI-XL', '2000000010465') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('textured-stripe-pocket-sweater', 'Textured Stripe Pocket Sweater', 'Textured Stripe Pocket Sweater', 'A sweater with quiet intent — cut in cotton blend with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-098-CAM-S', '2000000010472') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-SWT-098-CAM-XL', '2000000010489') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'WHI', 'White', 'أبيض', 'BW-SWT-098-WHI-XL', '2000000010496') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-098-BLA-L', '2000000010502') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('velvet-ribbed-crewneck-sweatshirt', 'Velvet Ribbed Crewneck Sweatshirt', 'Velvet Ribbed Crewneck Sweatshirt', 'Considered lines, clean finish. Cut in velvet with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3000,
          'Velvet', 'Slim fit', array['knitwear','sweater','slim fit','velvet','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OLI', 'Olive', 'زيتي', 'BW-SWT-099-OLI-S', '2000000010519') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'YEL', 'Yellow', 'أصفر', 'BW-SWT-099-YEL-L', '2000000010526') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'YEL', 'Yellow', 'أصفر', 'BW-SWT-099-YEL-M', '2000000010533') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-099-OWH-L', '2000000010540') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'OWH', 'Off-White', 'أوف وايت', 'BW-SWT-099-OWH-XXL', '2000000010557') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'CAM', 'Camel', 'كاميل', 'BW-SWT-099-CAM-L', '2000000010564') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'CAM', 'Camel', 'كاميل', 'BW-SWT-099-CAM-S', '2000000010571') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'CAM', 'Camel', 'كاميل', 'BW-SWT-099-CAM-XL', '2000000010588') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'RED', 'Red', 'أحمر', 'BW-SWT-099-RED-L', '2000000010595') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'RED', 'Red', 'أحمر', 'BW-SWT-099-RED-M', '2000000010601') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'RED', 'Red', 'أحمر', 'BW-SWT-099-RED-XL', '2000000010618') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vertical-pinstripe-pocket-sweater', 'Vertical Pinstripe Pocket Sweater', 'Vertical Pinstripe Pocket Sweater', 'Considered lines, clean finish. Cut in polyester with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3500,
          'Polyester', 'Regular fit', array['knitwear','sweater','regular fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-100-BLA-L', '2000000010625') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-100-BLA-M', '2000000010632') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-100-BLA-S', '2000000010649') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-100-BLA-XL', '2000000010656') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vertical-rib-long-sleeve-tee', 'Vertical Rib Long Sleeve Tee', 'Vertical Rib Long Sleeve Tee', 'A sweater with quiet intent — cut in cotton with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Slim fit', array['knitwear','sweater','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-101-BLA-L', '2000000010663') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-101-BLA-M', '2000000010670') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-101-BLA-S', '2000000010687') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-101-BLA-XL', '2000000010694') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-101-WHI-L', '2000000010700') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-101-BRO-L', '2000000010717') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-SWT-101-BRO-M', '2000000010724') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-SWT-101-BRO-S', '2000000010731') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-101-BEI-L', '2000000010748') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-101-BEI-M', '2000000010755') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-101-BEI-S', '2000000010762') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-101-BEI-XL', '2000000010779') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('vertical-ribbed-long-sleeve-top', 'Vertical Ribbed Long Sleeve Top', 'Vertical Ribbed Long Sleeve Top', 'A sweater with quiet intent — cut in cotton blend with a regular fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-102-BLA-S', '2000000010786') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-102-BLA-XL', '2000000010793') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('waffle-knit-henley-long-sleeve', 'Waffle Knit Henley Long Sleeve', 'Waffle Knit Henley Long Sleeve', 'A sweater with quiet intent — cut in cotton blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-SWT-103-BLA-L', '2000000010809') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-103-BLA-S', '2000000010816') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'WHI', 'White', 'أبيض', 'BW-SWT-103-WHI-L', '2000000010823') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'WHI', 'White', 'أبيض', 'BW-SWT-103-WHI-M', '2000000010830') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-103-NAV-L', '2000000010847') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-SWT-103-NAV-M', '2000000010854') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-103-NAV-S', '2000000010861') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-103-LGR-L', '2000000010878') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-103-LGR-M', '2000000010885') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-103-LGR-S', '2000000010892') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-103-GRA-M', '2000000010908') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'GRA', 'Green', 'أخضر', 'BW-SWT-103-GRA-S', '2000000010915') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('waffle-knit-raglan-long-sleeve', 'Waffle Knit Raglan Long Sleeve', 'Waffle Knit Raglan Long Sleeve', 'Considered lines, clean finish. Cut in cotton blend with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Slim fit', array['knitwear','sweater','slim fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-104-BEI-S', '2000000010922') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-104-BEI-XL', '2000000010939') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('waffle-texture-long-sleeve-top', 'Waffle Texture Long Sleeve Top', 'Waffle Texture Long Sleeve Top', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-105-BEI-L', '2000000010946') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-105-BEI-XL', '2000000010953') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-SWT-105-BLA-XL', '2000000010960') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-embroidered-crew-neck-sweater', 'Washed Embroidered Crew Neck Sweater', 'Washed Embroidered Crew Neck Sweater', 'Cut in wool with an oversized fit, a sweater built to anchor the rotation. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 4500,
          'Wool', 'Oversized', array['knitwear','sweater','oversized','wool','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-SWT-106-BRO-L', '2000000010977') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-SWT-106-BRO-XL', '2000000010984') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRI', 'Brick', 'بريك', 'BW-SWT-106-BRI-XL', '2000000010991') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('washed-embroidered-long-sleeve-tee', 'Washed Embroidered Long Sleeve Tee', 'Washed Embroidered Long Sleeve Tee', 'A sweater with quiet intent — cut in cotton with an oversized fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Oversized', array['knitwear','sweater','oversized','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-107-LBL-L', '2000000011004') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-107-LBL-M', '2000000011011') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-107-LBL-S', '2000000011028') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LBL', 'Light Blue', 'أزرق فاتح', 'BW-SWT-107-LBL-XL', '2000000011035') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-107-BEI-L', '2000000011042') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-107-BEI-M', '2000000011059') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-107-BEI-S', '2000000011066') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-107-BEI-XL', '2000000011073') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'OLI', 'Olive', 'زيتي', 'BW-SWT-107-OLI-M', '2000000011080') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wave-texture-crewneck-sweatshirt', 'Wave Texture Crewneck Sweatshirt', 'Wave Texture Crewneck Sweatshirt', 'Considered lines, clean finish. Cut in cotton blend with an oversized fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Oversized', array['knitwear','sweater','oversized','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'GRA', 'Green', 'أخضر', 'BW-SWT-108-GRA-M', '2000000011097') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'GRA', 'Green', 'أخضر', 'BW-SWT-108-GRA-XL', '2000000011103') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-108-BEI-L', '2000000011110') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-108-BEI-S', '2000000011127') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-108-BEI-XL', '2000000011134') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-rib-henley-knit-sweater', 'Wide Rib Henley Knit Sweater', 'Wide Rib Henley Knit Sweater', 'Considered lines, clean finish. Cut in cotton with a slim fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton', 'Slim fit', array['knitwear','sweater','slim fit','cotton','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-109-LGR-XL', '2000000011141') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-SWT-109-NAV-L', '2000000011158') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-SWT-109-NAV-XL', '2000000011165') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-rib-knit-crewneck-sweater', 'Wide Rib Knit Crewneck Sweater', 'Wide Rib Knit Crewneck Sweater', 'A sweater with quiet intent — cut in polyester with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Polyester', 'Slim fit', array['knitwear','sweater','slim fit','polyester','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'MIN', 'Mint', 'مينت', 'BW-SWT-110-MIN-M', '2000000011172') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-110-BEI-L', '2000000011189') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-110-BEI-M', '2000000011196') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-110-BEI-S', '2000000011202') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLU', 'Blue', 'أزرق', 'BW-SWT-110-BLU-M', '2000000011219') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLU', 'Blue', 'أزرق', 'BW-SWT-110-BLU-S', '2000000011226') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BLA', 'Black', 'أسود', 'BW-SWT-110-BLA-S', '2000000011233') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'LGR', 'Light Grey', 'رمادي فاتح', 'BW-SWT-110-LGR-S', '2000000011240') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wide-rib-long-sleeve-crewneck', 'Wide Rib Long Sleeve Crewneck', 'Wide Rib Long Sleeve Crewneck', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-SWT-111-BLA-M', '2000000011257') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BEI', 'Beige', 'بيج', 'BW-SWT-111-BEI-L', '2000000011264') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BEI', 'Beige', 'بيج', 'BW-SWT-111-BEI-M', '2000000011271') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BEI', 'Beige', 'بيج', 'BW-SWT-111-BEI-S', '2000000011288') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BEI', 'Beige', 'بيج', 'BW-SWT-111-BEI-XL', '2000000011295') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('wolf-jacquard-knit-sweater', 'Wolf Jacquard Knit Sweater', 'Wolf Jacquard Knit Sweater', 'Cut in cotton blend with a regular fit. The kind of sweater that works without asking for attention. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'SWT'), 3900,
          'Cotton Blend', 'Regular fit', array['knitwear','sweater','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-SWT-112-NAV-S', '2000000011301') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('classic-ribbed-v-neck-vest', 'Classic Ribbed V-neck Vest', 'Classic Ribbed V-neck Vest', 'A vest with quiet intent — cut in wool blend with a slim fit. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'VST'), 3900,
          'Wool Blend', 'Slim fit', array['vests','vest','slim fit','wool blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-VST-001-DGR-L', '2000000011318') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-VST-001-DGR-S', '2000000011325') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'DGR', 'Dark Grey', 'رمادي غامق', 'BW-VST-001-DGR-XXL', '2000000011332') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'NAV', 'Navy', 'كحلي', 'BW-VST-001-NAV-L', '2000000011349') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'NAV', 'Navy', 'كحلي', 'BW-VST-001-NAV-M', '2000000011356') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'NAV', 'Navy', 'كحلي', 'BW-VST-001-NAV-S', '2000000011363') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'NAV', 'Navy', 'كحلي', 'BW-VST-001-NAV-XL', '2000000011370') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XXL', 'NAV', 'Navy', 'كحلي', 'BW-VST-001-NAV-XXL', '2000000011387') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BRO', 'Brown', 'بني', 'BW-VST-001-BRO-L', '2000000011394') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BRO', 'Brown', 'بني', 'BW-VST-001-BRO-M', '2000000011400') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'BRO', 'Brown', 'بني', 'BW-VST-001-BRO-S', '2000000011417') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BRO', 'Brown', 'بني', 'BW-VST-001-BRO-XL', '2000000011424') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.products (slug, name_en, name_ar, description_en, category_id, price_usd_cents, material_en, fit, tags, status)
  values ('contrast-trim-cable-knit-vest', 'Contrast Trim Cable-knit Vest', 'Contrast Trim Cable-knit Vest', 'Considered lines, clean finish. Cut in cotton blend with a regular fit — made to be reached for. Made for the cold months, layered or worn on its own.',
          (select id from public.categories where code = 'VST'), 4500,
          'Cotton Blend', 'Regular fit', array['vests','vest','regular fit','cotton blend','winter']::text[], 'draft')
  returning id into pid;
  insert into public.product_seasons (product_id, season) values (pid, 'winter');
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'OWH', 'Off-White', 'أوف وايت', 'BW-VST-002-OWH-L', '2000000011431') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'S', 'OWH', 'Off-White', 'أوف وايت', 'BW-VST-002-OWH-S', '2000000011448') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'OWH', 'Off-White', 'أوف وايت', 'BW-VST-002-OWH-XL', '2000000011455') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'L', 'BLA', 'Black', 'أسود', 'BW-VST-002-BLA-L', '2000000011462') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 2);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'M', 'BLA', 'Black', 'أسود', 'BW-VST-002-BLA-M', '2000000011479') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);
  insert into public.product_variants (product_id, size, color_code, color_en, color_ar, sku, barcode)
  values (pid, 'XL', 'BLA', 'Black', 'أسود', 'BW-VST-002-BLA-XL', '2000000011486') returning id into vid;
  insert into public.inventory_levels (variant_id, branch_id, quantity) values (vid, b, 1);

  insert into public.sku_sequences (category_code, next_seq) values ('ACC', 12) on conflict (category_code) do update set next_seq = 12;
  insert into public.sku_sequences (category_code, next_seq) values ('HOD', 16) on conflict (category_code) do update set next_seq = 16;
  insert into public.sku_sequences (category_code, next_seq) values ('JKT', 50) on conflict (category_code) do update set next_seq = 50;
  insert into public.sku_sequences (category_code, next_seq) values ('JOG', 6) on conflict (category_code) do update set next_seq = 6;
  insert into public.sku_sequences (category_code, next_seq) values ('KNT', 5) on conflict (category_code) do update set next_seq = 5;
  insert into public.sku_sequences (category_code, next_seq) values ('OVS', 21) on conflict (category_code) do update set next_seq = 21;
  insert into public.sku_sequences (category_code, next_seq) values ('PLO', 12) on conflict (category_code) do update set next_seq = 12;
  insert into public.sku_sequences (category_code, next_seq) values ('PNT', 7) on conflict (category_code) do update set next_seq = 7;
  insert into public.sku_sequences (category_code, next_seq) values ('SH', 5) on conflict (category_code) do update set next_seq = 5;
  insert into public.sku_sequences (category_code, next_seq) values ('SHO', 8) on conflict (category_code) do update set next_seq = 8;
  insert into public.sku_sequences (category_code, next_seq) values ('SWS', 16) on conflict (category_code) do update set next_seq = 16;
  insert into public.sku_sequences (category_code, next_seq) values ('SWT', 113) on conflict (category_code) do update set next_seq = 113;
  insert into public.sku_sequences (category_code, next_seq) values ('VST', 3) on conflict (category_code) do update set next_seq = 3;
end $$;