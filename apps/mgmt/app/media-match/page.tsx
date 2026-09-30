import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { MediaMatch } from "../../components/media-match";

export default async function MediaMatchPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canEdit = ["super_admin", "store_manager", "inventory_manager", "marketing_manager"].includes(
    profile?.role ?? "",
  );

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">مطابقة الصور</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الصور اللي ما انربطت تلقائيًا بمنتج — اختار الصورة، دوّر عالمنتج، حدد نوع اللقطة واربط.
            وفيك كمان تعدّل خانات صور أي منتج موجود.
          </p>
        </div>
        {canEdit ? (
          <MediaMatch />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة الصور.</p>
        )}
      </main>
    </div>
  );
}
