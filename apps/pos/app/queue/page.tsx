import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Button } from "@bach/ui/components/button";

import { FulfillmentQueue } from "../../components/fulfillment-queue";

const QUEUE_ROLES = new Set(["super_admin", "store_manager", "cashier", "support_agent"]);

export default async function QueuePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = QUEUE_ROLES.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-lg font-bold tracking-widest">
            BACH POS
          </Link>
          <span className="text-sm text-muted-foreground">طلبات الأونلاين</span>
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
        {allowed ? (
          <FulfillmentQueue />
        ) : (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بإدارة طلبات الأونلاين.</p>
        )}
      </main>
    </div>
  );
}
