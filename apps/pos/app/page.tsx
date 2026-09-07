import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

import { Cashier } from "../components/cashier";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

const SELLING_ROLES = new Set(["super_admin", "store_manager", "cashier"]);

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: branch }, { data: rate }, { data: tva }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
    supabase
      .from("exchange_rates")
      .select("lbp_per_usd")
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("tva_settings").select("enabled, rate_basis_points, prices_include_tva").maybeSingle(),
  ]);

  const canSell = SELLING_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 print:hidden">
        <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="flex items-center gap-2"><img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" /><span className="text-sm font-semibold text-muted-foreground">POS</span></span>
          <span className="text-sm text-muted-foreground">{branch?.name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <a href="/queue" className="hover:text-foreground">طلبات الأونلاين</a>
          <a href="/eod" className="hover:text-foreground">تسكير اليوم</a>
          <a href="/help" className="hover:text-foreground">مساعدة</a>
          <a href="/returns" className="hover:text-foreground">مرتجع / تبديل</a>
          <a href="/stocktake" className="hover:text-foreground">جرد</a>
          <span>
            {profile?.full_name ?? user?.email} · {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
          </span>
          <form action="/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              خروج
            </Button>
          </form>
        </div>
      </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 py-6">
        {!canSell ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بالبيع من الكاشير.</p>
        ) : !branch ? (
          <p className="p-8 text-center text-muted-foreground">ما في فرع مفعّل — ضيف فرع من لوحة الإدارة.</p>
        ) : !rate ? (
          <p className="p-8 text-center text-muted-foreground">
            ما في سعر صرف محدّد — حدّد سعر الصرف من لوحة الإدارة قبل ما تبيع.
          </p>
        ) : (
          <Cashier
            branchId={branch.id}
            branchName={branch.name}
            role={profile!.role}
            currentUser={{ id: profile!.id, name: profile!.full_name ?? user!.email ?? "" }}
            rate={Number(rate.lbp_per_usd)}
            tva={{
              enabled: tva?.enabled ?? false,
              rateBasisPoints: tva?.rate_basis_points ?? 0,
              pricesIncludeTva: tva?.prices_include_tva ?? true,
            }}
          />
        )}
      </main>
    </div>
  );
}
