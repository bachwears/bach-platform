import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";

import { Dashboard } from "../components/dashboard";
import { Nav } from "../components/nav";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

const DASHBOARD_ROLES = new Set(["super_admin", "store_manager"]);

export default async function Home({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(parseInt(daysParam ?? "", 10)) ? parseInt(daysParam!, 10) : 30;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user!.id).single();

  return (
    <div className="min-h-dvh bg-background">
      <div className="print:hidden">
        <Nav />
      </div>
      {DASHBOARD_ROLES.has(profile?.role ?? "") ? (
        <Dashboard name={profile?.full_name ?? ""} days={days} />
      ) : (
        <main className="mx-auto max-w-6xl space-y-8 p-4 py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              أهلا {profile?.full_name ?? user?.email}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              دورك: {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role} — اختار من فوق شو بدك تدير.
            </p>
          </div>
          <Link href="/products" className="inline-block underline underline-offset-4">
            إدارة المنتجات
          </Link>
        </main>
      )}
    </div>
  );
}
