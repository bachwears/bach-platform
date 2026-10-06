import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { PaymentsConfig } from "../../components/payments-config";

export default async function PaymentsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = profile?.role === "super_admin";

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        <PageHeader
          icon="payments"
          title="إعدادات الدفع"
          description="طرق الدفع المقبولة بالمحل والموقع — التفعيل والإطفاء من هون."
        />
        {allowed ? (
          <PaymentsConfig />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            بس السوبر أدمن بيقدر يعدّل طرق الدفع — احكيه إذا بدّك تغيير.
          </p>
        )}
      </main>
    </div>
  );
}
