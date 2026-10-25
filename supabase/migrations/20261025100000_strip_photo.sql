-- The photo a product shows in the strip at the bottom of the product page
-- (founder 2026-10-25). MGMT → product → photos → «صورة الشريط تحت». One per
-- product; without one the strip shows the main photo, as before.
-- A flag on the photo rather than a products → media_assets key, so embedding
-- media_assets from products stays unambiguous.

alter table public.media_assets add column in_strip boolean not null default false;

create unique index media_assets_one_strip_photo
  on public.media_assets (product_id) where in_strip;
