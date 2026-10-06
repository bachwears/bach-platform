import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { PageHeader } from "@bach/ui/components/page-header";
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
        <PageHeader
          icon="purchasing"
          title="المشتريات"
          description="الموردين وطلبات الشراء — من الطلب للاستلام، والمخزون بيتحدّث لحالو عند الاستلام."
          hint={{
            title: "أوامر الشراء",
            what: "طلبيات البضاعة من الموردين: منشئها، بتوصل، بتستلمها — والاستلام بيزيد المخزون تلقائيًا.",
            source: "الاستلام بيسجّل حركة مخزون بسبب «شراء» عالفرع المختار.",
            edit: "أنشئ أمر، ضيف القطع والكميات والكلفة، وعند الوصول كبس استلام.",
          }}
        />
        {!allowed ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بإدارة المشتريات — اطلب من مدير المحل أو مسؤول المخزون.
          </p>
        ) : !branch ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في فرع فعّال — لازم يكون في فرع واحد عالأقل لتستلم عليه البضاعة.
          </p>
        ) : (
          <Purchasing branchId={branch.id} />
        )}
      </main>
    </div>
  );
}
