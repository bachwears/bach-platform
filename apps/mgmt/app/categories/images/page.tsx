import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
        <PageHeader
          title="صور الفئات"
          description="الصورة العريضة فوق كل صفحة فئة بالموقع — وحدة للكمبيوتر (21:9) ووحدة للموبايل (4:5)."
          hint={{
            title: "صور الفئات",
            what: "البانر يلّي بيطلع فوق صفحة كل فئة عالموقع. الفئة الفرعية بلا صورة بتاخد صورة الفئة الأم.",
            source: "عمودَي banner_url و banner_mobile_url بجدول الفئات؛ الملفات بتنحفظ بـ product-media.",
            edit: "من هون: ارفع أو بدّل الصورتين لكل فئة. بيبيّن عالموقع خلال دقيقة أو دقيقتين.",
          }}
          back={{ href: "/categories", label: "الفئات" }}
        />
        {EDITORS.has(profile?.role ?? "") ? (
          <CategoryImages categories={rows} />
        ) : (
          <p className="border p-6 text-sm text-muted-foreground">
            تعديل صور الفئات للسوبر أدمن، مدير المحل، ومسؤول التسويق بس — اطلب من حدا منهن يغيّر الصورة.
          </p>
        )}
      </main>
    </div>
  );
}
