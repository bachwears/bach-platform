import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { CollectionsManager } from "../../components/collections-manager";

export default async function CollectionsPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">الكولكشنات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مجموعات تنسيقية متل المتاجر العالمية — منتجات الكولكشن الواحد بتكمّل بعضها على الموقع تلقائياً.
          </p>
        </div>
        {canEdit ? <CollectionsManager /> : <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة الكولكشنات.</p>}
      </main>
    </div>
  );
}
