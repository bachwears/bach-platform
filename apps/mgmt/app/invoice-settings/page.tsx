import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { InvoiceSettingsForm } from "../../components/invoice-settings";
import { Nav } from "../../components/nav";

// the roles allowed to write site_content
const EDITORS = new Set(["super_admin", "store_manager"]);

export default async function InvoiceSettingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: branch }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase.from("branches").select("name").eq("is_active", true).order("created_at").limit(1).maybeSingle(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <PageHeader
          icon="invoices"
          title="إعدادات الفاتورة"
          description="شو بيطبع إيصال الكاشير: اللوغو، معلومات المحل، المبالغ، سياسة الإرجاع وجملة آخر الفاتورة — مع معاينة مباشرة."
          hint={{
            title: "إعدادات الفاتورة",
            what: "كل شي بينطبع عالإيصال حوالين البيعة نفسها. البيعة (القطع، الأسعار، الدفع) ما بتتغيّر من هون.",
            source: "جدول site_content (مفتاح invoice). الكاشير بيحفظ نسخة ليطبع حتى بلا نت.",
            edit: "من هون — بعد الحفظ، أول إيصال جديد أو إعادة طباعة بيطلع بالإعدادات الجديدة.",
          }}
        />
        {EDITORS.has(profile?.role ?? "") ? (
          <InvoiceSettingsForm branchName={(branch as { name?: string } | null)?.name ?? ""} />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            إعدادات الفاتورة للسوبر أدمن ومدير المحل بس.
          </p>
        )}
      </main>
    </div>
  );
}
