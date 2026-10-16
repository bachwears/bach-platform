import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { CustomerOrder } from "../../components/customer-order";
import { PosNav } from "../../components/pos-nav";

const ORDER_ROLES = new Set(["super_admin", "store_manager", "cashier", "support_agent"]);

export default async function CustomerOrderPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = ORDER_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={null} />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        <PageHeader
          title="طلب لزبون"
          icon="whatsapp"
          description="زبون طلب عالإنستغرام أو الواتساب أو التلفون؟ عبّي معلوماتو هون والطلب بيمشي متل طلب الموقع بالزبط."
          hint={{
            title: "طلب بالنيابة عن الزبون",
            what: "طلب أونلاين عادي بس إنت بتعبّيه: نفس الأسعار، كود الخصم، رسم التوصيل، والدفع عند الاستلام (أو بالمحل إذا استلام). القطع بتنحجز من مخزون الأونلاين.",
            source: "القطع المعروضة عالموقع بس. الطلب بيتسجّل باسم الزبون (برقم تلفونو)، ومكتوب عليه من وين إجا ومين أخدو.",
            edit: "بعد التسجيل بيطلع بشاشة «أونلاين» — من هونيك بتأكّدو، بتجهّزو وبتبعتو متل أي طلب.",
          }}
        />
        {allowed ? (
          <CustomerOrder />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">دورك ما بيسمح بتسجيل طلبات للزباين — اطلب من المدير.</p>
        )}
      </main>
    </div>
  );
}
