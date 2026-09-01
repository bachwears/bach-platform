import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { Reports } from "../../components/reports";

const REPORT_ROLES = new Set(["super_admin", "store_manager"]);

export default async function ReportsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = REPORT_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">التقارير</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            صدّر بياناتك CSV/Excel — للمحاسبة، للتحليل، أو للأرشيف.
          </p>
        </div>
        {allowed ? (
          <Reports />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بالتقارير.</p>
        )}
      </main>
    </div>
  );
}
