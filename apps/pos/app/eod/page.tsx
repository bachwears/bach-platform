import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

import { Eod } from "../../components/eod";
import { PosNav } from "../../components/pos-nav";
import { PrintButton } from "../../components/print-button";

const EOD_ROLES = new Set(["super_admin", "store_manager", "cashier"]);

export default async function EodPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: branch }, { data: hint }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
    supabase.from("hint_registry").select("*").eq("key", "eod-expected-cash").maybeSingle(),
  ]);

  const allowed = EOD_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={branch?.name} />
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6 print:max-w-none print:space-y-0 print:p-0">
        <PageHeader
          title="تسكير آخر النهار"
          description="شوف مبيعات اليوم وشو لازم يكون بالدرج، عدّ المصاري، وسكّر اليوم — بعدين اطبع التقرير ووقّعو."
          actions={allowed && branch ? <PrintButton label="اطبع التقرير" /> : undefined}
        />
        {!allowed ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بتسكير اليوم — الكاشير أو مدير المحل بيسكّر.
          </p>
        ) : !branch ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            ما في فرع مفعّل — الإدارة لازم تفعّل فرع من MGMT قبل التسكير.
          </p>
        ) : (
          <Eod
            branchId={branch.id}
            branchName={branch.name}
            hint={hint ? { title: hint.title_ar, what: hint.what_ar, source: hint.source_ar, edit: hint.edit_ar, articleHref: "/help" } : null}
          />
        )}
      </main>
    </div>
  );
}
