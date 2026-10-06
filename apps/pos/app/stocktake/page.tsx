import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

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
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-6">
        <PageHeader
          title="الجرد"
          description="عدّ القطع يلي عالرفوف بالمسح، قارن مع المخزون بالنظام، وبعدين المدير بيطبّق الفرق."
          hint={{
            title: "كيف بيمشي الجرد",
            what: "كل مسحة بتزيد عدّ القطعة واحد. «بالنظام» هو المخزون المسجّل، و«الفرق» هو المعدود ناقص يلي بالنظام.",
            source: "المخزون الحالي للفرع. العدّ بينحفظ أول بأول، فيك تكمّل من أي جهاز.",
            edit: "الكاشير بيعدّ بس؛ «طبّق الجرد عالمخزون» لمدير المحل أو مسؤول المخزون. القطع يلي ما انعدّت بتضلّ متل ما هي.",
          }}
        />
        {!COUNT_ROLES.has(profile?.role ?? "") ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بالجرد — اطلب من مسؤول المخزون أو المدير.
          </p>
        ) : !branch ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في فرع مفعّل — الإدارة لازم تفعّل فرع من MGMT قبل الجرد.
          </p>
        ) : (
          <Stocktake branchId={branch.id} canApply={APPLY_ROLES.has(profile?.role ?? "")} />
        )}
      </main>
    </div>
  );
}
