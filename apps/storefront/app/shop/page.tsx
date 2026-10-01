import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { FilterDrawer, type FilterSection } from "../../components/filter-drawer";
import { ProductCard, type CardProduct } from "../../components/product-card";
import { DensityToggle } from "../../components/density-toggle";
import { colorFill } from "../../lib/colors";
import { getLocale, lhref, pick } from "../../lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: locale === "ar" ? "تسوّق — باخ ويرز" : "Shop — BACH Wears",
    description:
      locale === "ar"
        ? "مجموعة باخ ويرز الكاملة. أناقة رجالية من لبنان."
        : "The full BACH Wears collection. Considered menswear from Lebanon.",
    alternates: { canonical: lhref(locale, "/shop") },
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
  product_variants: Array<{ id: string; size: string; color_en: string; color_ar: string | null; is_active: boolean }>;
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
  const [{ data }, { data: merch }, { data: catTree }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, created_at, categories(code, name_en, name_ar), media_assets(kind, storage_path), product_seasons(season), product_variants(id, size, color_en, color_ar, is_active), product_collections(collections(slug, name_en))",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("merchandising_settings").select("active_season").maybeSingle(),
    supabase.from("categories").select("id, code, name_en, name_ar, sort, parent_id, banner_url"),
  ]);
  const all = (data ?? []) as unknown as ShopProduct[];
  const tree = catTree ?? [];
  // A parent category code matches every child underneath it.
  const catCodes = (code: string) => {
    const set = new Set([code]);
    const node = tree.find((c) => c.code === code);
    if (node) for (const c of tree) if (c.parent_id === node.id) set.add(c.code);
    return set;
  };
  const catMatch = cat ? catCodes(cat) : new Set<string>();
  const activeSeason = merch?.active_season ?? "all_season";

  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const sizeRank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    if (i >= 0) return i;
    const n = Number(s);
    return Number.isFinite(n) ? 100 + n : 999;
  };
  // Facets come from live data so filters only ever offer values that exist.
  const sizeFacets = [
    ...new Set(all.flatMap((p) => p.product_variants.filter((v) => v.is_active).map((v) => v.size))),
  ].sort((a, b) => sizeRank(a) - sizeRank(b));
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

  interface Filters {
    cat: string;
    col: string;
    size: string;
    color: string;
    band: string;
    sale: boolean;
  }
  const current: Filters = { cat, col, size, color, band, sale };
  const matches = (p: ShopProduct, f: Filters) => {
    if (q && !p.name_en.toLowerCase().includes(q) && !(p.name_ar ?? "").includes((params.q ?? "").trim())) return false;
    if (f.cat && !(f.cat === cat ? catMatch : catCodes(f.cat)).has(p.categories?.code ?? "")) return false;
    if (f.col && !p.product_collections.some((pc) => pc.collections?.slug === f.col)) return false;
    if (f.size && !p.product_variants.some((v) => v.is_active && v.size === f.size)) return false;
    if (f.color && !p.product_variants.some((v) => v.is_active && v.color_en === f.color)) return false;
    if (f.sale && p.sale_price_usd_cents == null) return false;
    if (f.band) {
      const b = PRICE_BANDS.find(([k]) => k === f.band);
      if (b && (price(p) < b[2] || price(p) > b[3])) return false;
    }
    return true;
  };
  const countWith = (patch: Partial<Filters>) => all.filter((p) => matches(p, { ...current, ...patch })).length;
  let items = all.filter((p) => matches(p, current));

  const inSeason = (p: ShopProduct) => {
    if (activeSeason === "all_season") return 0;
    const seasons = p.product_seasons.map((s) => s.season);
    return seasons.includes(activeSeason) || seasons.includes("all_season") || seasons.length === 0 ? 0 : 1;
  };
  // pieces still waiting on photography never lead a grid, whatever the sort
  const unshot = (p: ShopProduct) => ((p.media_assets ?? []).some((m) => m.kind === "front") ? 0 : 1);
  items = items.sort((a, b) => {
    const photo = unshot(a) - unshot(b);
    if (photo) return photo;
    if (sort === "price-asc") return price(a) - price(b);
    if (sort === "price-desc") return price(b) - price(a);
    return inSeason(a) - inSeason(b) || b.created_at.localeCompare(a.created_at);
  });

  const cards: CardProduct[] = items.map((p) => {
    const media = p.media_assets ?? [];
    const seen = new Set<string>();
    const sizes = p.product_variants
      .filter((v) => v.is_active && !seen.has(v.size) && seen.add(v.size))
      .sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
      .map((v) => ({ variantId: v.id, size: v.size }));
    return {
      slug: p.slug,
      name_en: p.name_en,
      name_ar: p.name_ar,
      price_usd_cents: p.price_usd_cents,
      sale_price_usd_cents: p.sale_price_usd_cents,
      front: media.find((m) => m.kind === "front")?.storage_path ?? null,
      back: media.find((m) => m.kind === "back")?.storage_path ?? null,
      colors: p.product_variants.filter((v) => v.is_active).map((v) => v.color_en),
      sizes,
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
  const activeFilters = [col, size, color, band, sale ? "sale" : ""].filter(Boolean).length + (q ? 1 : 0);
  const saleOnly = sale && activeFilters === 1 && !cat;
  // Facets the shopper picked in the drawer — the collection or category being browsed isn't one.
  const drawerActive = [size, color, band, sale ? "sale" : ""].filter(Boolean).length;
  const colName = col
    ? all.flatMap((p) => p.product_collections).find((pc) => pc.collections?.slug === col)?.collections?.name_en ?? col
    : null;

  // Category context: node, its parent, and the tab strip of siblings.
  const catNode = cat ? tree.find((c) => c.code === cat) : null;
  const parentNode = catNode?.parent_id ? tree.find((c) => c.id === catNode.parent_id) : catNode && !catNode.parent_id ? catNode : null;
  const codesWithProducts = new Set(all.map((p) => p.categories?.code).filter(Boolean));
  const byRow = (a: { sort: number; name_en: string }, b: { sort: number; name_en: string }) =>
    a.sort - b.sort || a.name_en.localeCompare(b.name_en);
  const tabs: Array<{ code: string; label: string; active: boolean }> = parentNode
    ? [
        { code: parentNode.code, label: `${t(locale, "sf.shop.allProducts")} — ${pick(locale, parentNode.name_en, parentNode.name_ar)}`, active: cat === parentNode.code },
        ...tree
          .filter((c) => c.parent_id === parentNode.id && codesWithProducts.has(c.code))
          .sort(byRow)
          .map((c) => ({ code: c.code, label: pick(locale, c.name_en, c.name_ar), active: cat === c.code })),
      ]
    : [
        { code: "", label: t(locale, "sf.shop.allProducts"), active: !cat },
        ...tree
          .filter((c) => !c.parent_id && [...catCodes(c.code)].some((k) => codesWithProducts.has(k)))
          .sort(byRow)
          .map((c) => ({ code: c.code, label: pick(locale, c.name_en, c.name_ar), active: false })),
      ];

  const title = q
    ? t(locale, "sf.shop.search", { q: params.q ?? "" })
    : colName ??
      (catNode
        ? pick(locale, catNode.name_en, catNode.name_ar)
        : t(locale, sale ? "sf.shop.saleTitle" : "sf.shop.allProducts"));

  // Editorial header imagery: the collection's cover when browsing a
  // collection, else the parent category's banner.
  let headerImage: { url: string; alt: string } | null = null;
  if (col) {
    const { data: colRow } = await supabase.from("collections").select("cover_url, name_en, description_en").eq("slug", col).maybeSingle();
    if (colRow?.cover_url) headerImage = { url: colRow.cover_url, alt: colRow.name_en };
  } else if (parentNode && (parentNode as { banner_url?: string | null }).banner_url) {
    headerImage = { url: (parentNode as { banner_url?: string | null }).banner_url!, alt: parentNode.name_en };
  }

  const sections: FilterSection[] = [
    {
      label: t(locale, "sf.shop.sort"),
      kind: "list",
      options: SORTS.map(([k, labelKey]) => ({
        label: t(locale, labelKey),
        href: href({ sort: k === "new" ? undefined : k }),
        active: sort === k,
      })),
    },
  ];
  if (sizeFacets.length > 1) {
    sections.push({
      label: t(locale, "sf.shop.size"),
      options: sizeFacets.map((s) => ({
        label: s,
        href: href({ size: size === s ? undefined : s }),
        active: size === s,
        count: countWith({ size: s }),
      })),
    });
  }
  if (colorFacets.length > 1) {
    sections.push({
      label: t(locale, "sf.shop.color"),
      kind: "swatch",
      options: colorFacets.map(([value, label]) => ({
        label,
        href: href({ color: color === value ? undefined : value }),
        active: color === value,
        count: countWith({ color: value }),
        swatch: colorFill(value),
      })),
    });
  }
  sections.push({
    label: t(locale, "sf.shop.price"),
    options: [
      ...PRICE_BANDS.map(([k, labelKey]) => ({
        label: t(locale, labelKey),
        href: href({ price: band === k ? undefined : k }),
        active: band === k,
        count: countWith({ band: k }),
      })),
      {
        label: t(locale, "sf.shop.onSale"),
        href: href({ sale: sale ? undefined : "1" }),
        active: sale,
        count: countWith({ sale: true }),
      },
    ],
  });

  return (
    <div className="min-h-dvh bg-background">
      {headerImage ? (
        <div className="anim-fade">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImage.url}
            alt={headerImage.alt}
            className="aspect-[4/5] w-full object-cover object-[center_30%] sm:aspect-[21/9]"
          />
        </div>
      ) : null}
      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-8">
        <nav aria-label="Breadcrumb" className="type-meta text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={lhref(locale, "/")} className="hover:text-foreground">
                {t(locale, "sf.shop.home")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={lhref(locale, "/shop")} className="hover:text-foreground">
                {t(locale, "sf.shop.title")}
              </Link>
            </li>
            {parentNode && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href({ cat: parentNode.code })} className="hover:text-foreground">
                    {pick(locale, parentNode.name_en, parentNode.name_ar)}
                  </Link>
                </li>
              </>
            )}
            {catNode && catNode.parent_id && (
              <>
                <li aria-hidden>/</li>
                <li className="text-foreground">{pick(locale, catNode.name_en, catNode.name_ar)}</li>
              </>
            )}
          </ol>
        </nav>

        <h1 className="type-display mt-6 text-[34px] sm:text-5xl" style={{ textWrap: "balance" }}>
          {title}
        </h1>
        <p className="type-meta mt-3 text-muted-foreground">
          {cards.length} {cards.length === 1 ? t(locale, "sf.shop.piece") : t(locale, "sf.shop.pieces")}
          {(activeFilters > 0 || cat) && (
            <>
              {" · "}
              <Link href={lhref(locale, "/shop")} className="underline underline-offset-4 hover:text-foreground">
                {t(locale, "sf.shop.clearAll")}
              </Link>
            </>
          )}
        </p>

        <div className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-6 whitespace-nowrap">
            {tabs.map((tab) => (
              <Link
                key={tab.code || "all"}
                href={href({ cat: tab.code || undefined })}
                aria-current={tab.active ? "page" : undefined}
                className={`type-label border-b pb-1 ${
                  tab.active ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <FilterDrawer
            sections={sections}
            activeCount={drawerActive}
            resultCount={cards.length}
            clearHref={href({ size: undefined, color: undefined, price: undefined, sale: undefined })}
          />
          <DensityToggle target="product-grid" />
        </div>

        {cards.length ? (
          <div
            id="product-grid"
            data-density="standard"
            className="mt-4 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4 data-[density=large]:grid-cols-1 lg:data-[density=large]:grid-cols-2"
          >
            {cards.map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <p className="type-label text-muted-foreground">{t(locale, saleOnly ? "sf.shop.saleEmpty" : "sf.shop.empty")}</p>
            <Link href={lhref(locale, "/shop")} className="type-label mt-3 inline-block underline underline-offset-4">
              {t(locale, saleOnly ? "sf.shop.allProducts" : "sf.shop.clear")}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
