import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { SizeExpansion } from "../../components/size-expansion";

const SIZE_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function SizesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: branch }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">المقاسات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            المنتجات المستوردة بمقاس واحد (OS) — وزّع مخزون كل موديل على مقاساته الحقيقية متل ما هي عالرف.
            الباركود القديم بيضل شغّال عالكاشير وبيفتح لائحة المقاسات.
          </p>
        </div>
        {SIZE_ROLES.has(profile?.role ?? "") && branch ? (
          <SizeExpansion branchId={branch.id} />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة المقاسات.</p>
        )}
      </main>
    </div>
  );
}
