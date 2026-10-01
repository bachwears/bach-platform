import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";

import { CategoryImages, type CategoryImageRow } from "../../../components/category-images";
import { Nav } from "../../../components/nav";

// Same roles the categories table and product-media storage policies allow to write.
const EDITORS = new Set(["super_admin", "store_manager", "marketing_manager"]);

export default async function CategoryImagesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("categories")
      .select("id, code, name_en, name_ar, parent_id, sort, banner_url, banner_mobile_url, products(count)")
      .order("sort")
      .order("code"),
  ]);

  const own = (c: { products: unknown }) => (c.products as Array<{ count: number }>)?.[0]?.count ?? 0;
  const rows: CategoryImageRow[] = (data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    name_ar: c.name_ar,
    name_en: c.name_en,
    parent_id: c.parent_id,
    // a parent's page lists its children's products too
    productCount: own(c) + (data ?? []).filter((x) => x.parent_id === c.id).reduce((n, x) => n + own(x), 0),
    banner_url: c.banner_url,
    banner_mobile_url: (c as { banner_mobile_url?: string | null }).banner_mobile_url ?? null,
  }));

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">صور الفئات</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              الصورة العريضة فوق كل صفحة فئة بالموقع — وحدة للكمبيوتر (21:9) ووحدة للموبايل (4:5). الفئة الفرعية بلا صورة بتاخد صورة الفئة الأم.
            </p>
          </div>
          <Link href="/categories" className="text-sm underline underline-offset-4">
            → الفئات
          </Link>
        </div>
        {EDITORS.has(profile?.role ?? "") ? (
          <CategoryImages categories={rows} />
        ) : (
          <p className="rounded-md border p-6 text-sm text-muted-foreground">
            تعديل صور الفئات للسوبر أدمن، مدير المحل، ومسؤول التسويق بس.
          </p>
        )}
      </main>
    </div>
  );
}
