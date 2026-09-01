import { supabaseServer } from "@bach/supabase/server";

import { LabelPrinting } from "../../components/label-printing";
import { Nav } from "../../components/nav";

const LABEL_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function LabelsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  return (
    <div className="min-h-dvh bg-background">
      <div className="print:hidden">
        <Nav />
      </div>
      <main className="mx-auto max-w-4xl space-y-6 p-4 py-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">طباعة الليبلات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ليبلات باركود للقطع — عالطابعة الحرارية (Gprinter GP-2120TUA). اختار القطع والعدد،
            وبعدين اطبع: كل ليبل بيطلع عصفحة لحالو بقياس الرول.
          </p>
        </div>
        {LABEL_ROLES.has(profile?.role ?? "") ? (
          <LabelPrinting />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بطباعة الليبلات.</p>
        )}
      </main>
    </div>
  );
}
