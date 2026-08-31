import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { AddToCart } from "../../../components/add-to-cart";
import { SiteHeader } from "../../../components/site-header";

interface VariantRow {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
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
      "id, slug, name_en, description_en, price_usd_cents, sale_price_usd_cents, material_en, care_en, fit, categories(name_en), media_assets(kind, storage_path), product_variants(id, size, color_code, color_en, is_active, inventory_levels(quantity, reserved))",
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
  const product = await getProduct(slug);
  if (!product) return { title: "BACH Wears" };
  return {
    title: `${product.name_en} — BACH Wears`,
    description: product.description_en ?? `${product.name_en} by BACH Wears.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const media = (product.media_assets as unknown as Array<{ kind: string; storage_path: string }>) ?? [];
  const gallery = ["front", "back", "side", "closeup"]
    .map((kind) => media.find((m) => m.kind === kind))
    .filter(Boolean) as Array<{ kind: string; storage_path: string }>;

  const variants = ((product.product_variants as unknown as VariantRow[]) ?? []).filter(
    (v) => v.is_active,
  );
  const onSale = product.sale_price_usd_cents != null;
  const category = product.categories as unknown as { name_en: string } | null;

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
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
        <div className="space-y-4">
          {gallery.length ? (
            gallery.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.kind}
                src={m.storage_path}
                alt={`${product.name_en} — ${m.kind}`}
                className="aspect-[3/4] w-full bg-secondary object-cover"
              />
            ))
          ) : (
            <div className="grid aspect-[3/4] place-items-center bg-secondary p-6 text-center">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Photography coming soon
              </span>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          {category ? (
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {category.name_en}
            </p>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{product.name_en}</h1>
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

          {product.description_en ? (
            <p className="mt-6 leading-relaxed text-muted-foreground">{product.description_en}</p>
          ) : null}

          <AddToCart
            variants={variants.map((v) => ({
              id: v.id,
              size: v.size,
              color_code: v.color_code,
              color_en: v.color_en,
              available: (v.inventory_levels ?? []).reduce((s, l) => s + l.quantity - l.reserved, 0),
            }))}
          />

          <dl className="mt-10 space-y-4 border-t pt-6 text-sm">
            {product.fit ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Fit</dt>
                <dd className="capitalize">{product.fit}</dd>
              </div>
            ) : null}
            {product.material_en ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Material</dt>
                <dd className="text-end">{product.material_en}</dd>
              </div>
            ) : null}
            {product.care_en ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Care</dt>
                <dd className="text-end">{product.care_en}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </main>
    </div>
  );
}
