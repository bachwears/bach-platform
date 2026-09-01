import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { Purchasing } from "../../components/purchasing";

const PO_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function PurchasingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: branch }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
  ]);
  const allowed = PO_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">المشتريات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الموردين وطلبات الشراء — من الطلب للاستلام، والمخزون بيتحدّث لحاله عند الاستلام.
          </p>
        </div>
        {allowed && branch ? (
          <Purchasing branchId={branch.id} />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة المشتريات.</p>
        )}
      </main>
    </div>
  );
}
