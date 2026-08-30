import Link from "next/link";
import { Button } from "@bach/ui/components/button";

export function Nav() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            ‏BACH Management
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/products" className="text-muted-foreground hover:text-foreground">
              المنتجات
            </Link>
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
