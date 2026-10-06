import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { ReturnsPolicySettings } from "../../components/returns-policy-settings";
import { ReturnsRequestsQueue } from "../../components/returns-requests-queue";

const QUEUE_ROLES = new Set(["super_admin", "store_manager", "support_agent", "cashier"]);

export default async function ReturnsRequestsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = QUEUE_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <PageHeader
          title="طلبات الإرجاع والتبديل"
          description="الطلبات يلي بيقدّمها الزبائن من الموقع بتوصل لهون — اقبلها أو ارفضها، والإرجاع الفعلي بيتسجّل من شاشة المرتجعات بالكاشير."
          hint={{
            title: "طلبات الإرجاع والتبديل",
            what: "الزبون بيطلب إرجاع أو تبديل من حسابو. القبول أو الرفض بيبعتلو إيميل ورسالة. بعد القبول، لما توصل القطع، الكاشير بيسجّل الإرجاع فبيرجع المخزون والمبلغ وبيتسكّر الطلب لحالو.",
            source: "جدول return_requests، مربوط بالطلب وقطعو.",
            edit: "القرار من هون؛ الإرجاع نفسو من الكاشير ← المرتجعات. المهلة والرسوم من «سياسة الإرجاع» تحت.",
          }}
        />
        {allowed ? (
          <ReturnsRequestsQueue />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">دورك ما بيسمح بإدارة طلبات الإرجاع — إذا لازمك، احكي السوبر أدمن.</p>
        )}
        <ReturnsPolicySettings canEdit={["super_admin", "store_manager", "marketing_manager"].includes(profile?.role ?? "")} />
      </main>
    </div>
  );
}
