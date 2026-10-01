import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { HeaderActions, type NavGroup } from "./header-actions";
import { getLocale, pick } from "../lib/locale";

export async function SiteHeader() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data: cats }, { data: cols }, { count: saleCount }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, code, name_en, name_ar, sort, parent_id, products(count)")
      .eq("is_active", true)
      .eq("products.status", "published")
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
  ]);

  // Parent categories are menu groups; children with published products are
  // the links. A parent with nothing published disappears.
  const all = cats ?? [];
  const count = (c: (typeof all)[number]) =>
    (c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0;
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

  return (
    <header className="sticky top-0 z-40 bg-background">
      <HeaderActions
        groups={groups}
        collections={(cols ?? []).map((c) => ({ slug: c.slug, label: pick(locale, c.name_en, c.name_ar) }))}
        hasSale={Boolean(saleCount)}
      />
    </header>
  );
}
