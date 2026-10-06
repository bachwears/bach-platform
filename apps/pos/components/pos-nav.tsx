import { supabaseServer } from "@bach/supabase/server";
import { Icon } from "@bach/ui/components/icon";
import { PortalNav } from "@bach/ui/components/portal-nav";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  store_manager: "مدير المحل",
  inventory_manager: "مسؤول المخزون",
  cashier: "كاشير",
  support_agent: "خدمة الزبائن",
  marketing_manager: "مسؤول التسويق",
};

/** The one POS bar on every screen: tabs on large screens, a bottom tab bar on phones. */
export async function PosNav({ branchName }: { branchName?: string | null }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user?.id ?? "").maybeSingle();
  return (
    <PortalNav
      layout="tabs"
      title="POS"
      subtitle={branchName ?? undefined}
      items={[
        { href: "/", label: "بيع", icon: <Icon name="sell" /> },
        { href: "/queue", label: "أونلاين", icon: <Icon name="online" /> },
        { href: "/returns", label: "مرتجع", icon: <Icon name="returns" /> },
        { href: "/invoices", label: "فواتير", icon: <Icon name="invoices" /> },
        { href: "/stocktake", label: "جرد", icon: <Icon name="stocktake" /> },
        { href: "/eod", label: "آخر النهار", icon: <Icon name="endOfDay" /> },
        { href: "/help", label: "مساعدة", icon: <Icon name="help" /> },
      ]}
      meta={`${profile?.full_name ?? user?.email ?? ""} · ${ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? ""}`}
    />
  );
}
