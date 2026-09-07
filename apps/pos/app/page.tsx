import { supabaseServer } from "@bach/supabase/server";
import { PortalNav } from "@bach/ui/components/portal-nav";

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
      <PortalNav
        title="POS"
        subtitle={branch?.name ?? undefined}
        items={[
          { href: "/queue", label: "طلبات الأونلاين" },
          { href: "/returns", label: "مرتجع / تبديل" },
          { href: "/eod", label: "تسكير اليوم" },
          { href: "/stocktake", label: "جرد" },
          { href: "/help", label: "مساعدة" },
        ]}
        meta={`${profile?.full_name ?? user?.email} · ${ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}`}
      />

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
