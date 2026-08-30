-- LOCAL-ONLY demo data (runs on `supabase db reset`; never pushed to prod).

insert into public.branches (name, name_ar)
select 'Main Branch', 'الفرع الرئيسي'
where not exists (select 1 from public.branches);

insert into public.categories (code, name_en, name_ar) values
  ('SH', 'Shirts', 'قمصان'),
  ('TR', 'Trousers', 'بناطيل'),
  ('JK', 'Jackets', 'جاكيتات'),
  ('KN', 'Knitwear', 'تريكو'),
  ('AC', 'Accessories', 'إكسسوارات')
on conflict (code) do nothing;

with cat as (select id from public.categories where code = 'SH')
insert into public.products
  (slug, name_en, name_ar, description_en, description_ar,
   category_id, price_usd_cents, fit, tags, occasions, status)
select
  'classic-oxford-shirt',
  'Classic Oxford Shirt',
  'قميص أوكسفورد كلاسيك',
  'A wardrobe cornerstone in breathable cotton oxford.',
  'قطعة أساسية بخامة قطن أوكسفورد مريحة.',
  cat.id, 4900, 'regular',
  array['cotton', 'classic'], array['work', 'daily'], 'published'
from cat
on conflict (slug) do nothing;

with p as (select id from public.products where slug = 'classic-oxford-shirt')
insert into public.product_variants (product_id, size, color_code, color_en, color_ar)
select p.id, s.size, c.code, c.en, c.ar
from p,
  (values ('M'), ('L'), ('XL')) as s (size),
  (values ('WHT', 'White', 'أبيض'), ('NVY', 'Navy', 'كحلي')) as c (code, en, ar)
on conflict (product_id, size, color_code) do nothing;

insert into public.product_seasons (product_id, season)
select id, 'all_season' from public.products where slug = 'classic-oxford-shirt'
on conflict do nothing;

insert into public.inventory_movements (variant_id, branch_id, delta, reason, note)
select v.id, b.id, 12, 'purchase', 'demo initial stock'
from public.product_variants v
join public.products p on p.id = v.product_id and p.slug = 'classic-oxford-shirt'
cross join (select id from public.branches limit 1) b;
