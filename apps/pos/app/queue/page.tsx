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
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" />
            <span className="text-sm font-semibold text-muted-foreground">POS</span>
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
