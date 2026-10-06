import { supabaseServer } from "@bach/supabase/server";

import { PageHeader } from "@bach/ui/components/page-header";

import { Nav } from "../../components/nav";
import { CustomersManager } from "../../components/customers-manager";

export default async function CustomersPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const role = profile?.role ?? "";
  const canDecide = ["super_admin", "store_manager"].includes(role);
  // loyalty points: managers adjust by hand; cashiers can also convert to wallet credit
  const canRedeem = ["super_admin", "store_manager", "cashier"].includes(role);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          icon="customers"
          title="الزبائن والمحفظة"
          description="فتّش عن أي زبون لتشوف طلباتو، محفظتو ونقاطو — وأكّد تعبئات Whish المعلّقة (وعدنا: 6 ساعات كحد أقصى)."
          hint={{
            title: "الزبائن والمحفظة",
            what: "كل زبون عمل حساب عالموقع أو انسجّل بالكاشير. افتح الزبون لتشوف سجل طلباتو، حركات محفظتو ونقاطو.",
            source: "جدول الزبائن (customers) مع الطلبات، المحفظة وسجل النقاط.",
            edit: "معلومات الزبون بيعدّلها هو من حسابو. التعبئات والنقاط بتتأكّد من هون.",
          }}
        />
        <CustomersManager canDecide={canDecide} canAdjust={canDecide} canRedeem={canRedeem} />
      </main>
    </div>
  );
}
