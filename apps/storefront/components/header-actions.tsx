"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../lib/locale-client";

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground";

/** Search toggle + hamburger menu (BOSS-style mobile chrome). Panels are glass. */
export function HeaderActions({ children }: { children?: React.ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Route change closes everything (spatial consistency: panels belong to the page you opened them on).
  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const links: Array<[string, string]> = [
    [lhref(locale, "/shop"), t(locale, "sf.nav.shop")],
    [lhref(locale, "/help"), t(locale, "sf.nav.help")],
    [lhref(locale, "/support"), t(locale, "sf.nav.support")],
    [lhref(locale, "/account"), t(locale, "sf.nav.account")],
  ];

  return (
    <>
      <button
        type="button"
        aria-label={t(locale, "sf.nav.searchOpen")}
        aria-expanded={searchOpen}
        className={iconBtn}
        onClick={() => {
          setMenuOpen(false);
          setSearchOpen((v) => !v);
        }}
      >
        {searchOpen ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Search className="h-[18px] w-[18px]" aria-hidden />}
      </button>

      {children}

      <button
        type="button"
        aria-label={menuOpen ? t(locale, "sf.nav.close") : t(locale, "sf.nav.menu")}
        aria-expanded={menuOpen}
        className={`${iconBtn} md:hidden`}
        onClick={() => {
          setSearchOpen(false);
          setMenuOpen((v) => !v);
        }}
      >
        {menuOpen ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Menu className="h-[18px] w-[18px]" aria-hidden />}
      </button>

      {searchOpen && (
        <div className="glass-panel absolute inset-x-0 top-full mt-2 rounded-2xl p-4 shadow-lg ring-1 ring-black/5">
          <form
            role="search"
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const term = q.trim();
              setSearchOpen(false);
              router.push(lhref(locale, term ? `/shop?q=${encodeURIComponent(term)}` : "/shop"));
            }}
          >
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(locale, "sf.shop.searchPlaceholder")}
              aria-label={t(locale, "sf.shop.searchPlaceholder")}
              className="h-10 flex-1 rounded-full border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background"
            >
              {t(locale, "sf.shop.searchButton")}
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav
          aria-label={t(locale, "sf.nav.menu")}
          className="glass-panel absolute inset-x-0 top-full mt-2 rounded-2xl p-2 shadow-lg ring-1 ring-black/5 md:hidden"
        >
          <ul className="divide-y divide-black/5">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="block px-4 py-3 text-sm" onClick={() => setMenuOpen(false)}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
