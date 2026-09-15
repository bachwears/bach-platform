import { supabaseServer } from "@bach/supabase/server";

import { Nav } from "../../components/nav";
import { CustomersManager } from "../../components/customers-manager";

export default async function CustomersPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const canDecide = ["super_admin", "store_manager"].includes(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">العملاء</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            بحث بالعملاء، سجل طلباتهم، محافظهم — وتأكيد تعبئات Whish (وعدنا: 6 ساعات كحد أقصى).
          </p>
        </div>
        <CustomersManager canDecide={canDecide} />
      </main>
    </div>
  );
}
