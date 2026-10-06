import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";

import { Dashboard } from "../components/dashboard";
import { MissingPhotosAlert } from "../components/missing-photos-alert";
import { canOpen } from "../lib/access";
import { Nav } from "../components/nav";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

// Home shortcuts for roles without the dashboard: only screens the role can open.
const SHORTCUTS: Array<{ href: string; label: string; what: string }> = [
  { href: "/orders", label: "الطلبات", what: "كل طلبات المحل والأونلاين — افتح أي طلب لتغيّر حالتو." },
  { href: "/returns", label: "طلبات الإرجاع", what: "اقبل أو ارفض طلبات الإرجاع والتبديل من الموقع." },
  { href: "/complaints", label: "الشكاوى", what: "ردّ عالزبائن وسكّر التذاكر." },
  { href: "/customers", label: "الزبائن والمحفظة", what: "فتّش عن زبون، شوف طلباتو، وأكّد تعبئات Whish." },
  { href: "/products", label: "المنتجات", what: "زيد منتج، عدّل الأسعار والصور والوصف." },
  { href: "/inventory", label: "المخزون", what: "الكميات بكل فرع، الحركات والجرد." },
  { href: "/marketing", label: "الحملات والعروض", what: "الخصومات، أكواد الخصم والبوب-أب." },
  { href: "/help", label: "مركز المساعدة", what: "شرح كل شاشة بتلزمك بشغلك." },
];

const DASHBOARD_ROLES = new Set(["super_admin", "store_manager"]);
const CATALOG_ROLES = new Set(["super_admin", "store_manager", "marketing_manager"]);

export default async function Home({ searchParams }: { searchParams: Promise<{ days?: string; denied?: string }> }) {
  const { days: daysParam, denied } = await searchParams;
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
      {denied ? (
        <div role="alert" className="mx-auto mt-6 max-w-6xl border border-foreground/40 p-4 text-sm print:hidden">
          دورك ({ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}) ما بيسمح بفتح هالصفحة: <span dir="ltr">{denied}</span>. إذا لازمتك، احكي السوبر أدمن.
        </div>
      ) : null}
      {CATALOG_ROLES.has(profile?.role ?? "") ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 print:hidden">
          <MissingPhotosAlert />
        </div>
      ) : null}
      {DASHBOARD_ROLES.has(profile?.role ?? "") ? (
        <Dashboard name={profile?.full_name ?? ""} days={days} />
      ) : (
        <main className="mx-auto max-w-6xl space-y-8 p-4 py-8">
          <PageHeader
            icon="home"
            title={`أهلا ${profile?.full_name ?? user?.email ?? ""}`}
            description={`دورك: ${ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? "—"} — اختار شو بدك تعمل، من هون أو من القائمة.`}
          />
          <ul className="grid gap-px border bg-border sm:grid-cols-2">
            {SHORTCUTS.filter((s) => canOpen(s.href, profile?.role)).map((s) => (
              <li key={s.href} className="bg-background">
                <Link href={s.href} className="block h-full p-4 hover:bg-muted/50">
                  <span className="block">{s.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{s.what}</span>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      )}
    </div>
  );
}
