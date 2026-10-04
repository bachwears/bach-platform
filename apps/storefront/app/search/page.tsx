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
    description: t(locale, "sf.meta.searchDescription"),
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

/** Optimal-string-alignment (Damerau–Levenshtein) distance, giving up past `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      // a swapped pair of letters ("chelsae") counts as one edit
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2]! + 1);
      cur.push(d);
      best = Math.min(best, d);
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]!;
}

// Typos allowed per query word: none under 4 letters, one from 4, two from 7.
const allowedTypos = (w: string) => (w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0);

/**
 * How a query word matches a product: 0 = exact (substring of the haystack),
 * 1..2 = typos against a name / category / colour word (or the start of one,
 * for a half-typed word), null = no match.
 */
function wordMatch(w: string, hay: string, tokens: string[]): number | null {
  if (hay.includes(w)) return 0;
  const k = allowedTypos(w);
  if (!k) return null;
  let best: number | null = null;
  for (const tok of tokens) {
    let d = editDistance(w, tok, k);
    if (d > k && tok.length > w.length) d = editDistance(w, tok.slice(0, w.length), k);
    if (d <= k && (best == null || d < best)) best = d;
    if (best === 1) break;
  }
  return best;
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
  // collection, colour or SKU — so "black boots" and "BW-KN" both work. A word
  // nothing contains may still match a name / category / colour word with a
  // typo or two ("chelsae" → Chelsea). Words that do hit exactly somewhere stay
  // exact, so "coat" never pulls in "cotton".
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const indexed = words.length
    ? all.map((p) => {
        const active = p.product_variants.filter((v) => v.is_active);
        const hay = [
          p.name_en,
          p.categories?.name_en ?? "",
          ...p.product_collections.map((c) => c.collections?.name_en ?? ""),
          ...active.flatMap((v) => [v.color_en, v.sku ?? ""]),
        ]
          .join(" ")
          .toLowerCase();
        const tokens = [
          ...new Set(
            [p.name_en, p.categories?.name_en ?? "", ...active.map((v) => v.color_en)]
              .join(" ")
              .toLowerCase()
              .split(/[^\p{L}\p{N}]+/u)
              .filter((x) => x.length >= 3),
          ),
        ];
        return { p, hay, tokens };
      })
    : [];
  const fuzzy = new Set(words.filter((w) => !indexed.some((x) => x.hay.includes(w))));
  const scored = indexed.flatMap(({ p, hay, tokens }) => {
    let typos = 0;
    for (const w of words) {
      const d = fuzzy.has(w) ? wordMatch(w, hay, tokens) : hay.includes(w) ? 0 : null;
      if (d == null) return [];
      typos += d;
    }
    const name = p.name_en.toLowerCase();
    return [{ p, typos, nameHit: words.every((w) => name.includes(w)) }];
  });
  // exact before fuzzy, then name hits first (stable sort keeps newest first within ties)
  const results = scored
    .sort((a, b) => a.typos - b.typos || Number(!a.nameHit) - Number(!b.nameHit))
    .map((r) => r.p);
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
