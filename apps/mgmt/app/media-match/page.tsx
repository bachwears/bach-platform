import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
        <PageHeader
          title="مطابقة الصور"
          description="الصور يلّي ما انربطت تلقائياً بقطعة — اختار الصورة، دوّر عالقطعة، حدّد نوع اللقطة واربط. وفيك تعدّل خانات صور أي قطعة."
        />
        {canEdit ? (
          <MediaMatch />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بإدارة الصور — اطلب من مدير المحل أو مسؤول المخزون أو التسويق.
          </p>
        )}
      </main>
    </div>
  );
}
