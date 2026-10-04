import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../../components/product-card";
import { toCardProduct } from "../../lib/card";
import { SearchField } from "../../components/search-field";
import { getLocale, lhref } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: `${t(locale, "sf.search.title")} — BACH Wears`,
    // results pages are thin, query-driven duplicates of /shop
    robots: { index: false, follow: true },
    alternates: { canonical: lhref(locale, "/search") },
  };
}

interface Row {
  slug: string;
  category_id: string | null;
  name_en: string;
  name_ar: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  created_at: string;
  categories: { name_en: string } | null;
  media_assets: Array<{ kind: string; storage_path: string }>;
  product_variants: Array<{ id: string; size: string; color_en: string; sku: string | null; is_active: boolean }>;
  product_collections: Array<{ collections: { name_en: string } | null }>;
}


const toCard = (p: Row): CardProduct => toCardProduct(p);

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw = "" } = await searchParams;
  const q = raw.trim();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, fit, created_at, category_id, categories(name_en), media_assets(kind, storage_path, color_en, sort), product_variants(id, size, color_en, color_code, sku, is_active, inventory_levels(quantity, reserved)), product_collections(collections(name_en))",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, code, name_en, sort, parent_id").eq("is_active", true).order("sort"),
  ]);
  const hasPhoto = (p: Row) => p.media_assets.some((m) => m.kind === "front");
  // unphotographed pieces stay hidden until they are shot
  const all = ((data ?? []) as unknown as Row[]).filter(hasPhoto);
  // top-level categories that have something to show (themselves or a child)
  const shownCats = new Set(all.map((p) => p.category_id));
  const hasShown = (id: string, depth = 0): boolean =>
    shownCats.has(id) || (depth < 5 && (cats ?? []).some((k) => k.parent_id === id && hasShown(k.id, depth + 1)));
  const topCats = (cats ?? []).filter((c) => !c.parent_id && hasShown(c.id));

  // Every word must appear somewhere in the product: name, category,
  // collection, colour or SKU — so "black boots" and "BW-KN" both work.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = words.length
    ? all
        .filter((p) => {
          const hay = [
            p.name_en,
            p.categories?.name_en ?? "",
            ...p.product_collections.map((c) => c.collections?.name_en ?? ""),
            ...p.product_variants.filter((v) => v.is_active).flatMap((v) => [v.color_en, v.sku ?? ""]),
          ]
            .join(" ")
            .toLowerCase();
          return words.every((w) => hay.includes(w));
        })
        // name hits first
        .sort(
          (a, b) =>
            Number(!words.every((w) => a.name_en.toLowerCase().includes(w))) -
            Number(!words.every((w) => b.name_en.toLowerCase().includes(w))),
        )
    : [];
  const suggested = all.slice(0, 8);
  const shown = (words.length ? results : suggested).map(toCard);

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
        <h1 className="sr-only">{t(locale, "sf.search.title")}</h1>
        <div className="mx-auto max-w-3xl pt-6 sm:pt-0">
          <SearchField initial={q} placeholder={t(locale, "sf.nav.searchPlaceholder")} />
        </div>

        <nav aria-label={t(locale, "sf.search.categories")} className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2">
          {topCats.map((c) => (
            <Link
              key={c.code}
              href={lhref(locale, `/shop?cat=${c.code}`)}
              className="type-meta text-muted-foreground hover:text-foreground"
            >
              {c.name_en}
            </Link>
          ))}
        </nav>

        <div className="mb-6 mt-16 flex items-baseline justify-between gap-4">
          <h2 className="type-label" aria-live="polite">
            {words.length
              ? results.length === 1
                ? t(locale, "sf.search.result")
                : t(locale, "sf.search.results", { n: String(results.length) })
              : t(locale, "sf.search.suggested")}
          </h2>
          {words.length && results.length ? (
            <Link
              href={lhref(locale, `/shop?q=${encodeURIComponent(q)}`)}
              className="type-label underline underline-offset-4 hover:opacity-60"
            >
              {t(locale, "sf.search.filter")}
            </Link>
          ) : null}
        </div>

        {words.length && !results.length ? (
          <div className="mb-16">
            <p className="type-label">{t(locale, "sf.search.none", { q })}</p>
            <h2 className="type-heading mb-6 mt-16">{t(locale, "sf.search.suggested")}</h2>
            <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {suggested.map(toCard).map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
