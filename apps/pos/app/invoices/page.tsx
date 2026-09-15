import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { HintDot } from "@bach/ui/components/hint-dot";

import { Invoices } from "../../components/invoices";

const ALLOWED = new Set(["super_admin", "store_manager", "cashier", "support_agent"]);

export default async function InvoicesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const allowed = ALLOWED.has(profile?.role ?? "");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 px-3 pt-3 print:hidden sm:px-5">
        <div className="glass-bar mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" />
              <span className="text-sm font-semibold text-muted-foreground">POS</span>
            </Link>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              الفواتير وسجل الزبائن
              <HintDot
                hint={{
                  title: "أرشيف الفواتير",
                  what: "كل فواتير المحل والأونلاين بمطرح واحد — فتّش برقم الفاتورة، أو باسم/تلفون الزبون لتشوف كل تاريخه الشرائي ورصيد محفظته.",
                  source: "نفس داتا الطلبات الحية — أي بيع بيظهر هون فوراً.",
                  edit: "للمرتجع: خذ رقم الفاتورة من هون وافتح شاشة مرتجع / تبديل.",
                }}
              />
            </span>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← رجوع للكاشير
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4 py-6">
        {!allowed ? (
          <p className="p-8 text-center text-muted-foreground">دورك ما بيسمح بعرض الفواتير.</p>
        ) : (
          <Invoices />
        )}
      </main>
    </div>
  );
}
