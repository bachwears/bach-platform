import { supabaseServer } from "@bach/supabase/server";
import { PortalNav, type PortalNavItem } from "@bach/ui/components/portal-nav";

import { canOpen } from "../lib/access";

// Grouped by the job at hand, numbered like the storefront menu. Each role only
// sees the screens it can use (lib/access.ts); empty sections disappear.
export const ITEMS: PortalNavItem[] = [
  {
    label: "اليوم",
    links: [
      { href: "/", label: "الرئيسية" },
      { href: "/orders", label: "الطلبات" },
      { href: "/orders/courier", label: "مصاري الشحن" },
      { href: "/returns", label: "طلبات الإرجاع" },
      { href: "/complaints", label: "الشكاوى" },
    ],
  },
  {
    label: "الزبائن",
    links: [{ href: "/customers", label: "العملاء والمحفظة" }],
  },
  {
    label: "الكتالوج",
    links: [
      { href: "/products", label: "المنتجات" },
      { href: "/products/new", label: "منتج جديد" },
      { href: "/categories", label: "الفئات" },
      { href: "/categories/images", label: "صور الفئات" },
      { href: "/collections", label: "الكولكشنات" },
      { href: "/sizes", label: "المقاسات" },
      { href: "/media-import", label: "رفع الصور" },
      { href: "/media-match", label: "مطابقة الصور" },
      { href: "/product-health", label: "صحة البيانات" },
    ],
  },
  {
    label: "المخزون",
    links: [
      { href: "/inventory", label: "المخزون" },
      { href: "/purchasing", label: "المشتريات" },
      { href: "/transfers", label: "التحويل بين الفروع" },
      { href: "/labels", label: "الليبلات" },
    ],
  },
  {
    label: "التسويق",
    links: [
      { href: "/marketing", label: "الحملات والعروض" },
      { href: "/site-content", label: "محتوى الموقع" },
      { href: "/analytics", label: "تحليلات الموقع" },
    ],
  },
  {
    label: "المالية",
    links: [
      { href: "/reports", label: "التقارير" },
      { href: "/exchange-rate", label: "سعر الصرف" },
      { href: "/payments", label: "الدفع" },
    ],
  },
  {
    label: "الإدارة",
    links: [
      { href: "/staff", label: "الموظفين" },
      { href: "/help-articles", label: "تعديل المساعدة" },
    ],
  },
  {
    label: "مساعدة",
    links: [{ href: "/help", label: "مركز المساعدة" }],
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
  return <PortalNav title="Management" items={items} logoutLabel="تسجيل الخروج" layout="sidebar" />;
}
