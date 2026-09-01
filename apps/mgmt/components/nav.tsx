import Link from "next/link";
import { Button } from "@bach/ui/components/button";

const LINKS = [
  { href: "/orders", label: "الطلبات" },
  { href: "/products", label: "المنتجات" },
  { href: "/categories", label: "الفئات" },
  { href: "/inventory", label: "المخزون" },
  { href: "/product-health", label: "صحة البيانات" },
  { href: "/sizes", label: "المقاسات" },
  { href: "/media-import", label: "الصور" },
  { href: "/marketing", label: "التسويق" },
  { href: "/reports", label: "التقارير" },
  { href: "/exchange-rate", label: "سعر الصرف" },
  { href: "/payments", label: "الدفع" },
  { href: "/purchasing", label: "المشتريات" },
  { href: "/returns", label: "الإرجاع" },
  { href: "/complaints", label: "الشكاوى" },
  { href: "/help", label: "مساعدة" },
];

export function Nav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            ‏BACH Management
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="ghost" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      </div>
    </header>
  );
}
