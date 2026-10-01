-- Which colour a product photo shows. Most models are shot in one colour but
-- sold in several; the storefront preselects the photographed colour and says
-- "Shown in …" when the shopper picks another. Null = unknown / not set.
alter table public.media_assets add column if not exists color_en text;

comment on column public.media_assets.color_en is
  'Colour shown in this photo (matches product_variants.color_en); null when unknown.';
