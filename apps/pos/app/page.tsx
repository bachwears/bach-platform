import { supabaseServer } from "@bach/supabase/server";

import { Cashier } from "../components/cashier";
import { PosNav } from "../components/pos-nav";

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
      <PosNav branchName={branch?.name} />

      <main className="mx-auto max-w-6xl p-4 py-4">
        {/* Speed first: no big header here, one quiet line, and the scan box keeps the first focus. */}
        <p className="mb-3 text-xs text-muted-foreground print:hidden">
          بيع بالمحل — امسح القطعة، ضيف الزبون إذا في، وبعدين قبّض وسجّل البيع.
        </p>
        {!canSell ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بالبيع من الكاشير — فيك تفتح الفواتير أو طلبات الأونلاين من التبويبات، أو تطلب من المدير يبدّل دورك.
          </p>
        ) : !branch ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في فرع مفعّل — الإدارة لازم تفعّل فرع من MGMT ← الإعدادات ← الفروع قبل البيع.
          </p>
        ) : !rate ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في سعر صرف محدّد — حدّد سعر الصرف من MGMT ← المالية ← سعر الصرف قبل ما تبيع.
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
