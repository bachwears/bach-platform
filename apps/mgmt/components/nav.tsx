import { PortalNav, type PortalNavItem } from "@bach/ui/components/portal-nav";

// 16 screens don't fit one row — BOSS-style condensed top level with
// role-shaped dropdown groups. Orders stays inline: it's the daily door.
const ITEMS: PortalNavItem[] = [
  { href: "/orders", label: "الطلبات" },
  {
    label: "الكتالوج",
    links: [
      { href: "/products", label: "المنتجات" },
      { href: "/categories", label: "الفئات" },
      { href: "/sizes", label: "المقاسات" },
      { href: "/media-import", label: "الصور" },
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
  { href: "/marketing", label: "التسويق" },
  {
    label: "الدعم",
    links: [
      { href: "/complaints", label: "الشكاوى" },
      { href: "/help", label: "مساعدة" },
    ],
  },
];

export function Nav() {
  return <PortalNav title="Management" items={ITEMS} logoutLabel="تسجيل الخروج" />;
}
