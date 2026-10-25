-- Catalogue read speed (2026-10-26). Error tracking caught the shop's catalogue
-- read hitting the visitor (anon) 3 s statement timeout right after a deploy.
-- EXPLAIN as anon: ~1.1 s on an idle database —
--   * media_assets had no index on product_id (only a partial one that skips the
--     'other' photos, the majority): one sequential scan per product (457×);
--   * the read policies called is_staff() once per row (2,500 photos, 1,500
--     variants). Wrapped in a sub-select it runs once per query (an initPlan),
--     the usual Supabase RLS fix. Same rules, same answers.

create index if not exists media_assets_product_idx on public.media_assets (product_id);

alter policy "read media of visible products" on public.media_assets
  using ((select public.is_staff()) or exists (
    select 1 from public.products p where p.id = media_assets.product_id and p.status = 'published'));

alter policy "read variants of visible products" on public.product_variants
  using ((select public.is_staff()) or exists (
    select 1 from public.products p where p.id = product_variants.product_id and p.status = 'published'));

alter policy "read products" on public.products
  using (status = 'published' or (select public.is_staff()));

alter policy "read active categories" on public.categories
  using (is_active or (select public.is_staff()));

alter policy "read active collections" on public.collections
  using (is_active or (select public.is_staff()));
