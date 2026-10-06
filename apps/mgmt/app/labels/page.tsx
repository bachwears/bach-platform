import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { LabelPrinting } from "../../components/label-printing";
import { Nav } from "../../components/nav";

const LABEL_ROLES = new Set(["super_admin", "store_manager", "inventory_manager"]);

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ product?: string | string[] }> }) {
  // "Print label" from the catalogue links here with ?product=<id> (one or more)
  const { product } = await searchParams;
  const productIds = (Array.isArray(product) ? product : product ? [product] : []).filter((id) =>
    /^[0-9a-f-]{36}$/i.test(id),
  );
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
        <PageHeader
          icon="labels"
          title="طباعة الليبلات"
          description="ليبلات باركود للقطع عالطابعة الحرارية — دوّر وزيد القطع، الصق أكتر من كود، أو زيد فئة كاملة؛ وبعدين اطبع."
          hint={{
            title: "طباعة الليبلات",
            what: "كل ليبل فيه اسم القطعة، المقاس واللون، السعر والباركود. كل ليبل بيطلع عصفحة لحالو بقياس الرول.",
            source: "الـ SKU والباركود من فاريانتس كل قطعة؛ الطابعة: Gprinter GP-2120TUA.",
            edit: "الباركود والـ SKU بيتعدّلوا من صفحة القطعة (الألوان والمقاسات). عدد النسخ لكل قطعة بتختارو هون.",
          }}
          back={productIds.length ? { href: "/products", label: "المنتجات" } : undefined}
        />
        {LABEL_ROLES.has(profile?.role ?? "") ? (
          <LabelPrinting productIds={productIds} />
        ) : (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            دورك ما بيسمح بطباعة الليبلات — اطلب من مدير المحل أو مسؤول المخزون.
          </p>
        )}
      </main>
    </div>
  );
}
