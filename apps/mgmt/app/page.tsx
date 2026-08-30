import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">‏BACH Management</h1>
        <p className="text-muted-foreground">
          أهلا {profile?.full_name ?? user?.email} — دورك: {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
        </p>
        <p className="text-sm text-muted-foreground">لوحة التحكم عم تتجهّز بالمرحلة الجاية.</p>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </main>
  );
}
