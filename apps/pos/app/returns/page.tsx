import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

import { Returns } from "../../components/returns";

const SELLING_ROLES = new Set(["super_admin", "store_manager", "cashier"]);

export default async function ReturnsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: branch }, { data: rate }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user!.id).single(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at").limit(1).single(),
    supabase
      .from("exchange_rates")
      .select("lbp_per_usd")
      .order("effective_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const canSell = SELLING_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3 print:hidden">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-lg font-bold tracking-widest">
            BACH POS
          </Link>
          <span className="text-sm text-muted-foreground">{branch?.name} · مرتجع وتبديل</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← رجوع للكاشير
          </Link>
          <form action="/logout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              خروج
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 py-6">
        {!canSell ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بالمرتجعات.</p>
        ) : !branch || !rate ? (
          <p className="p-8 text-center text-muted-foreground">لازم فرع مفعّل وسعر صرف محدّد قبل المرتجعات.</p>
        ) : (
          <Returns branchId={branch.id} branchName={branch.name} rate={Number(rate.lbp_per_usd)} />
        )}
      </main>
    </div>
  );
}
