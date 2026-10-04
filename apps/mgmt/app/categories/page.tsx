import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">الفئات</h1>
          <Link href="/categories/images" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
            صور الفئات بالموقع
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          كود الفئة بيدخل بتركيبة الـ SKU (‏<span dir="ltr">BW-{"{CAT}"}-…</span>‏) — ما بينحذف بعد ما ينستعمل، بس فيك توقّفه.
        </p>
        <CategoryManager categories={categories} />
      </main>
    </div>
  );
}
