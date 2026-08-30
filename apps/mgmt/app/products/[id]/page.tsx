import { notFound } from "next/navigation";
import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../../components/nav";
import { ProductForm } from "../../../components/product-form";
import { VariantManager, type Variant } from "../../../components/variant-manager";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: product }, { data: categories }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name_ar, code").eq("is_active", true).order("sort"),
    supabase
      .from("product_variants")
      .select("id, size, color_code, color_en, color_ar, sku, barcode, is_active")
      .eq("product_id", id)
      .order("created_at"),
  ]);

  if (!product) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-10 p-4 py-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">{product.name_ar}</h1>
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
        <VariantManager productId={product.id} variants={(variants ?? []) as Variant[]} />
      </main>
    </div>
  );
}
