import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">طلبات الإرجاع والتبديل</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الطلبات يلي بيقدّمها الزبائن من الموقع بتوصل لهون — راجعها، اقبلها أو ارفضها، والإرجاع الفعلي بيتسكّر من نقطة البيع.
          </p>
        </div>
        {allowed ? (
          <ReturnsRequestsQueue />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة طلبات الإرجاع.</p>
        )}
      </main>
    </div>
  );
}
