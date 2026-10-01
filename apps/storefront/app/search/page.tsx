import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../../components/product-card";
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

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isFinite(n) ? 100 + n : 999;
};

function toCard(p: Row): CardProduct {
  const active = p.product_variants.filter((v) => v.is_active);
  const seen = new Set<string>();
  return {
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    price_usd_cents: p.price_usd_cents,
    sale_price_usd_cents: p.sale_price_usd_cents,
    front: p.media_assets.find((m) => m.kind === "front")?.storage_path ?? null,
    back: p.media_assets.find((m) => m.kind === "back")?.storage_path ?? null,
    colors: active.map((v) => v.color_en),
    sizes: active
      .filter((v) => !seen.has(v.size) && seen.add(v.size))
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
      .map((v) => ({ variantId: v.id, size: v.size })),
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw = "" } = await searchParams;
  const q = raw.trim();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, created_at, categories(name_en), media_assets(kind, storage_path), product_variants(id, size, color_en, sku, is_active), product_collections(collections(name_en))",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("code, name_en, sort").is("parent_id", null).order("sort"),
  ]);
  const hasPhoto = (p: Row) => p.media_assets.some((m) => m.kind === "front");
  // unphotographed pieces stay hidden until they are shot
  const all = ((data ?? []) as unknown as Row[]).filter(hasPhoto);

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
        <div className="max-w-3xl">
          <SearchField initial={q} placeholder={t(locale, "sf.nav.searchPlaceholder")} />
        </div>

        <nav aria-label={t(locale, "sf.search.categories")} className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {(cats ?? []).map((c) => (
            <Link
              key={c.code}
              href={lhref(locale, `/shop?cat=${c.code}`)}
              className="type-meta text-muted-foreground hover:text-foreground"
            >
              {c.name_en}
            </Link>
          ))}
        </nav>

        <div className="mb-6 mt-12 flex items-baseline justify-between gap-4">
          <h2 className="type-heading" aria-live="polite">
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
