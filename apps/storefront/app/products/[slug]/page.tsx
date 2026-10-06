import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { t } from "@bach/i18n";

import { AddToCart } from "../../../components/add-to-cart";
import { PdpTabs } from "../../../components/pdp-tabs";
import { PdpColourGallery, PdpColourProvider } from "../../../components/pdp-colour";
import { PdpTopBar } from "../../../components/pdp-topbar";
import type { GalleryImage } from "../../../components/pdp-gallery";
import { ProductCard, type CardProduct } from "../../../components/product-card";
import { CARD_COLUMNS, toCardProduct, type CardRow } from "../../../lib/card";
import { photoView } from "../../../lib/media";
import { sizeRun } from "../../../lib/sizes";
import { RecentlyViewed } from "../../../components/recently-viewed";
import { SizeGuide, type SizeGuideData } from "../../../components/size-guide";
import { FitFinder } from "../../../components/fit-finder";
import { ProductViewTracker } from "../../../components/track-events";
import { getLocale, lhref, pick } from "../../../lib/locale";
import { getShopCatalog } from "../../../lib/cached";
import { PdpStrip, PdpSwipe, type PdpNavItem } from "../../../components/pdp-nav";

interface VariantRow {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  color_ar: string | null;
  is_active: boolean;
  inventory_levels: Array<{ quantity: number; reserved: number }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// one query per request: generateMetadata and the page share it
const getProduct = cache(async (slug: string) => {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name_en, name_ar, description_en, description_ar, meta_title_en, meta_description_en, price_usd_cents, sale_price_usd_cents, material_en, material_ar, care_en, care_ar, fit, category_id, categories(code, name_en, name_ar), media_assets(*), product_seasons(season), product_collections(collection_id), product_variants(id, size, color_code, color_en, color_ar, is_active, inventory_levels(quantity, reserved))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([getProduct(slug), getLocale()]);
  if (!product) return { title: "BACH Wears" };
  const name = product.name_en; // product names stay English in every locale
  // MGMT's SEO fields win when set; otherwise name + description
  const title = product.meta_title_en || (locale === "ar" ? `${name} — باخ ويرز` : `${name} — BACH Wears`);
  const description =
    product.meta_description_en ||
    pick(locale, product.description_en ?? "", product.description_ar) ||
    `${name} by BACH Wears.`;
  const front = ((product.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? []).find(
    (m) => m.kind === "front",
  )?.storage_path;
  return {
    title,
    description,
    alternates: {
      canonical: lhref(locale, `/products/${slug}`),
    },
    // shared links (WhatsApp, Instagram) preview the piece, not the homepage
    openGraph: {
      type: "website",
      title,
      description,
      url: `https://bachwears.com/products/${slug}`,
      ...(front ? { images: [{ url: front.replace(/-1600\.webp$/, "-800.webp"), alt: name }] } : {}),
    },
    // a piece without photos isn't listed anywhere yet — keep it out of search too
    robots: ((product.media_assets as unknown as Array<{ kind: string }>) ?? []).some((m) => m.kind === "front")
      ? undefined
      : { index: false, follow: true },
  };
}

// Extra photos (kind "other") reach the site only inside this sort window; MGMT keeps the rest.
const SHOWN_EXTRA = (sort: number | null) => sort != null && sort >= 100 && sort < 500;

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { slug } = await params;
  const { color: colorParam } = await searchParams;
  const [product, locale] = await Promise.all([getProduct(slug), getLocale()]);
  if (!product) notFound();

  const media =
    (product.media_assets as unknown as Array<{ kind: string; storage_path: string; color_en?: string | null; sort: number | null }>) ?? [];
  // The colour the main photos show (set in MGMT); preselected in the buy box.
  const shownColor = (media.find((m) => m.kind === "front") ?? media[0])?.color_en ?? null;
  const toImage = (m: { kind: string; storage_path: string }): GalleryImage => ({ kind: m.kind, url: m.storage_path });
  // Opening a piece shows it worn first (founder order 2026-10-05): the waist-up
  // worn close-up, the full worn shot from the front, then from the back, any
  // further worn shots, then the product front and back, then details.
  // Slot kinds say it for the main photos; extra photos carry the view in their file name.
  const viewRank = (m: { kind: string; storage_path: string }) => {
    const { view, numbered } = photoView(m);
    if (view === "model-zoom") return numbered ? 3 : 0;
    if (view === "model-front" || view === "model") return numbered ? 3 : 1;
    if (view === "model-back") return numbered ? 3 : 2;
    return ({ front: 4, back: 5, detail: 6 } as Record<string, number>)[view] ?? 7;
  };
  const wornFirst = <T extends { kind: string; storage_path: string }>(list: T[]) =>
    list.map((m, i) => ({ m, i })).sort((a, b) => viewRank(a.m) - viewRank(b.m) || a.i - b.i).map((x) => x.m);
  const extras = media
    .filter((m) => m.kind === "other" && m.color_en && SHOWN_EXTRA(m.sort))
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const gallery = wornFirst([
    ...(["front", "back", "side", "closeup"]
      .map((kind) => media.find((m) => m.kind === kind))
      .filter(Boolean) as Array<{ kind: string; storage_path: string }>),
    ...extras.filter((m) => m.color_en === shownColor),
  ]).map(toImage);
  // Every other colour with photos of its own gets its own gallery.
  const colorGalleries: Record<string, GalleryImage[]> = {};
  for (const m of wornFirst(extras)) {
    if (m.color_en === shownColor) continue;
    (colorGalleries[m.color_en!] ??= []).push(toImage(m));
  }

  const variants = ((product.product_variants as unknown as VariantRow[]) ?? []).filter(
    (v) => v.is_active,
  );
  // ?color=NAV opens on that colour (shared links keep the shopper's pick)
  const linkedColor = colorParam ? variants.find((v) => v.color_code === colorParam.toUpperCase()) : undefined;
  const onSale = product.sale_price_usd_cents != null && product.sale_price_usd_cents < product.price_usd_cents;
  const category = product.categories as unknown as { code: string; name_en: string; name_ar: string } | null;
  const displayName = product.name_en; // product names stay English in every locale
  const displayDescription = pick(locale, product.description_en ?? "", product.description_ar) || null;
  const categoryName = category ? pick(locale, category.name_en, category.name_ar) : null;
  const collectionIds = ((product.product_collections as unknown as Array<{ collection_id: string }>) ?? []).map(
    (c) => c.collection_id,
  );
  const seasons = ((product.product_seasons as unknown as Array<{ season: string }>) ?? []).map((s) => s.season);

  const supabase = await supabaseServer();
  // The category and every category above it (Boots → Shoes → Shoes & Accessories):
  // a size guide or one-size rule set on a parent covers the labels under it.
  const { data: catTree } = category
    ? await supabase.from("categories").select("id, code, parent_id")
    : { data: [] as Array<{ id: string; code: string; parent_id: string | null }> };
  const lineage: string[] = [];
  for (let n = (catTree ?? []).find((c) => c.code === category?.code); n && !lineage.includes(n.code); ) {
    lineage.push(n.code);
    n = (catTree ?? []).find((c) => c.id === n!.parent_id);
  }
  const cardSelect = `id, category_id, ${CARD_COLUMNS}`;

  // The category's pieces in shop order (cached catalogue): the phone strip at the
  // bottom and the sideways swipe to the next / previous piece.
  const [{ data: catalog }, { data: colourRows }] = await Promise.all([
    getShopCatalog(),
    // the MGMT colour list: each colour choice is shown as its swatch, never a word
    supabase.from("colours").select("name_en, hex, hex2"),
  ]);
  const colourFills: Record<string, string> = {};
  for (const c of (colourRows ?? []) as Array<{ name_en: string; hex: string | null; hex2: string | null }>) {
    if (!c.hex) continue;
    colourFills[c.name_en.toLowerCase()] = c.hex2 ? `linear-gradient(135deg, ${c.hex} 50%, ${c.hex2} 50%)` : c.hex;
  }
  type NavRow = { slug: string; name_en: string; categories: { code: string } | null; media_assets: Array<{ kind: string; storage_path: string }> | null };
  const navItems: PdpNavItem[] = category
    ? ((catalog ?? []) as unknown as NavRow[])
        .filter((p) => p.categories?.code === category.code)
        .map((p) => ({ p, front: (p.media_assets ?? []).find((m) => m.kind === "front")?.storage_path ?? null }))
        .filter(({ front }) => front)
        .map(({ p, front }) => ({
          slug: p.slug,
          href: lhref(locale, `/products/${p.slug}`),
          name: p.name_en,
          img: front!.replace(/-1600\.webp$/, "-400.webp"),
        }))
    : [];
  const navAt = navItems.findIndex((i) => i.slug === product.slug);
  const prevHref = navAt > 0 ? navItems[navAt - 1]!.href : null;
  const nextHref = navAt >= 0 && navAt < navItems.length - 1 ? navItems[navAt + 1]!.href : null;

  // "You may also like": same category, newest first.
  const relatedQ = product.category_id
    ? supabase
        .from("products")
        .select(cardSelect)
        .eq("status", "published")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .order("created_at", { ascending: false })
        .limit(80)
    : Promise.resolve({ data: [] });

  // "Complete the look": products from other categories sharing a collection,
  // falling back to a shared season when the product has no collection.
  const lookIdsQ = collectionIds.length
    ? supabase.from("product_collections").select("product_id").in("collection_id", collectionIds).limit(60)
    : seasons.length
      ? supabase.from("product_seasons").select("product_id").in("season", seasons).limit(60)
      : Promise.resolve({ data: [] as Array<{ product_id: string }> });

  const [{ data: relatedRaw }, { data: lookIdRows }, { data: guideRow }, { data: pairRows }] = await Promise.all([
    relatedQ,
    lookIdsQ,
    category
      ? supabase
          .from("size_guides")
          .select("name_en, name_ar, note_en, note_ar, headers_en, headers_ar, rows, category_codes")
          .overlaps("category_codes", lineage.length ? lineage : [category.code])
      : Promise.resolve({ data: [] }),
    // "Wear with": the pieces staff paired with this one in MGMT (in their order)
    supabase.from("product_pairings").select("paired_id, sort").eq("product_id", product.id).order("sort"),
  ]);
  const pairIds = (pairRows ?? []).map((r) => r.paired_id as string);
  const { data: pairRaw } = pairIds.length
    ? await supabase.from("products").select(cardSelect).eq("status", "published").in("id", pairIds)
    : { data: [] };

  const lookIds = [...new Set((lookIdRows ?? []).map((r) => r.product_id))].filter((id) => id !== product.id);
  const { data: lookRaw } = lookIds.length
    ? await supabase
        .from("products")
        .select(cardSelect)
        .eq("status", "published")
        .in("id", lookIds.slice(0, 60))
        .neq("category_id", product.category_id ?? "00000000-0000-0000-0000-000000000000")
        .limit(24)
    : { data: [] };

  const toCard = (p: CardRow) => toCardProduct(p);
  // photographed pieces first, then keep four
  const firstFour = (rows: unknown) =>
    ((rows ?? []) as Parameters<typeof toCard>[0][])
      .map(toCard)
      .filter((c) => c.front)
      .slice(0, 4);
  // "Wear with": staff picks, photographed and published, in the order they were set.
  const wearWith = ((pairRaw ?? []) as Parameters<typeof toCard>[0][])
    .sort((a, b) => pairIds.indexOf((a as unknown as { id: string }).id) - pairIds.indexOf((b as unknown as { id: string }).id))
    .map(toCard)
    .filter((c) => c.front)
    .slice(0, 4);

  // "Similar items": same category, a similar price, in stock — and when sizes are
  // gone here, pieces that still have those sizes come first (it rescues the sale).
  const myPrice = Math.min(product.sale_price_usd_cents ?? product.price_usd_cents, product.price_usd_cents);
  const run = sizeRun(variants.map((v) => v.size), product.fit);
  const goneHere = run.filter(
    (size) =>
      !variants.some((v) => v.size === size && (v.inventory_levels ?? []).reduce((n, l) => n + l.quantity - l.reserved, 0) > 0),
  );
  const cardPrice = (c: CardProduct) => Math.min(c.sale_price_usd_cents ?? c.price_usd_cents, c.price_usd_cents);
  const related = ((relatedRaw ?? []) as Parameters<typeof toCard>[0][])
    .map(toCard)
    .filter((c) => c.front && (c.variants ?? []).some((v) => !v.soldOut))
    .map((c) => ({
      c,
      inBand: Math.abs(cardPrice(c) - myPrice) <= myPrice * 0.25,
      rescues: goneHere.filter((size) => (c.variants ?? []).some((v) => v.size === size && !v.soldOut)).length,
      gap: Math.abs(cardPrice(c) - myPrice),
    }))
    .sort((a, b) => Number(b.inBand) - Number(a.inBand) || b.rescues - a.rescues || a.gap - b.gap)
    .slice(0, 4)
    .map((x) => x.c);
  // "Complete the look" leads with its priciest piece: it sets the reference the
  // rest of the outfit is weighed against (same four pieces, re-ordered).
  const look = firstFour(lookRaw).sort(
    (a, b) =>
      Math.min(b.sale_price_usd_cents ?? b.price_usd_cents, b.price_usd_cents) -
      Math.min(a.sale_price_usd_cents ?? a.price_usd_cents, a.price_usd_cents),
  );
  // the guide set on the nearest category wins (Boots' own guide over Shoes')
  const guideRows = (guideRow ?? []) as Array<{ category_codes: string[] }>;
  const nearest = (g: { category_codes: string[] }) => {
    const i = lineage.findIndex((c) => g.category_codes.includes(c));
    return i < 0 ? 99 : i;
  };
  const guideRaw = [...guideRows].sort((x, y) => nearest(x) - nearest(y))[0] as unknown as {
    name_en: string;
    name_ar: string;
    note_en: string | null;
    note_ar: string | null;
    headers_en: string[];
    headers_ar: string[];
    rows: string[][];
  } | undefined;
  const guide: SizeGuideData | null = guideRaw
    ? {
        name: pick(locale, guideRaw.name_en, guideRaw.name_ar),
        note: locale === "ar" ? guideRaw.note_ar ?? guideRaw.note_en : guideRaw.note_en,
        headers: locale === "ar" && guideRaw.headers_ar?.length ? guideRaw.headers_ar : guideRaw.headers_en,
        rows: guideRaw.rows,
      }
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bachwears.com/" },
      { "@type": "ListItem", position: 2, name: "Shop", item: "https://bachwears.com/shop" },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: category.name_en,
              item: `https://bachwears.com/shop?cat=${category.code}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 4 : 3,
        name: product.name_en,
        item: `https://bachwears.com/products/${product.slug}`,
      },
    ],
  };

  const inStock = variants.some(
    (v) => (v.inventory_levels ?? []).reduce((s, l) => s + l.quantity - l.reserved, 0) > 0,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    description: product.description_en ?? undefined,
    url: `https://bachwears.com/products/${product.slug}`,
    sku: product.slug,
    ...(gallery.length ? { image: gallery.slice(0, 4).map((g) => g.url) } : {}),
    brand: { "@type": "Brand", name: "BACH Wears" },
    offers: {
      "@type": "Offer",
      url: `https://bachwears.com/products/${product.slug}`,
      priceCurrency: "USD",
      // the price the bag and checkout charge
      price: (Math.min(product.sale_price_usd_cents ?? product.price_usd_cents, product.price_usd_cents) / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="min-h-dvh bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PdpColourProvider initial={linkedColor?.color_en ?? null}>
      <PdpTopBar productId={product.id} name={displayName} />
      <PdpStrip items={navItems} current={product.slug} />
      <ProductViewTracker productId={product.id} slug={product.slug} />
      <main className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-8 lg:pt-6">
        <div id="pdp-gallery" className="scroll-mt-16">
          {gallery.length ? (
            <>
              {/* desktop: every photo, two-up, beside the sticky buy box */}
              <div className="hidden lg:block">
                <PdpColourGallery hero={gallery} galleries={colorGalleries} name={displayName} />
              </div>
              {/* phones: the first (worn) photo whole, then the buy box; the rest follow further down.
                  A sideways swipe on it flips to the next / previous piece of the category. */}
              <div className="lg:hidden">
                <PdpSwipe prev={prevHref} next={nextHref}>
                <PdpColourGallery
                  hero={gallery}
                  galleries={colorGalleries}
                  name={displayName}
                  layout="lead"
                  end={1}
                  // shoes: the worn shots are legs-and-feet, so the crop keeps the bottom
                  focus={lineage.includes("SHO") ? "bottom" : "top"}
                />
                </PdpSwipe>
              </div>
            </>
          ) : (
            <div className="grid aspect-[3/4] place-items-center bg-secondary p-6 text-center">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.pdp.photoSoon")}</span>
            </div>
          )}
        </div>

        <div className="px-4 pt-4 lg:sticky lg:top-24 lg:self-start lg:px-0 lg:pt-0">
          <nav aria-label="Breadcrumb" className="type-meta hidden text-muted-foreground lg:block">
            <Link href={lhref(locale, "/shop")} className="hover:text-foreground">
              {t(locale, "sf.nav.shop")}
            </Link>
            {category && (
              <>
                {" / "}
                <Link href={lhref(locale, `/shop?cat=${category.code}`)} className="hover:text-foreground">
                  {categoryName}
                </Link>
              </>
            )}
          </nav>

          {/* phones: name, price, colours and ADD share the first screen with the photo; the description follows */}

          <AddToCart
            productId={product.id}
            shownColor={shownColor}
            photoColors={[...(shownColor ? [shownColor] : []), ...Object.keys(colorGalleries)]}
            initialColorCode={linkedColor?.color_code ?? null}
            categoryCodes={lineage}
            sizeRun={sizeRun(variants.map((v) => v.size), product.fit)}
            name={displayName}
            priceLabel={usd(Math.min(product.sale_price_usd_cents ?? product.price_usd_cents, product.price_usd_cents))}
            sizeGuide={guide ? <SizeGuide guide={guide} label={t(locale, "sf.pdp.sizeGuide")} /> : undefined}
            fit={product.fit}
            colourFills={colourFills}
            heading={
              <>
              <h1 className="type-label text-[15px] leading-snug lg:mt-4">{displayName}</h1>
              <p className="type-label mt-2 flex flex-wrap items-center gap-x-3 text-[15px] tabular-nums">
                {onSale ? (
                  <>
                    <span>{usd(product.sale_price_usd_cents!)}</span>
                    <span className="text-muted-foreground line-through">{usd(product.price_usd_cents)}</span>
                  </>
                ) : (
                  usd(product.price_usd_cents)
                )}
              </p>
              </>
            }
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color_code: v.color_code,
              color_en: v.color_en,
              color_ar: v.color_ar,
              available: (v.inventory_levels ?? []).reduce((s, l) => s + l.quantity - l.reserved, 0),
            }))}
          />
          {displayDescription ? (
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{displayDescription}</p>
          ) : null}

          {/* the Fit Finder window, opened from "Find your size" in the size sheet */}
          <FitFinder guide={guide} categoryCodes={lineage} sizes={sizeRun(variants.map((v) => v.size), product.fit)} hideTrigger />
          {/* details as horizontal tabs: details, care, delivery, returns */}
          <PdpTabs
            tabs={[
              ...(product.fit || product.material_en
                ? [
                    {
                      key: "details",
                      label: t(locale, "sf.pdp.details"),
                      content: (
                        <dl className="space-y-2">
                          {product.fit ? (
                            <div className="flex justify-between gap-6">
                              <dt>{t(locale, "sf.pdp.fit")}</dt>
                              <dd className="text-foreground">{product.fit}</dd>
                            </div>
                          ) : null}
                          {product.material_en ? (
                            <div className="flex justify-between gap-6">
                              <dt>{t(locale, "sf.pdp.material")}</dt>
                              <dd className="text-end text-foreground">{pick(locale, product.material_en, product.material_ar)}</dd>
                            </div>
                          ) : null}
                        </dl>
                      ),
                    },
                  ]
                : []),
              ...(product.care_en
                ? [{ key: "care", label: t(locale, "sf.pdp.care"), content: <p>{pick(locale, product.care_en, product.care_ar)}</p> }]
                : []),
              { key: "delivery", label: t(locale, "sf.pdp.delivery"), content: <p>{t(locale, "sf.pdp.deliveryBody")}</p> },
              {
                key: "returns",
                label: t(locale, "sf.pdp.returnsTitle"),
                content: (
                  <p>
                    {t(locale, "sf.pdp.returnsBody")}{" "}
                    <Link href={lhref(locale, "/returns")} className="underline underline-offset-4 hover:text-foreground">
                      {t(locale, "sf.pdp.returnsLink")}
                    </Link>
                  </p>
                ),
              },
            ]}
          />
          {gallery.length > 1 || Object.keys(colorGalleries).length ? (
            <div className="-mx-4 mt-10 lg:hidden">
              <PdpColourGallery hero={gallery} galleries={colorGalleries} name={displayName} layout="stack" start={1} />
            </div>
          ) : null}
        </div>
      </main>
      </PdpColourProvider>

      <section className="mx-auto mt-20 max-w-[1440px] space-y-16 px-4 pb-16 sm:px-8">
        {wearWith.length > 0 && (
          <div>
            <h2 className="type-heading">{t(locale, "sf.pdp.wearWith")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {wearWith.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} source="wear_with" />
              ))}
            </div>
          </div>
        )}
        {related.length > 0 && (
          <div>
            <h2 className="type-heading">{t(locale, "sf.pdp.similar")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} source="similar" />
              ))}
            </div>
          </div>
        )}
        {/* until staff pick a "Wear with", the collection-based outfit stands in */}
        {wearWith.length === 0 && look.length > 0 && (
          <div>
            <h2 className="type-heading">{t(locale, "sf.pdp.completeLook")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {look.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} source="complete_look" />
              ))}
            </div>
          </div>
        )}
        <RecentlyViewed currentSlug={product.slug} />
      </section>
      {/* phones: room for the pinned buy bar so it never covers the footer */}
      <div aria-hidden className="h-[var(--buybar-h,4.5rem)] lg:hidden" />
    </div>
  );
}
