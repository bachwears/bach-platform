import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../../components/nav";
import { ColourPhotos } from "../../../components/colour-photos";
import { PhotoColor } from "../../../components/photo-color";
import { ProductPhotos, type ProductPhoto } from "../../../components/product-photos";
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
    supabase.from("products").select("*, product_seasons(season)").eq("id", id).single(),
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
        {!(media ?? []).some((m) => m.kind === "front") && (
          <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
            <p className="font-semibold text-red-700 dark:text-red-300">هالمنتج مخفي عن الموقع لأنو ما إلو صورة أمامية</p>
            <p className="mt-1 text-muted-foreground">
              زيد صوره من{" "}
              <a href="#photos" className="underline underline-offset-2">
                «صور المنتج» تحت
              </a>{" "}
              — بس تنزل الصورة الأمامية بيطلع بالشوب والبحث لحالو.
            </p>
          </div>
        )}
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
              material_en: product.material_en ?? "",
              care_en: product.care_en ?? "",
              meta_title_en: product.meta_title_en ?? "",
              meta_description_en: product.meta_description_en ?? "",
              seasons: ((product.product_seasons as Array<{ season: string }> | null) ?? []).map((x) => x.season).join(","),
              tags: (product.tags as string[] | null) ?? [],
              hero: ((product.tags as string[] | null) ?? []).includes("hero"),
            }}
          />
        </div>
        <ProductPhotos productId={product.id} photos={(media ?? []) as ProductPhoto[]} />
        <PhotoColor
          productId={product.id}
          front={(media ?? []).find((m) => m.kind === "front")?.storage_path ?? null}
          colors={[...new Set((variants ?? []).filter((v) => v.is_active && v.color_en).map((v) => v.color_en as string))].sort()}
          initial={((media ?? []).find((m) => m.kind === "front") as { color_en?: string | null } | undefined)?.color_en ?? null}
        />
        <ColourPhotos
          photos={(media ?? []) as Parameters<typeof ColourPhotos>[0]["photos"]}
          heroColor={((media ?? []).find((m) => m.kind === "front") as { color_en?: string | null } | undefined)?.color_en ?? null}
        />
        <VariantManager productId={product.id} variants={(variants ?? []) as Variant[]} />
      </main>
    </div>
  );
}
