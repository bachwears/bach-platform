import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
        <PageHeader
          title="منتج جديد"
          description="عبّي الأساسيات، اختار الألوان والمقاسات، واحفظ — الصور بتنزاد من صفحة القطعة بعد الحفظ."
          back={{ href: "/products", label: "المنتجات" }}
        />
        {!categories?.length ? (
          <p className="border p-6 text-sm text-muted-foreground">
            ما في فئات بعد — لازم تنضاف الفئات قبل ما تقدر تعمل منتج.{" "}
            <Link href="/categories" className="text-foreground underline underline-offset-4">
              زيد فئة
            </Link>
          </p>
        ) : (
          <ProductForm categories={categories} />
        )}
      </main>
    </div>
  );
}
