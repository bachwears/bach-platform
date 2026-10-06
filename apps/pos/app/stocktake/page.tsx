import { supabaseServer } from "@bach/supabase/server";

import { Stocktake } from "../../components/stocktake";
import { PosNav } from "../../components/pos-nav";

const COUNT_ROLES = new Set(["super_admin", "store_manager", "inventory_manager", "cashier"]);
const APPLY_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function StocktakePage() {
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
      <PosNav branchName={branch?.name} />
      <main className="mx-auto max-w-4xl p-4 py-6">
          <h1 className="flex items-center gap-2 text-lg font-medium print:hidden">الجرد</h1>
        {!COUNT_ROLES.has(profile?.role ?? "") ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بالجرد.</p>
        ) : !branch ? (
          <p className="p-8 text-center text-muted-foreground">ما في فرع مفعّل.</p>
        ) : (
          <Stocktake branchId={branch.id} canApply={APPLY_ROLES.has(profile?.role ?? "")} />
        )}
      </main>
    </div>
  );
}
