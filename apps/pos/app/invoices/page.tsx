import { supabaseServer } from "@bach/supabase/server";
import { HintDot } from "@bach/ui/components/hint-dot";

import { Invoices } from "../../components/invoices";
import { PosNav } from "../../components/pos-nav";

const ALLOWED = new Set(["super_admin", "store_manager", "cashier", "support_agent"]);

export default async function InvoicesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = ALLOWED.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <PosNav branchName={null} />
      <main className="mx-auto max-w-3xl p-4 py-6">
          <h1 className="flex items-center gap-2 text-lg font-medium print:hidden">الفواتير وسجل الزبائن <HintDot
                hint={{
                  title: "أرشيف الفواتير",
                  what: "كل فواتير المحل والأونلاين بمطرح واحد — فتّش برقم الفاتورة، أو باسم/تلفون الزبون لتشوف كل تاريخه الشرائي ورصيد محفظته.",
                  source: "نفس داتا الطلبات الحية — أي بيع بيظهر هون فوراً.",
                  edit: "للمرتجع: خذ رقم الفاتورة من هون وافتح شاشة مرتجع / تبديل.",
                }}
              /></h1>
        {!allowed ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بعرض الفواتير.</p>
        ) : (
          <Invoices />
        )}
      </main>
    </div>
  );
}
