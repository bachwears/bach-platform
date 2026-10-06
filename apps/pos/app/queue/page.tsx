import { supabaseServer } from "@bach/supabase/server";
import { HintDot } from "@bach/ui/components/hint-dot";

import { FulfillmentQueue } from "../../components/fulfillment-queue";
import { PosNav } from "../../components/pos-nav";

const QUEUE_ROLES = new Set(["super_admin", "store_manager", "cashier", "support_agent"]);

export default async function QueuePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = QUEUE_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={null} />
      <main className="mx-auto max-w-3xl p-4 py-6">
          <h1 className="flex items-center gap-2 text-lg font-medium print:hidden">طلبات الأونلاين <HintDot
              hint={{
                title: "مراحل الطلب",
                what: "جديد ← مؤكّد ← قيد التجهيز ← جاهز ← بالشحن ← وصل ← مسكّر. عند «جاهز» بينخصم المخزون فعليًا؛ قبلها القطع محجوزة بس.",
                source: "الطلبات من متجر bachwears.com مباشرة، والزبون بيشوف كل نقلة بحسابه.",
                edit: "كبس زر المرحلة الجاية عند كل طلب. الإلغاء ممكن قبل «جاهز» — بيرجّع الحجز عالبيع.",
              }}
            /></h1>
        {allowed ? (
          <FulfillmentQueue />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة طلبات الأونلاين.</p>
        )}
      </main>
    </div>
  );
}
