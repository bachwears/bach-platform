import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

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

      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6 print:max-w-none print:space-y-0 print:p-0">
        <PageHeader
          title="مرتجع وتبديل"
          icon="returns"
          description="افتح فاتورة الزبون، اختار القطع يلي عم يرجّعها، وسجّل إرجاع بمصاري أو تبديل بقطع تانية."
          hint={{
            title: "المرتجع والتبديل",
            what: "إرجاع: القطع بترجع عالمخزون والمبلغ بيرجع للزبون كاش أو رصيد بمحفظتو. تبديل: القطع المرجوعة بتنحسب رصيد للقطع الجديدة، والفرق بيندفع أو بيرجع.",
            source: "الفاتورة الأصلية (محل أو أونلاين) ومدّة الإرجاع/التبديل من سياسة المحل.",
            edit: "مدّة الإرجاع والتبديل ورسوم توصيل المرتجع من MGMT ← طلبات الإرجاع. بعد ما تخلص المدّة بدّا موافقة مدير.",
          }}
        />
        {!canSell ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بالمرتجعات — خلّي الكاشير أو المدير يسجّلها.
          </p>
        ) : !branch || !rate ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            لازم فرع مفعّل وسعر صرف محدّد قبل المرتجعات — الإدارة بتحدّدن من MGMT.
          </p>
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
