import { supabaseServer } from "@bach/supabase/server";

import { Eod } from "../../components/eod";
import { PosNav } from "../../components/pos-nav";

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
      <main className="mx-auto max-w-3xl p-4 py-6 print:max-w-none print:p-0">
          <h1 className="flex items-center gap-2 text-lg font-medium print:hidden">تسكير آخر النهار</h1>
        {!allowed ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بتسكير اليوم.</p>
        ) : !branch ? (
          <p className="p-8 text-center text-muted-foreground">ما في فرع مفعّل.</p>
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
