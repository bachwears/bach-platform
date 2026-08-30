import Link from "next/link";

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
        </nav>
      </div>
    </header>
  );
}
