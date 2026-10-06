import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { MediaImport } from "../../components/media-import";
import { Nav } from "../../components/nav";

export default async function MediaImportPage() {
  const supabase = await supabaseServer();
  const [{ count: total }, { count: withMedia }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("media_assets").select("product_id", { count: "exact", head: true }),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <PageHeader
          title="رفع الصور"
          description={
            <>
              سمّي كل صورة برقم الـ SKU ونوع اللقطة، ونحنا منوصّلها لقطعتها. {total ?? 0} منتج، {withMedia ?? 0} صورة
              مربوطة لهلّق.
            </>
          }
          hint={{
            title: "رفع الصور بالجملة",
            what: "بترفع صور كتير دفعة وحدة، وكل صورة بتنربط بقطعتها حسب اسم الملف (SKU_front، SKU_back…) وبتتحوّل لـ WebP.",
            source: "الملفات بتنحفظ بـ product-media وبتنسجّل بجدول media_assets.",
            edit: "صور قطعة وحدة بتتعدّل من صفحة القطعة؛ الصور يلّي ما إلها قطعة بتنربط يدوياً من «مطابقة الصور».",
          }}
        />
        <MediaImport />
      </main>
    </div>
  );
}
