import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { NotificationSettings } from "../../components/notification-settings";
import { SiteContentEditor } from "../../components/site-content-editor";

export default async function SiteContentPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canEdit = ["super_admin", "store_manager", "marketing_manager"].includes(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          title="محتوى الموقع"
          description="عناوين وصور واجهة bachwears.com وإعدادات الإشعارات — غيّرها من هون بلا ما تلمس الكود."
        />
        {canEdit ? (
          <>
            <SiteContentEditor />
            <NotificationSettings />
          </>
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بتعديل محتوى الموقع — اطلب من مدير المحل أو مسؤول التسويق.
          </p>
        )}
      </main>
    </div>
  );
}
