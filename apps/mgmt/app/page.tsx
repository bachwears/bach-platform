import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

import { Nav } from "../components/nav";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { count: productCount }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user!.id).single(),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-8 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            أهلا {profile?.full_name ?? user?.email}
          </h1>
          <p className="text-muted-foreground">
            دورك: {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border bg-card p-5">
            <p className="text-sm text-muted-foreground">المنتجات</p>
            <p className="mt-1 text-3xl font-semibold">{productCount ?? 0}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/products">إدارة المنتجات</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
