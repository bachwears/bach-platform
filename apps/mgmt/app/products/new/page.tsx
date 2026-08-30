import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../../components/nav";
import { ProductForm } from "../../../components/product-form";

export default async function NewProductPage() {
  const supabase = await supabaseServer();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_ar, code")
    .eq("is_active", true)
    .order("sort");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">منتج جديد</h1>
        {!categories?.length ? (
          <p className="rounded-md border p-6 text-sm text-muted-foreground">
            ما في فئات بعد — لازم تنضاف الفئات قبل ما تقدر تعمل منتج.
          </p>
        ) : (
          <ProductForm categories={categories} />
        )}
      </main>
    </div>
  );
}
