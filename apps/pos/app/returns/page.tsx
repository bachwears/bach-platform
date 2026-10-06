import { supabaseServer } from "@bach/supabase/server";

import { Returns } from "../../components/returns";
import { PosNav } from "../../components/pos-nav";

const SELLING_ROLES = new Set(["super_admin", "store_manager", "cashier"]);

export default async function ReturnsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: branch }, { data: rate }, { data: tva }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user!.id).single(),
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

      <main className="mx-auto max-w-3xl p-4 py-6">
          <h1 className="flex items-center gap-2 text-lg font-medium print:hidden">مرتجع وتبديل</h1>
        {!canSell ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بالمرتجعات.</p>
        ) : !branch || !rate ? (
          <p className="p-8 text-center text-muted-foreground">لازم فرع مفعّل وسعر صرف محدّد قبل المرتجعات.</p>
        ) : (
          <Returns
            isManager={["super_admin", "store_manager"].includes(profile?.role ?? "")}
            branchId={branch.id}
            branchName={branch.name}
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
