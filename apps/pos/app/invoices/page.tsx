import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

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
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6 print:max-w-none print:space-y-0 print:p-0">
        <PageHeader
          title="الفواتير وسجل الزبائن"
          icon="invoices"
          description="لاقي أي فاتورة محل أو أونلاين، شوف شو اشترى الزبون ورصيد محفظتو، واطبع الإيصال مرة تانية."
          hint={{
            title: "أرشيف الفواتير",
            what: "كل فواتير المحل والأونلاين بمطرح واحد — فتّش برقم الفاتورة، أو باسم/تلفون الزبون لتشوف كل تاريخه الشرائي ورصيد محفظته.",
            source: "نفس داتا الطلبات الحية — أي بيع بيظهر هون فوراً.",
            edit: "للمرتجع: خذ رقم الفاتورة من هون وافتح شاشة مرتجع / تبديل.",
          }}
        />
        {!allowed ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بعرض الفواتير — اطلب من المدير إذا لازمك هالشاشة.
          </p>
        ) : (
          <Invoices />
        )}
      </main>
    </div>
  );
}
