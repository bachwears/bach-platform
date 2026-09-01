import { supabaseServer } from "@bach/supabase/server";

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">إعدادات الدفع</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            طرق الدفع المقبولة بالمحل والموقع — التفعيل والإطفاء من هون.
          </p>
        </div>
        {allowed ? (
          <PaymentsConfig />
        ) : (
          <p className="p-8 text-center text-muted-foreground">بس السوبر أدمن بيقدر يعدّل طرق الدفع.</p>
        )}
      </main>
    </div>
  );
}
