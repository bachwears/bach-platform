import { supabaseServer } from "@bach/supabase/server";
import { PortalNav, type PortalNavItem } from "@bach/ui/components/portal-nav";

import { canOpen } from "../lib/access";

// 16 screens don't fit one row — BOSS-style condensed top level with
// role-shaped dropdown groups. Orders stays inline: it's the daily door.
const ITEMS: PortalNavItem[] = [
  { href: "/orders", label: "الطلبات" },
  { href: "/customers", label: "العملاء" },
  {
    label: "الكتالوج",
    links: [
      { href: "/products", label: "المنتجات" },
      { href: "/categories", label: "الفئات" },
      { href: "/categories/images", label: "صور الفئات" },
      { href: "/collections", label: "الكولكشنات" },
      { href: "/sizes", label: "المقاسات" },
      { href: "/media-import", label: "الصور" },
      { href: "/media-match", label: "مطابقة الصور" },
      { href: "/labels", label: "الليبلات" },
      { href: "/product-health", label: "صحة البيانات" },
    ],
  },
  {
    label: "المخزون",
    links: [
      { href: "/inventory", label: "المخزون" },
      { href: "/purchasing", label: "المشتريات" },
    ],
  },
  {
    label: "المالية",
    links: [
      { href: "/reports", label: "التقارير" },
      { href: "/exchange-rate", label: "سعر الصرف" },
      { href: "/payments", label: "الدفع" },
      { href: "/returns", label: "الإرجاع" },
    ],
  },
  {
    label: "التسويق",
    links: [
      { href: "/marketing", label: "الحملات والعروض" },
      { href: "/site-content", label: "محتوى الموقع" },
    ],
  },
  {
    label: "الدعم",
    links: [
      { href: "/complaints", label: "الشكاوى" },
      { href: "/help", label: "مساعدة" },
      { href: "/help-articles", label: "تعديل المساعدة" },
    ],
  },
];

/** The menu shows each role only the screens it can use (lib/access.ts). */
export async function Nav() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const role = profile?.role ?? null;
  const items = ITEMS.flatMap((item): PortalNavItem[] => {
    if (!("links" in item)) return canOpen(item.href, role) ? [item] : [];
    const links = item.links.filter((l) => canOpen(l.href, role));
    return links.length ? [{ ...item, links }] : [];
  });
  return <PortalNav title="Management" items={items} logoutLabel="تسجيل الخروج" />;
}
