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
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="flex items-center gap-2"><img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" /><span className="text-sm font-semibold text-muted-foreground">POS</span></span>
          <span className="text-sm text-muted-foreground">الجرد — {branch?.name}</span>
        </div>
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← رجوع للكاشير
        </a>
      </div>
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
