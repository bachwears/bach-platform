import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { t } from "@bach/i18n";

import { AddToCart } from "../../../components/add-to-cart";
import { PdpAccordion } from "../../../components/pdp-accordion";
import { PdpGallery } from "../../../components/pdp-gallery";
import { ProductCard, type CardProduct } from "../../../components/product-card";
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

async function getProduct(slug: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name_en, name_ar, description_en, description_ar, price_usd_cents, sale_price_usd_cents, material_en, material_ar, care_en, care_ar, fit, category_id, categories(code, name_en, name_ar), media_assets(kind, storage_path), product_seasons(season), product_collections(collection_id), product_variants(id, size, color_code, color_en, color_ar, is_active, inventory_levels(quantity, reserved))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([getProduct(slug), getLocale()]);
  if (!product) return { title: "BACH Wears" };
  const name = pick(locale, product.name_en, product.name_ar);
  return {
    title: locale === "ar" ? `${name} — باخ ويرز` : `${name} — BACH Wears`,
    description:
      pick(locale, product.description_en ?? "", product.description_ar) || `${name} by BACH Wears.`,
    alternates: {
      canonical: lhref(locale, `/products/${slug}`),
      languages: { en: `/products/${slug}`, ar: `/ar/products/${slug}` },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, locale] = await Promise.all([getProduct(slug), getLocale()]);
  if (!product) notFound();

  const media = (product.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? [];
  const gallery = ["front", "back", "side", "closeup"]
    .map((kind) => media.find((m) => m.kind === kind))
    .filter(Boolean) as Array<{ kind: string; storage_path: string }>;

  const variants = ((product.product_variants as unknown as VariantRow[]) ?? []).filter(
    (v) => v.is_active,
  );
  const onSale = product.sale_price_usd_cents != null;
  const category = product.categories as unknown as { code: string; name_en: string; name_ar: string } | null;
  const displayName = pick(locale, product.name_en, product.name_ar);
  const displayDescription = pick(locale, product.description_en ?? "", product.description_ar) || null;
  const categoryName = category ? pick(locale, category.name_en, category.name_ar) : null;
  const collectionIds = ((product.product_collections as unknown as Array<{ collection_id: string }>) ?? []).map(
    (c) => c.collection_id,
  );
  const seasons = ((product.product_seasons as unknown as Array<{ season: string }>) ?? []).map((s) => s.season);

  const supabase = await supabaseServer();
  const cardSelect =
    "id, slug, name_en, name_ar, price_usd_cents, sale_price_usd_cents, category_id, media_assets(kind, storage_path), product_variants(color_en, is_active)";

  // "You may also like": same category, newest first.
  const relatedQ = product.category_id
    ? supabase
        .from("products")
        .select(cardSelect)
        .eq("status", "published")
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .order("created_at", { ascending: false })
        .limit(4)
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
          .select("name_en, name_ar, note_en, note_ar, headers_en, headers_ar, rows")
          .contains("category_codes", [category.code])
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lookIds = [...new Set((lookIdRows ?? []).map((r) => r.product_id))].filter((id) => id !== product.id);
  const { data: lookRaw } = lookIds.length
    ? await supabase
        .from("products")
        .select(cardSelect)
        .eq("status", "published")
        .in("id", lookIds.slice(0, 60))
        .neq("category_id", product.category_id ?? "00000000-0000-0000-0000-000000000000")
        .limit(4)
    : { data: [] };

  const toCard = (p: {
    slug: string;
    name_en: string;
    name_ar: string | null;
    price_usd_cents: number;
    sale_price_usd_cents: number | null;
    media_assets: Array<{ kind: string; storage_path: string }> | null;
    product_variants: Array<{ color_en: string; is_active: boolean }> | null;
  }): CardProduct => ({
    slug: p.slug,
    name_en: p.name_en,
    name_ar: p.name_ar,
    price_usd_cents: p.price_usd_cents,
    sale_price_usd_cents: p.sale_price_usd_cents,
    front: (p.media_assets ?? []).find((m) => m.kind === "front")?.storage_path ?? null,
    back: (p.media_assets ?? []).find((m) => m.kind === "back")?.storage_path ?? null,
    colors: (p.product_variants ?? []).filter((v) => v.is_active).map((v) => v.color_en),
  });
  const related = ((relatedRaw ?? []) as Parameters<typeof toCard>[0][]).map(toCard);
  const look = ((lookRaw ?? []) as Parameters<typeof toCard>[0][]).map(toCard);
  const guideRaw = guideRow as {
    name_en: string;
    name_ar: string;
    note_en: string | null;
    note_ar: string | null;
    headers_en: string[];
    headers_ar: string[];
    rows: string[][];
  } | null;
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    description: product.description_en ?? undefined,
    brand: { "@type": "Brand", name: "BACH Wears" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: ((product.sale_price_usd_cents ?? product.price_usd_cents) / 100).toFixed(2),
      availability: "https://schema.org/InStock",
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
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-xs text-muted-foreground">
        <Link href={lhref(locale, "/")} className="hover:text-foreground">
          {t(locale, "sf.pdp.home")}
        </Link>
        {" / "}
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
        {" / "}
        <span className="text-foreground">{displayName}</span>
      </nav>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-2">
        <div>
          {gallery.length ? (
            <PdpGallery
              images={gallery.map((m) => ({ kind: m.kind, url: m.storage_path }))}
              name={displayName}
            />
          ) : (
            <div className="grid aspect-[3/4] place-items-center bg-secondary p-6 text-center">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t(locale, "sf.pdp.photoSoon")}
              </span>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          {category ? (
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {categoryName}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{displayName}</h1>
          <p className="mt-3 text-lg">
            {onSale ? (
              <>
                <span>{usd(product.sale_price_usd_cents!)}</span>{" "}
                <span className="text-muted-foreground line-through">
                  {usd(product.price_usd_cents)}
                </span>
              </>
            ) : (
              usd(product.price_usd_cents)
            )}
          </p>

          {displayDescription ? (
            <p className="mt-6 leading-relaxed text-muted-foreground">{displayDescription}</p>
          ) : null}

          <AddToCart
            productId={product.id}
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color_code: v.color_code,
              color_en: v.color_en,
              color_ar: v.color_ar,
              available: (v.inventory_levels ?? []).reduce((s, l) => s + l.quantity - l.reserved, 0),
            }))}
          />
          {guide && <SizeGuide guide={guide} label={t(locale, "sf.pdp.sizeGuide")} />}

          <dl className="mt-10 space-y-4 border-t pt-6 text-sm">
            {product.fit ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">{t(locale, "sf.pdp.fit")}</dt>
                <dd className="capitalize">{product.fit}</dd>
              </div>
            ) : null}
            {product.material_en ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">{t(locale, "sf.pdp.material")}</dt>
                <dd className="text-end">{pick(locale, product.material_en, product.material_ar)}</dd>
              </div>
            ) : null}
            {product.care_en ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">{t(locale, "sf.pdp.care")}</dt>
                <dd className="text-end">{pick(locale, product.care_en, product.care_ar)}</dd>
              </div>
            ) : null}
          </dl>
          <PdpAccordion locale={locale} />
        </div>
      </main>

      <section className="mx-auto max-w-6xl space-y-12 px-4 pb-16">
          {related.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t(locale, "sf.pdp.related")}</h2>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
                {related.map((p) => (
                  <ProductCard key={p.slug} product={p} locale={locale} />
                ))}
              </div>
            </div>
          )}
          {look.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t(locale, "sf.pdp.completeLook")}</h2>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
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
