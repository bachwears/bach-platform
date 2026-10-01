import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../../components/nav";
import { PhotoColor } from "../../../components/photo-color";
import { ProductForm } from "../../../components/product-form";
import { VariantManager, type Variant } from "../../../components/variant-manager";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: product }, { data: categories }, { data: variants }, { data: media }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name_ar, code").eq("is_active", true).order("sort"),
    supabase
      .from("product_variants")
      .select("id, size, color_code, color_en, color_ar, sku, barcode, is_active")
      .eq("product_id", id)
      .order("created_at"),
    // "*" keeps this working whether or not the color_en column has landed yet
    supabase.from("media_assets").select("*").eq("product_id", id),
  ]);

  if (!product) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-10 p-4 py-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight" dir="ltr">{product.name_en}</h1>
          <ProductForm
            categories={categories ?? []}
            initial={{
              id: product.id,
              name_en: product.name_en,
              name_ar: product.name_ar,
              slug: product.slug,
              category_id: product.category_id,
              price_usd: (product.price_usd_cents / 100).toString(),
              sale_price_usd:
                product.sale_price_usd_cents != null
                  ? (product.sale_price_usd_cents / 100).toString()
                  : "",
              status: product.status,
              description_en: product.description_en ?? "",
              description_ar: product.description_ar ?? "",
              fit: product.fit ?? "",
            }}
          />
        </div>
        <PhotoColor
          productId={product.id}
          front={(media ?? []).find((m) => m.kind === "front")?.storage_path ?? null}
          colors={[...new Set((variants ?? []).filter((v) => v.is_active && v.color_en).map((v) => v.color_en as string))].sort()}
          initial={((media ?? []).find((m) => m.kind === "front") as { color_en?: string | null } | undefined)?.color_en ?? null}
        />
        <VariantManager productId={product.id} variants={(variants ?? []) as Variant[]} />
      </main>
    </div>
  );
}
