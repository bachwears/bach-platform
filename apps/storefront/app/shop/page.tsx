import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";
import { supabasePublic } from "@bach/supabase/public";
import { t } from "@bach/i18n";

import { FilterDrawer, type FilterSection } from "../../components/filter-drawer";
import { ProductCard, type CardProduct } from "../../components/product-card";
import { toCardProduct } from "../../lib/card";
import { getShopCatalog } from "../../lib/cached";
import { DensityToggle } from "../../components/density-toggle";
import { colorFill } from "../../lib/colors";
import { getLocale, lhref, pick } from "../../lib/locale";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const [locale, params] = await Promise.all([getLocale(), searchParams]);
  // A category or collection is its own indexable page (its own title and
  // canonical); size/colour/price filters fold back into it.
  if (params.cat || params.col) {
    const supabase = await supabaseServer();
    const { data: page } = params.cat
      ? await supabase.from("categories").select("name_en, name_ar").eq("code", params.cat).maybeSingle()
      : await supabase.from("collections").select("name_en, name_ar").eq("slug", params.col!).maybeSingle();
    if (page) {
      const name = pick(locale, page.name_en, page.name_ar);
      const query = params.cat ? `cat=${encodeURIComponent(params.cat)}` : `col=${encodeURIComponent(params.col!)}`;
      return {
        title: locale === "ar" ? `${name} — باخ ويرز` : `${name} — BACH Wears`,
        description:
          locale === "ar"
            ? `${name} من باخ ويرز. أناقة رجالية من لبنان.`
            : `${name} by BACH Wears. Considered menswear from Lebanon.`,
        alternates: { canonical: lhref(locale, `/shop?${query}`) },
        openGraph: { title: `${name} — BACH Wears`, url: `https://bachwears.com/shop?${query}` },
      };
    }
  }
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
  tags: string[] | null;
  categories: { code: string; name_en: string; name_ar: string } | null;
  media_assets: Array<{ kind: string; storage_path: string }>;
  product_seasons: Array<{ season: string }>;
  product_variants: Array<{ id: string; size: string; color_en: string; color_ar: string | null; is_active: boolean }>;
  product_collections: Array<{ collections: { slug: string; name_en: string } | null }>;
}

const SORTS: Array<[string, string]> = [
  ["featured", "sf.shop.featured"],
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

/** Pieces pinned in MGMT ("Pin as hero") lead the featured order. */
const isHero = (p: ShopProduct) => (p.tags ?? []).includes("hero");
const ANCHOR_EVERY = 8;
/** Pieces per page of the grid (a multiple of 2 and 4 so rows stay full). */
const PAGE = 48;

/**
 * "Featured" order (the default): the newest-first list, with a price anchor up
 * front and one more every 8 cards. The first price a shopper sees sets the
 * reference the rest is judged against, so the grid opens on a pinned hero or,
 * without one, the listing's top-priced piece — jackets on Shop All, the best
 * knits inside Knitwear — and keeps a recent reference in view down the scroll.
 * Anchors: pinned heroes, then pieces in the top quarter of this listing's prices.
 */
function anchored(list: ShopProduct[]): ShopProduct[] {
  if (list.length < 3) return list;
  const prices = list.map(price).sort((a, b) => b - a);
  const floor = prices[Math.floor(prices.length / 4)]!;
  const anchors = list
    .filter((p) => isHero(p) || price(p) >= floor)
    .sort((a, b) => Number(isHero(b)) - Number(isHero(a)) || price(b) - price(a))
    .slice(0, Math.ceil(list.length / ANCHOR_EVERY));
  const used = new Set(anchors);
  const rest = list.filter((p) => !used.has(p));
  const out: ShopProduct[] = [];
  for (const a of anchors) out.push(a, ...rest.splice(0, ANCHOR_EVERY - 1));
  return [...out, ...rest];
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
  const sort = params.sort ?? "featured";
  const sale = params.sale === "1";

  const locale = await getLocale();
  const { data, merch, catTree } = await getShopCatalog();
  // Pieces without a front photo stay off the storefront until they are shot
  // (MGMT flags them under Product Data Health).
  const all = ((data ?? []) as unknown as ShopProduct[]).filter((p) =>
    (p.media_assets ?? []).some((m) => m.kind === "front"),
  );
  const tree = catTree ?? [];
  // A category code matches everything underneath it, at any depth
  // (Shoes & Accessories → Shoes → Boots).
  const catCodes = (code: string) => {
    const set = new Set([code]);
    const walk = (id: string) => {
      for (const c of tree) {
        if (c.parent_id === id && !set.has(c.code)) {
          set.add(c.code);
          walk(c.id);
        }
      }
    };
    const node = tree.find((c) => c.code === code);
    if (node) walk(node.id);
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
  items = items.sort((a, b) => {
    if (sort === "price-asc") return price(a) - price(b);
    if (sort === "price-desc") return price(b) - price(a);
    return inSeason(a) - inSeason(b) || b.created_at.localeCompare(a.created_at);
  });
  if (sort === "featured") items = anchored(items);

  // A page of the grid at a time: only the shown pieces are rendered and sent to the
  // browser (the full catalogue would be a heavy page at 500+ models). "Load more"
  // links to the same page with a bigger ?show=, so it also works without script.
  const show = Math.min(items.length, Math.max(PAGE, Math.floor(Number(params.show) / PAGE) * PAGE || PAGE));
  const cards: CardProduct[] = items.slice(0, show).map(toCardProduct);

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
      sort: sort === "featured" ? undefined : sort,
      sale: sale ? "1" : undefined,
      // the large-photo view chosen on the way in (home → shop) survives "Load more"
      view: params.view,
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

  // Category context: the node, its ancestors (breadcrumb, banner), and the tab
  // strip — a category with sub-categories shows them; a leaf shows its siblings.
  const catNode = cat ? tree.find((c) => c.code === cat) : null;
  // a made-up or retired category code is a missing page, not an empty shop
  if (cat && !catNode) notFound();
  const ancestors: typeof tree = [];
  for (let n = catNode; n?.parent_id; ) {
    const up = tree.find((c) => c.id === n!.parent_id);
    if (!up || ancestors.includes(up)) break;
    ancestors.unshift(up);
    n = up;
  }
  const hasChildren = (id: string) => tree.some((c) => c.parent_id === id);
  const parentNode = catNode ? (hasChildren(catNode.id) ? catNode : ancestors[ancestors.length - 1] ?? catNode) : null;
  const codesWithProducts = new Set(all.map((p) => p.categories?.code).filter(Boolean));
  const hasProducts = (code: string) => [...catCodes(code)].some((k) => codesWithProducts.has(k));
  const byRow = (a: { sort: number; name_en: string }, b: { sort: number; name_en: string }) =>
    a.sort - b.sort || a.name_en.localeCompare(b.name_en);
  const tabs: Array<{ code: string; label: string; active: boolean }> = parentNode
    ? [
        { code: parentNode.code, label: t(locale, "sf.nav.viewAll"), active: cat === parentNode.code },
        ...tree
          .filter((c) => c.parent_id === parentNode.id && hasProducts(c.code))
          .sort(byRow)
          .map((c) => ({ code: c.code, label: pick(locale, c.name_en, c.name_ar), active: cat === c.code })),
      ]
    : [
        { code: "", label: t(locale, "sf.shop.allProducts"), active: !cat },
        ...tree
          .filter((c) => !c.parent_id && hasProducts(c.code))
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
  // collection, else the category's own banner, else its parent's. Banners
  // come as a wide desktop crop (banner_url) and a portrait phone crop
  // (banner_mobile_url).
  type Banner = { banner_url?: string | null; banner_mobile_url?: string | null; name_en: string };
  let headerImage: { url: string; mobile: string | null; alt: string } | null = null;
  if (col) {
    const { data: colRow } = await supabasePublic().from("collections").select("cover_url, name_en, description_en").eq("slug", col).maybeSingle();
    if (colRow?.cover_url) headerImage = { url: colRow.cover_url, mobile: null, alt: colRow.name_en };
  } else {
    const src = [catNode, ...[...ancestors].reverse()].find((n) => (n as Banner | null)?.banner_url) as Banner | undefined;
    if (src) headerImage = { url: src.banner_url!, mobile: src.banner_mobile_url ?? null, alt: src.name_en };
  }

  const sections: FilterSection[] = [
    {
      label: t(locale, "sf.shop.sort"),
      kind: "list",
      options: SORTS.map(([k, labelKey]) => ({
        label: t(locale, labelKey),
        href: href({ sort: k === "featured" ? undefined : k }),
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
        <picture className="anim-fade block">
          {headerImage.mobile ? <source media="(min-width: 640px)" srcSet={headerImage.url} /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImage.mobile ?? headerImage.url}
            alt={headerImage.alt}
            fetchPriority="high"
            className="aspect-[4/5] w-full object-cover object-[center_30%] sm:aspect-[21/9] sm:max-h-[75vh] sm:object-[center_20%]"
          />
        </picture>
      ) : null}
      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-8">
        {/* Inside a category the shopper already knows where they are: breadcrumb,
            title and count stay for search engines and screen readers only. */}
        <nav aria-label="Breadcrumb" className={cat ? "sr-only" : "type-meta text-muted-foreground"}>
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
            {ancestors.map((a) => (
              <Fragment key={a.code}>
                <li aria-hidden>/</li>
                <li>
                  <Link href={href({ cat: a.code })} className="hover:text-foreground">
                    {pick(locale, a.name_en, a.name_ar)}
                  </Link>
                </li>
              </Fragment>
            ))}
            {catNode && (
              <>
                <li aria-hidden>/</li>
                <li className="text-foreground">{pick(locale, catNode.name_en, catNode.name_ar)}</li>
              </>
            )}
          </ol>
        </nav>

        <h1 className={cat ? "sr-only" : "type-display mt-6 text-[34px] sm:text-5xl"} style={{ textWrap: "balance" }}>
          {title}
        </h1>
        <p className={cat ? "sr-only" : "type-meta mt-3 text-muted-foreground"}>
          {items.length} {items.length === 1 ? t(locale, "sf.shop.piece") : t(locale, "sf.shop.pieces")}
          {(activeFilters > 0 || cat) && (
            <>
              {" · "}
              <Link href={lhref(locale, "/shop")} className="underline underline-offset-4 hover:text-foreground">
                {t(locale, "sf.shop.clearAll")}
              </Link>
            </>
          )}
        </p>

        <div className={`-mx-4 overflow-x-auto ${cat ? "" : "mt-6"} px-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden`}>
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
            resultCount={items.length}
            clearHref={href({ size: undefined, color: undefined, price: undefined, sale: undefined })}
          />
          <DensityToggle target="product-grid" />
        </div>

        {cards.length ? (
          <>
          <div
            id="product-grid"
            data-density="standard"
            className="mt-4 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4 data-[density=large]:grid-cols-1 lg:data-[density=large]:grid-cols-2"
          >
            {cards.map((p, i) => (
              // the first row (2 on phones, 4 on desktop) is what the shopper sees first
              <ProductCard key={p.slug} product={p} locale={locale} priority={i < 4} source={sort === "featured" ? "shop_featured" : "shop"} />
            ))}
          </div>
          {items.length > show ? (
            <div className="mt-14 flex flex-col items-center gap-3">
              <p className="type-meta text-muted-foreground tabular-nums">
                {t(locale, "sf.shop.showing", { n: String(show), total: String(items.length) })}
              </p>
              <div className="h-px w-40 bg-foreground/15" aria-hidden>
                <div className="h-px bg-foreground" style={{ width: `${Math.round((show / items.length) * 100)}%` }} />
              </div>
              {/* keeps the scroll position: the next page appends below what's already seen */}
              <Link
                href={href({ show: String(show + PAGE) })}
                scroll={false}
                className="type-label mt-3 grid h-12 w-full max-w-72 place-items-center border border-foreground hover:bg-foreground hover:text-background"
              >
                {t(locale, "sf.shop.loadMore")}
              </Link>
            </div>
          ) : null}
          </>
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
