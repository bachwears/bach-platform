-- Size guides: one chart per garment group, mapped to categories by code.
-- Public read (storefront PDP); staff manage via service role / future MGMT screen.

create table public.size_guides (
  guide_key text primary key check (guide_key ~ '^[a-z0-9-]+$'),
  name_en text not null,
  name_ar text not null,
  note_en text,
  note_ar text,
  headers_en text[] not null,
  headers_ar text[] not null,
  -- Array of rows, each row an array of cell strings, same length as headers.
  rows jsonb not null default '[]'::jsonb,
  category_codes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.size_guides enable row level security;

create policy "size_guides_public_read" on public.size_guides
  for select using (true);

create policy "size_guides_staff_write" on public.size_guides
  for all using (public.is_staff()) with check (public.is_staff());

insert into public.size_guides (guide_key, name_en, name_ar, note_en, note_ar, headers_en, headers_ar, rows, category_codes) values
(
  'tops',
  'Tops & outerwear',
  'القطع الفوقية والجاكيتات',
  'Measurements are body measurements in centimeters. If you are between sizes, size up for a relaxed fit.',
  'القياسات هي قياسات الجسم بالسنتيمتر. إذا كنت بين قياسين، خُد القياس الأكبر للبسة مريحة.',
  array['Size','Chest (cm)','Waist (cm)','Shoulder (cm)'],
  array['القياس','الصدر (سم)','الخصر (سم)','الكتف (سم)'],
  '[["S","88–94","76–82","43"],["M","95–101","83–89","45"],["L","102–108","90–97","47"],["XL","109–116","98–106","49"],["XXL","117–124","107–115","51"]]'::jsonb,
  array['SH','TSH','PLO','HEN','TNK','TOP','SWS','SWT','KNT','HOD','OVS','JKT','BLZ','COT','VST']
),
(
  'bottoms',
  'Pants & shorts',
  'البناطيل والشورتات',
  'Waist and hip are body measurements in centimeters. Inseam is the inner-leg length of the garment.',
  'الخصر والورك قياسات الجسم بالسنتيمتر. طول الساق الداخلي هو طول القطعة من الداخل.',
  array['Size','Waist (cm)','Hip (cm)','Inseam (cm)'],
  array['القياس','الخصر (سم)','الورك (سم)','طول الساق (سم)'],
  '[["30","76–79","94–97","76"],["32","81–84","99–102","77"],["34","86–89","104–107","78"],["36","91–94","109–112","79"],["38","96–99","114–117","80"]]'::jsonb,
  array['PNT','JNS','JOG','SHR','TR']
),
(
  'shoes',
  'Shoes',
  'الأحذية',
  'Measure your foot from heel to longest toe, standing. If between sizes, size up.',
  'قِس رجلك من الكعب لأطول إصبع وأنت واقف. إذا بين قياسين، خُد الأكبر.',
  array['EU','US','UK','Foot length (cm)'],
  array['أوروبي','أميركي','بريطاني','طول القدم (سم)'],
  '[["40","7","6","25.0"],["41","8","7","25.7"],["42","8.5","7.5","26.3"],["43","9.5","8.5","27.0"],["44","10","9","27.7"],["45","11","10","28.3"]]'::jsonb,
  array['SHO']
);
