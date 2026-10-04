import { unstable_cache } from "next/cache";
import { supabasePublic } from "@bach/supabase/public";

/**
 * Public catalogue reads shared by every visitor, cached for a minute so the
 * menu and the shop don't hit the database on each page view. They use the
 * anonymous client (no session), so nothing personal can end up in the cache.
 * The product page, bag and checkout stay live; checkout re-checks stock.
 */
const MINUTE = 60;

/** Everything the site header (menu groups, tiles, sale link) needs. */
export const getNavData = unstable_cache(
  async () => {
    const supabase = supabasePublic();
    const [{ data: cats }, { data: cols }, { count: saleCount }, { data: newest }, { data: fronts }] = await Promise.all([
      supabase
        .from("categories")
        // "*" brings the banner columns (banner_mobile_url may be missing on older schemas)
        .select("*")
        .eq("is_active", true)
        .order("sort")
        .order("name_en"),
      supabase
        .from("collections")
        .select("slug, name_en, name_ar, sort")
        .eq("is_active", true)
        .order("sort")
        .order("name_en"),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("sale_price_usd_cents", "is", null),
      supabase
        .from("products")
        .select("media_assets(kind, storage_path)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20),
      // the shop only lists photographed pieces, so the menu counts those
      supabase
        .from("media_assets")
        .select("products!inner(category_id, status)")
        .eq("kind", "front")
        .eq("products.status", "published"),
    ]);
    return { cats, cols, saleCount, newest, fronts };
  },
  ["nav-data-v1"],
  { revalidate: 2 * MINUTE, tags: ["catalog"] },
);

/** The shop grid's source: every published product with what cards and filters need. */
export const getShopCatalog = unstable_cache(
  async () => {
    const supabase = supabasePublic();
    const [{ data }, { data: merch }, { data: catTree }] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, fit, created_at, categories(code, name_en, name_ar), media_assets(kind, storage_path, color_en, sort), product_seasons(season), product_variants(id, size, color_en, color_ar, color_code, is_active, inventory_levels(quantity, reserved)), product_collections(collections(slug, name_en))",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase.from("merchandising_settings").select("active_season").maybeSingle(),
      // "*" so banner_mobile_url is picked up whether or not its migration has landed
      supabase.from("categories").select("*"),
    ]);
    return { data, merch, catTree };
  },
  ["shop-catalog-v1"],
  { revalidate: MINUTE, tags: ["catalog"] },
);

/** MGMT-edited site copy the layout and home page read (wheel, hero, banner). */
export const getSiteContent = unstable_cache(
  async () => {
    const { data } = await supabasePublic()
      .from("site_content")
      .select("key, value")
      .in("key", ["wheel", "home_hero", "home_banner"]);
    return Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  },
  ["site-content-v1"],
  { revalidate: MINUTE, tags: ["site-content"] },
);

/** Collections with a cover photo, for the home page. */
export const getHomeCollections = unstable_cache(
  async () => {
    const { data } = await supabasePublic()
      .from("collections")
      .select("slug, name_en, description_en, cover_url")
      .eq("is_active", true)
      .not("cover_url", "is", null)
      .order("sort");
    return data ?? [];
  },
  ["home-collections-v1"],
  { revalidate: 2 * MINUTE, tags: ["catalog"] },
);
