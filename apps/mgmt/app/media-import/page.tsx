import { supabaseServer } from "@bach/supabase/server";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">استيراد الصور</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سمّي كل صورة برقم الفاريانت (SKU) ونوع اللقطة، ومنحن منوصّلها لمنتجها. {total ?? 0} منتج،{" "}
            {withMedia ?? 0} صورة مربوطة لهلق.
          </p>
        </div>
        <MediaImport />
      </main>
    </div>
  );
}
