import { supabaseServer } from "@bach/supabase/server";
import { Icon } from "@bach/ui/components/icon";
import { PortalNav, type PortalNavItem } from "@bach/ui/components/portal-nav";

import { canOpen } from "../lib/access";

// Grouped by the job at hand, numbered like the storefront menu. Each role only
// sees the screens it can use (lib/access.ts); empty sections disappear.
export const ITEMS: PortalNavItem[] = [
  {
    label: "اليوم",
    links: [
      { href: "/", label: "الرئيسية", icon: <Icon name="home" /> },
      { href: "/orders", label: "الطلبات", icon: <Icon name="orders" /> },
      { href: "/orders/courier", label: "مصاري الشحن", icon: <Icon name="courier" /> },
      { href: "/returns", label: "طلبات الإرجاع", icon: <Icon name="returns" /> },
      { href: "/complaints", label: "الشكاوى", icon: <Icon name="complaints" /> },
    ],
  },
  {
    label: "الزبائن",
    links: [{ href: "/customers", label: "الزبائن والمحفظة", icon: <Icon name="customers" /> }],
  },
  {
    label: "الكتالوج",
    links: [
      { href: "/products", label: "المنتجات", icon: <Icon name="products" /> },
      { href: "/products/new", label: "منتج جديد", icon: <Icon name="newProduct" /> },
      { href: "/categories", label: "الفئات", icon: <Icon name="categories" /> },
      { href: "/categories/images", label: "صور الفئات", icon: <Icon name="categoryImages" /> },
      { href: "/collections", label: "الكولكشنات", icon: <Icon name="collections" /> },
      { href: "/sizes", label: "المقاسات", icon: <Icon name="sizes" /> },
      { href: "/media-import", label: "رفع الصور", icon: <Icon name="photosUpload" /> },
      { href: "/media-match", label: "مطابقة الصور", icon: <Icon name="photosMatch" /> },
      { href: "/product-health", label: "صحة البيانات", icon: <Icon name="dataHealth" /> },
    ],
  },
  {
    label: "المخزون",
    links: [
      { href: "/inventory", label: "المخزون", icon: <Icon name="inventory" /> },
      { href: "/purchasing", label: "المشتريات", icon: <Icon name="purchasing" /> },
      { href: "/transfers", label: "التحويل بين الفروع", icon: <Icon name="transfers" /> },
      { href: "/labels", label: "الليبلات", icon: <Icon name="labels" /> },
    ],
  },
  {
    label: "التسويق",
    links: [
      { href: "/marketing", label: "الحملات والعروض", icon: <Icon name="campaigns" /> },
      { href: "/site-content", label: "محتوى الموقع", icon: <Icon name="siteContent" /> },
      { href: "/analytics", label: "تحليلات الموقع", icon: <Icon name="analytics" /> },
    ],
  },
  {
    label: "المالية",
    links: [
      { href: "/reports", label: "التقارير", icon: <Icon name="reports" /> },
      { href: "/exchange-rate", label: "سعر الصرف", icon: <Icon name="rate" /> },
      { href: "/payments", label: "الدفع", icon: <Icon name="payments" /> },
    ],
  },
  {
    label: "الإدارة",
    links: [
      { href: "/staff", label: "الموظفين", icon: <Icon name="staff" /> },
      { href: "/help-articles", label: "تعديل المساعدة", icon: <Icon name="helpEditor" /> },
    ],
  },
  {
    label: "مساعدة",
    links: [{ href: "/help", label: "مركز المساعدة", icon: <Icon name="help" /> }],
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
