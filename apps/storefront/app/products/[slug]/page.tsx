import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { t } from "@bach/i18n";

import { AddToCart } from "../../../components/add-to-cart";
import { PdpAccordion } from "../../../components/pdp-accordion";
import { PdpColourGallery, PdpColourProvider } from "../../../components/pdp-colour";
import { PdpTopBar } from "../../../components/pdp-topbar";
import type { GalleryImage } from "../../../components/pdp-gallery";
import { ProductCard } from "../../../components/product-card";
import { CARD_COLUMNS, toCardProduct, type CardRow } from "../../../lib/card";
import { sizeRun } from "../../../lib/sizes";
import { RecentlyViewed } from "../../../components/recently-viewed";
import { SizeGuide, type SizeGuideData } from "../../../components/size-guide";
import { getLocale, lhref, pick } from "../../../lib/locale";

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
  // Opening a piece shows it worn first: model, then the product shots, then close-ups.
  // Slot kinds say it for the main photos; extra photos carry the view in their file name.
  // Order: the main worn shot, the product front and back, more worn shots, close-ups, details.
  const viewRank = (m: { kind: string; storage_path: string }) => {
    const hit = /\/(front|back|model-zoom|model|detail)(-\d+)?-(?:\d+|v2[0-9a-f]+)-\d+\.webp$/.exec(m.storage_path);
    const view = hit?.[1] ?? ({ side: "model", closeup: "model-zoom" } as Record<string, string>)[m.kind] ?? m.kind;
    if (view === "model") return hit?.[2] ? 3 : 0;
    return ({ front: 1, back: 2, "model-zoom": 4, detail: 5 } as Record<string, number>)[view] ?? 6;
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

  // "You may also like": same category, newest first.
  const relatedQ = product.category_id
    ? supabase
        .from("products")
        .select(cardSelect)
        .eq("status", "published")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .order("created_at", { ascending: false })
        .limit(24)
    : Promise.resolve({ data: [] });

  // "Complete the look": products from other categories sharing a collection,
  // falling back to a shared season when the product has no collection.
  const lookIdsQ = collectionIds.length
    ? supabase.from("product_collections").select("product_id").in("collection_id", collectionIds).limit(60)
    : seasons.length
      ? supabase.from("product_seasons").select("product_id").in("season", seasons).limit(60)
      : Promise.resolve({ data: [] as Array<{ product_id: string }> });

  const [{ data: relatedRaw }, { data: lookIdRows }, { data: guideRow }] = await Promise.all([
    relatedQ,
    lookIdsQ,
    category
      ? supabase
          .from("size_guides")
          .select("name_en, name_ar, note_en, note_ar, headers_en, headers_ar, rows, category_codes")
          .overlaps("category_codes", lineage.length ? lineage : [category.code])
      : Promise.resolve({ data: [] }),
  ]);

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
  const related = firstFour(relatedRaw);
  const look = firstFour(lookRaw);
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
      <main className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-8 lg:pt-6">
        <div id="pdp-gallery" className="scroll-mt-16">
          {gallery.length ? (
            <>
              {/* desktop: every photo, two-up, beside the sticky buy box */}
              <div className="hidden lg:block">
                <PdpColourGallery hero={gallery} galleries={colorGalleries} name={displayName} />
              </div>
              {/* phones: the first (worn) photo, then the buy box; the rest follow further down */}
              <div className="lg:hidden">
                <PdpColourGallery hero={gallery} galleries={colorGalleries} name={displayName} layout="lead" end={1} />
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

          {/* phones: name, price, colours and ADD share the first screen with the photo; the description follows */}
          {displayDescription ? (
            <p className="mt-6 hidden text-sm leading-relaxed text-muted-foreground lg:block">{displayDescription}</p>
          ) : null}

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
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color_code: v.color_code,
              color_en: v.color_en,
              color_ar: v.color_ar,
              available: (v.inventory_levels ?? []).reduce((s, l) => s + l.quantity - l.reserved, 0),
            }))}
          />
          {guide && (
            <div className="mt-4">
              <SizeGuide guide={guide} label={t(locale, "sf.pdp.sizeGuide")} />
            </div>
          )}
          {displayDescription ? (
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground lg:hidden">{displayDescription}</p>
          ) : null}

          <dl className="mt-10 border-t">
            {product.fit ? (
              <div className="flex justify-between gap-6 border-b py-3">
                <dt className="type-meta text-muted-foreground">{t(locale, "sf.pdp.fit")}</dt>
                <dd className="type-meta">{product.fit}</dd>
              </div>
            ) : null}
            {product.material_en ? (
              <div className="flex justify-between gap-6 border-b py-3">
                <dt className="type-meta text-muted-foreground">{t(locale, "sf.pdp.material")}</dt>
                <dd className="type-meta text-end">{pick(locale, product.material_en, product.material_ar)}</dd>
              </div>
            ) : null}
            {product.care_en ? (
              <div className="gap-6 border-b py-3">
                <dt className="type-meta text-muted-foreground">{t(locale, "sf.pdp.care")}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{pick(locale, product.care_en, product.care_ar)}</dd>
              </div>
            ) : null}
          </dl>
          <PdpAccordion locale={locale} />
          {gallery.length > 1 || Object.keys(colorGalleries).length ? (
            <div className="-mx-4 mt-10 lg:hidden">
              <PdpColourGallery hero={gallery} galleries={colorGalleries} name={displayName} layout="stack" start={1} />
            </div>
          ) : null}
        </div>
      </main>
      </PdpColourProvider>

      <section className="mx-auto mt-20 max-w-[1440px] space-y-16 px-4 pb-16 sm:px-8">
        {related.length > 0 && (
          <div>
            <h2 className="type-heading">{t(locale, "sf.pdp.related")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
              ))}
            </div>
          </div>
        )}
        {look.length > 0 && (
          <div>
            <h2 className="type-heading">{t(locale, "sf.pdp.completeLook")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4">
              {look.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale} />
              ))}
            </div>
          </div>
        )}
        <RecentlyViewed currentSlug={product.slug} />
      </section>
    </div>
  );
}
