import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { ProductCard, type CardProduct } from "../../components/product-card";
import { SearchBox } from "../../components/search-box";
import { getLocale, lhref, pick } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "ar" ? "تسوّق — باخ ويرز" : "Shop — BACH Wears",
    description:
      locale === "ar"
        ? "مجموعة باخ ويرز الكاملة. أناقة رجالية من لبنان."
        : "The full BACH Wears collection. Considered menswear from Lebanon.",
    alternates: { canonical: lhref(locale, "/shop"), languages: { en: "/shop", ar: "/ar/shop" } },
  };
}

interface ShopProduct {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  created_at: string;
  categories: { code: string; name_en: string; name_ar: string } | null;
  media_assets: Array<{ kind: string; storage_path: string }>;
  product_seasons: Array<{ season: string }>;
  product_variants: Array<{ size: string; color_en: string; color_ar: string | null; is_active: boolean }>;
  product_collections: Array<{ collections: { slug: string; name_en: string } | null }>;
}

const SORTS: Array<[string, string]> = [
  ["new", "sf.shop.newest"],
  ["price-asc", "sf.shop.priceAsc"],
  ["price-desc", "sf.shop.priceDesc"],
];

const PRICE_BANDS: Array<[string, string, number, number]> = [
  ["under-50", "sf.shop.under50", 0, 4999],
  ["50-100", "sf.shop.50to100", 5000, 10000],
  ["over-100", "sf.shop.over100", 10001, Number.MAX_SAFE_INTEGER],
];

function price(p: ShopProduct) {
  return Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const cat = params.cat ?? "";
  const col = params.col ?? "";
  const size = params.size ?? "";
  const color = params.color ?? "";
  const band = params.price ?? "";
  const sort = params.sort ?? "new";
  const sale = params.sale === "1";

  const locale = await getLocale();
  const supabase = await supabaseServer();
  const [{ data }, { data: merch }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, created_at, categories(code, name_en, name_ar), media_assets(kind, storage_path), product_seasons(season), product_variants(size, color_en, color_ar, is_active), product_collections(collections(slug, name_en))",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("merchandising_settings").select("active_season").maybeSingle(),
  ]);
  const all = (data ?? []) as unknown as ShopProduct[];
  const activeSeason = merch?.active_season ?? "all_season";

  // Facets come from live data so filters only ever offer values that exist.
  const catFacets = [
    ...new Map(
      all
        .filter((p) => p.categories)
        .map((p) => [p.categories!.code, pick(locale, p.categories!.name_en, p.categories!.name_ar)] as const),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const sizeFacets = [
    ...new Set(all.flatMap((p) => p.product_variants.filter((v) => v.is_active).map((v) => v.size))),
  ].sort();
  // Value stays color_en (stable URLs); label localizes via color_ar.
  const colorFacets = [
    ...new Map(
      all
        .flatMap((p) => p.product_variants.filter((v) => v.is_active))
        .map((v) => [v.color_en, pick(locale, v.color_en, v.color_ar)] as const),
    ).entries(),
  ]
    .filter(([c]) => c && c !== "Standard")
    .sort((a, b) => a[1].localeCompare(b[1]));

  let items = all.filter((p) => {
    if (q && !p.name_en.toLowerCase().includes(q) && !(p.name_ar ?? "").includes((params.q ?? "").trim())) return false;
    if (cat && p.categories?.code !== cat) return false;
    if (col && !p.product_collections.some((pc) => pc.collections?.slug === col)) return false;
    if (size && !p.product_variants.some((v) => v.is_active && v.size === size)) return false;
    if (color && !p.product_variants.some((v) => v.is_active && v.color_en === color)) return false;
    if (sale && p.sale_price_usd_cents == null) return false;
    if (band) {
      const b = PRICE_BANDS.find(([k]) => k === band);
      if (b && (price(p) < b[2] || price(p) > b[3])) return false;
    }
    return true;
  });

  const inSeason = (p: ShopProduct) => {
    if (activeSeason === "all_season") return 0;
    const seasons = p.product_seasons.map((s) => s.season);
    return seasons.includes(activeSeason) || seasons.includes("all_season") || seasons.length === 0 ? 0 : 1;
  };
  items = items.sort((a, b) => {
    if (sort === "price-asc") return price(a) - price(b);
    if (sort === "price-desc") return price(b) - price(a);
    return inSeason(a) - inSeason(b) || b.created_at.localeCompare(a.created_at);
  });

  const cards: CardProduct[] = items.map((p) => {
    const media = p.media_assets ?? [];
    return {
      slug: p.slug,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      front: media.find((m) => m.kind === "front")?.storage_path ?? null,
      back: media.find((m) => m.kind === "back")?.storage_path ?? null,
    };
  });

  // URL builder: toggles one param while keeping the rest, so every state is a link.
  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: params.q,
      cat,
      col,
      size,
      color,
      price: band,
      sort: sort === "new" ? undefined : sort,
      sale: sale ? "1" : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return lhref(locale, s ? `/shop?${s}` : "/shop");
  };
  const activeFilters = [cat, col, size, color, band, sale ? "sale" : ""].filter(Boolean).length + (q ? 1 : 0);
  const colName = col
    ? all.flatMap((p) => p.product_collections).find((pc) => pc.collections?.slug === col)?.collections?.name_en ?? col
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {q ? t(locale, "sf.shop.search", { q: params.q ?? "" }) : colName ?? t(locale, "sf.shop.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cards.length} {cards.length === 1 ? t(locale, "sf.shop.piece") : t(locale, "sf.shop.pieces")}
              {activeFilters > 0 && (
                <>
                  {" · "}
                  <Link href={lhref(locale, "/shop")} className="underline underline-offset-4">
                    {t(locale, "sf.shop.clearAll")}
                  </Link>
                </>
              )}
            </p>
          </div>
          <SearchBox initial={params.q ?? ""} />
        </div>

        <div className="mt-6 space-y-3 border-y py-4 text-sm">
          <FacetRow label={t(locale, "sf.shop.category")}>
            {catFacets.map(([code, name]) => (
              <Chip key={code} href={href({ cat: cat === code ? undefined : code })} active={cat === code}>
                {name}
              </Chip>
            ))}
          </FacetRow>
          {sizeFacets.length > 1 && (
            <FacetRow label={t(locale, "sf.shop.size")}>
              {sizeFacets.map((s) => (
                <Chip key={s} href={href({ size: size === s ? undefined : s })} active={size === s}>
                  {s}
                </Chip>
              ))}
            </FacetRow>
          )}
          {colorFacets.length > 1 && (
            <FacetRow label={t(locale, "sf.shop.color")}>
              {colorFacets.map(([value, label]) => (
                <Chip key={value} href={href({ color: color === value ? undefined : value })} active={color === value}>
                  {label}
                </Chip>
              ))}
            </FacetRow>
          )}
          <FacetRow label={t(locale, "sf.shop.price")}>
            {PRICE_BANDS.map(([k, labelKey]) => (
              <Chip key={k} href={href({ price: band === k ? undefined : k })} active={band === k}>
                {t(locale, labelKey)}
              </Chip>
            ))}
            <Chip href={href({ sale: sale ? undefined : "1" })} active={sale}>
              {t(locale, "sf.shop.onSale")}
            </Chip>
          </FacetRow>
          <FacetRow label={t(locale, "sf.shop.sort")}>
            {SORTS.map(([k, labelKey]) => (
              <Chip key={k} href={href({ sort: k === "new" ? undefined : k })} active={sort === k}>
                {t(locale, labelKey)}
              </Chip>
            ))}
          </FacetRow>
        </div>

        {cards.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center text-muted-foreground">
            <p>{t(locale, "sf.shop.empty")}</p>
            <Link href={lhref(locale, "/shop")} className="mt-2 inline-block underline underline-offset-4">
              {t(locale, "sf.shop.clear")}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
