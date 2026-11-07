import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { MediaMatch } from "../../components/media-match";
import { pageUser } from "../../lib/page-user";

export default async function MediaMatchPage() {
  const supabase = await supabaseServer();
  const user = await pageUser(supabase, "/media-match");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const canEdit = ["super_admin", "store_manager", "inventory_manager", "marketing_manager"].includes(
    profile?.role ?? "",
  );

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          icon="photosMatch"
          title="مطابقة الصور"
          description="قطعة قطعة: الصور كبيرة عاليمين (كبسة بتكبّرها)، ولايحة القطع عالشمال — كبسة عالقطعة الصح وبعدين «اربط»."
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
