import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";
import { HeaderActions, type NavGroup } from "./header-actions";
import { getLocale, lhref, pick } from "../lib/locale";

export async function SiteHeader() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data: cats }, { data: cols }] = await Promise.all([
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
  ]);

  // Parent categories are navigation headings; children with published
  // products are the links. A parent with nothing published disappears.
  const all = cats ?? [];
  const count = (c: (typeof all)[number]) =>
    (c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0;
  const byId = new Map(all.map((c) => [c.id, c]));
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

  // Sequential fill into 3 columns so groups stay in merchandising order.
  const total = groups.reduce((n, g) => n + g.items.length + 2, 0);
  const capacity = Math.ceil(total / 3);
  const columns: NavGroup[][] = [[], [], []];
  let col = 0;
  let used = 0;
  for (const g of groups) {
    const size = g.items.length + 2;
    if (used > 0 && used + size > capacity && col < 2) {
      col += 1;
      used = 0;
    }
    columns[col]!.push(g);
    used += size;
  }

  const collections = cols ?? [];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass-bar relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <Link href={lhref(locale, "/")} className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH Wears" className="h-4 w-auto dark:invert" />
        </Link>

        {/* Desktop text nav with the mega-menu; mobile nav lives in the hamburger. */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <div className="group static">
            <Link
              href={lhref(locale, "/shop")}
              className="inline-flex h-14 items-center text-muted-foreground group-hover:text-foreground group-focus-within:text-foreground"
              aria-haspopup="true"
            >
              {t(locale, "sf.nav.shop")}
            </Link>
            <div className="glass-panel invisible absolute inset-x-0 top-full mt-2 rounded-2xl opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 motion-reduce:transition-none">
              <div className="grid grid-cols-2 gap-8 px-6 py-8 md:grid-cols-4">
                {columns.map((column, i) => (
                  <div key={i} className="space-y-8">
                    {column.map((g) => (
                      <div key={g.code ?? "loose"}>
                        <MenuHeading href={g.code ? lhref(locale, `/shop?cat=${g.code}`) : undefined}>
                          {g.label}
                        </MenuHeading>
                        <ul className="space-y-2">
                          {g.items.map((c) => (
                            <li key={c.code}>
                              <Link
                                href={lhref(locale, `/shop?cat=${c.code}`)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="space-y-8">
                  <div>
                    <MenuHeading>{t(locale, "sf.nav.collections")}</MenuHeading>
                    <ul className="space-y-2">
                      {collections.slice(0, 8).map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={lhref(locale, `/shop?col=${c.slug}`)}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {pick(locale, c.name_en, c.name_ar)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <MenuHeading>{t(locale, "sf.nav.featured")}</MenuHeading>
                    <ul className="space-y-2">
                      <li>
                        <Link
                          href={lhref(locale, "/shop")}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t(locale, "sf.nav.newIn")}
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={lhref(locale, "/shop?sale=1")}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t(locale, "sf.nav.onSale")}
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Link href={lhref(locale, "/help")} className="text-muted-foreground hover:text-foreground">
            {t(locale, "sf.nav.help")}
          </Link>
          <Link href={lhref(locale, "/support")} className="text-muted-foreground hover:text-foreground">
            {t(locale, "sf.nav.support")}
          </Link>
        </nav>

        {/* Icon cluster (BOSS-style): search · account · bag · menu */}
        <div className="flex items-center gap-0.5">
          <HeaderActions groups={groups}>
            <AccountLink className="hidden md:grid" />
            <CartLink />
          </HeaderActions>
        </div>
      </div>
    </header>
  );
}

function MenuHeading({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = "mb-3 block text-xs uppercase tracking-wider text-muted-foreground";
  if (href) {
    return (
      <Link href={href} className={`${cls} transition-colors hover:text-foreground`}>
        {children}
      </Link>
    );
  }
  return <p className={cls}>{children}</p>;
}
