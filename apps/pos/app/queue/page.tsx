import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        <PageHeader
          title="طلبات الأونلاين"
          description="طلبات bachwears.com يلي لسّا مفتوحة، الأقدم فوق — كبس الزر عند كل طلب لتنقلو عالمرحلة الجاية."
          hint={{
            title: "مراحل الطلب",
            what: "جديد ← مؤكّد ← قيد التجهيز ← جاهز ← بالشحن ← وصل ← مسكّر. عند «جاهز» بينخصم المخزون فعليًا؛ قبلها القطع محجوزة بس.",
            source: "الطلبات من متجر bachwears.com مباشرة، والزبون بيشوف كل نقلة بحسابه.",
            edit: "كبس زر المرحلة الجاية عند كل طلب. الإلغاء ممكن قبل «جاهز» — بيرجّع الحجز عالبيع.",
          }}
        />
        {allowed ? (
          <FulfillmentQueue />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بإدارة طلبات الأونلاين — اطلب من المدير إذا لازمك هالشاشة.
          </p>
        )}
      </main>
    </div>
  );
}
