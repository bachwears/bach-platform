-- Cost + SEO fields so the Atom import loses nothing; feeds the future
-- Product Data Health screen and the accounting module's margin reports.

alter table public.products
  add column cost_usd_cents integer check (cost_usd_cents >= 0),
  add column meta_title_en text,
  add column meta_title_ar text,
  add column meta_description_en text,
  add column meta_description_ar text,
  add column legacy_id text;

comment on column public.products.cost_usd_cents is 'Purchase cost; staff-only via RLS-safe views, never exposed to storefront queries by column selection.';
comment on column public.products.legacy_id is 'ID in the old Atom POS export, for traceability.';
