import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { HeaderActions, type NavGroup, type NavTile } from "./header-actions";
import { getLocale, lhref, pick } from "../lib/locale";

export async function SiteHeader() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
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

  // Parent categories are menu groups; children with published products are
  // the links. A parent with nothing published disappears.
  type Cat = {
    id: string;
    code: string;
    name_en: string;
    name_ar: string | null;
    parent_id: string | null;
    banner_url?: string | null;
    banner_mobile_url?: string | null;
  };
  const all = (cats ?? []) as Cat[];
  const shown = new Map<string, number>();
  for (const f of fronts ?? []) {
    const id = (f.products as unknown as { category_id: string | null } | null)?.category_id;
    if (id) shown.set(id, (shown.get(id) ?? 0) + 1);
  }
  const count = (c: Cat) => shown.get(c.id) ?? 0;
  const groups: NavGroup[] = [];
  for (const parent of all.filter((c) => !c.parent_id)) {
    const items = all
      .filter((c) => c.parent_id === parent.id && count(c) > 0)
      .map((c) => ({ code: c.code, label: pick(locale, c.name_en, c.name_ar) }));
    if (items.length) {
      groups.push({ code: parent.code, label: pick(locale, parent.name_en, parent.name_ar), items });
    }
  }
  // Ungrouped leaf categories (no parent, own products) still get listed.
  const loose = all
    .filter((c) => !c.parent_id && count(c) > 0 && !all.some((k) => k.parent_id === c.id))
    .map((c) => ({ code: c.code, label: pick(locale, c.name_en, c.name_ar) }));
  if (loose.length) groups.push({ code: null, label: t(locale, "sf.nav.categories"), items: loose });

  // Menu photo tiles: New in (newest photographed piece), then each group's
  // portrait banner, else the first child's.
  const tiles: NavTile[] = [];
  const newestFront = (newest ?? [])
    .map((p) => (p.media_assets as unknown as Array<{ kind: string; storage_path: string }>)?.find((m) => m.kind === "front"))
    .find(Boolean)?.storage_path;
  if (newestFront) {
    tiles.push({ href: lhref(locale, "/shop"), label: t(locale, "sf.nav.newIn"), image: newestFront.replace(/-1600\.webp$/, "-800.webp") });
  }
  const bannerOf = (c?: Cat) => c?.banner_mobile_url || c?.banner_url || null;
  for (const g of groups) {
    if (!g.code) continue;
    const parent = all.find((c) => c.code === g.code);
    const image =
      bannerOf(parent) ?? g.items.map((i) => bannerOf(all.find((c) => c.code === i.code))).find(Boolean) ?? null;
    if (image) tiles.push({ href: lhref(locale, `/shop?cat=${g.code}`), label: g.label, image });
  }

  return (
    <header className="sticky top-0 z-40 bg-background">
      <HeaderActions
        groups={groups}
        collections={(cols ?? []).map((c) => ({ slug: c.slug, label: pick(locale, c.name_en, c.name_ar) }))}
        hasSale={Boolean(saleCount)}
        tiles={tiles}
      />
    </header>
  );
}
