import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { CategoryManager, type CategoryRow } from "../../components/category-manager";

export default async function CategoriesPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("categories")
    .select("id, code, name_en, name_ar, is_active, parent_id, products(count)")
    .order("sort")
    .order("code");

  const categories: CategoryRow[] = (data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    name_en: c.name_en,
    name_ar: c.name_ar,
    is_active: c.is_active,
    parent_id: c.parent_id,
    productCount: (c.products as unknown as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          icon="categories"
          title="الفئات"
          description="أقسام الكاتالوغ (قمصان، جينز…) يلّي بتطلع بقائمة الموقع — زيد فئة، حطّها تحت فئة تانية، أو وقّفها."
          hint={{
            title: "الفئات",
            what: "كل قطعة بتنتمي لفئة وحدة. كود الفئة بيدخل بتركيبة الـ SKU (BW-{CAT}-…).",
            source: "جدول الفئات؛ عدد القطع محسوب من المنتجات المربوطة بكل فئة.",
            edit: "من هون. الكود ما بينحذف بعد ما ينستعمل بـ SKU، بس فيك توقّف الفئة. صورة كل فئة بالموقع من «صور الفئات».",
          }}
          actions={
            <Link href="/categories/images" className="inline-flex h-9 items-center border px-4 text-sm hover:bg-muted">
              صور الفئات بالموقع
            </Link>
          }
        />
        <CategoryManager categories={categories} />
      </main>
    </div>
  );
}
