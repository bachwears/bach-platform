import { supabaseServer } from "@bach/supabase/server";

import { Stocktake } from "../../components/stocktake";

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
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-widest">BACH POS</span>
          <span className="text-sm text-muted-foreground">الجرد — {branch?.name}</span>
        </div>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← رجوع للكاشير
        </a>
      </header>
      <main className="mx-auto max-w-4xl p-4 py-6">
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
