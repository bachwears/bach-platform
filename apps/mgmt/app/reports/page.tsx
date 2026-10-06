import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { PageHeader } from "@bach/ui/components/page-header";
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
        <PageHeader
          icon="reports"
          title="التقارير"
          description="صدّر بياناتك CSV/Excel — للمحاسبة، للتحليل، أو للأرشيف."
          hint={{
            title: "التقارير",
            what: "ملفات CSV (بتنفتح بـExcel) لفترة بتختارها: الطلبات، القطع المباعة، دفتر اليومية (مبيعات، مرتجع، كاش) والمخزون.",
            source: "الأرقام من نفس داتا الطلبات والمخزون الحية — مش نسخة.",
            edit: "اختار الفترة فوق وكبوس التقرير يلي بدّك ياه. للطباعة بهوية BACH استعمل «اطبع التقرير» بالرئيسية أو التحليلات.",
          }}
        />
        {allowed ? (
          <Reports />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            التقارير للسوبر أدمن ومدير المحل بس — اطلب منهن النسخة يلّي بدّك ياها.
          </p>
        )}
      </main>
    </div>
  );
}
