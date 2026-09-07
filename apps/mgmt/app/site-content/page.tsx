import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">محتوى الموقع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عناوين وصورة واجهة bachwears.com — غيّرها من هون بلا ما تلمس الكود.
          </p>
        </div>
        {canEdit ? (
          <SiteContentEditor />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بتعديل محتوى الموقع.</p>
        )}
      </main>
    </div>
  );
}
