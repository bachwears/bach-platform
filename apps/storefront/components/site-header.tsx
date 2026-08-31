import Link from "next/link";

import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-[0.25em]">
          BACH
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/shop" className="text-muted-foreground hover:text-foreground">
            Shop
          </Link>
          <Link href="/help" className="text-muted-foreground hover:text-foreground">
            Help
          </Link>
          <AccountLink />
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
