import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";
import { LanguageSwitcher } from "./language-switcher";
import { getLocale, lhref, pick } from "../lib/locale";

export async function SiteHeader() {
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data: cats }, { data: cols }] = await Promise.all([
    supabase
      .from("categories")
      .select("code, name_en, name_ar, sort, products(count)")
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
  // Only surface categories that actually have published products.
  const categories = (cats ?? []).filter(
    (c) => ((c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0) > 0,
  );
  const collections = cols ?? [];
  // Split categories into two balanced columns for the panel.
  const mid = Math.ceil(categories.length / 2);
  const catCols = [categories.slice(0, mid), categories.slice(mid)];

  return (
    <header className="relative z-40 border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={lhref(locale, "/")} className="text-lg font-semibold tracking-[0.25em]">
          BACH
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {/* Mega-menu: opens on hover and on keyboard focus (focus-within). */}
          <div className="group static">
            <Link
              href={lhref(locale, "/shop")}
              className="inline-flex h-16 items-center text-muted-foreground group-hover:text-foreground group-focus-within:text-foreground"
              aria-haspopup="true"
            >
              {t(locale, "sf.nav.shop")}
            </Link>
            <div className="invisible absolute inset-x-0 top-full border-b bg-background opacity-0 shadow-sm transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-8 md:grid-cols-4">
                {catCols.map((column, i) => (
                  <div key={i}>
                    <MenuHeading>{i === 0 ? t(locale, "sf.nav.categories") : " "}</MenuHeading>
                    <ul className="space-y-2">
                      {column.map((c) => (
                        <li key={c.code}>
                          <Link
                            href={lhref(locale, `/shop?cat=${c.code}`)}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {pick(locale, c.name_en, c.name_ar)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
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
                    <li>
                      <Link
                        href={lhref(locale, "/shop")}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t(locale, "sf.nav.viewAll")}
                      </Link>
                    </li>
                  </ul>
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
          <AccountLink />
          <CartLink />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}

function MenuHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{children}</p>;
}
