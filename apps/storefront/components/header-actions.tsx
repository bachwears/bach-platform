"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, User, X } from "lucide-react";
import { t } from "@bach/i18n";

import { AccountLink } from "./account-link";
import { CartLink } from "./cart-link";
import { lhref, useLocale } from "../lib/locale-client";

export interface NavGroup {
  code: string | null;
  label: string;
  items: Array<{ code: string; label: string }>;
}

export interface NavCollection {
  slug: string;
  label: string;
}

type Mode = "system" | "light" | "dark";
const MODES: Mode[] = ["system", "light", "dark"];

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Bar-less storefront header (Zara-style, BACH identity): menu + wordmark left,
 * text links on desktop / thin icons on phones right. The menu is one drawer
 * for every screen size, with numbered category groups.
 */
export function HeaderActions({
  groups,
  collections,
  hasSale,
}: {
  groups: NavGroup[];
  collections: NavCollection[];
  hasSale: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"categories" | "collections">("categories");
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("system");
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") setMode(stored);
    } catch {
      /* storage blocked — stay on system */
    }
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      menuBtnRef.current?.focus();
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Same contract as @bach/ui ThemeScript: localStorage "theme", absent = follow the device.
  function cycleTheme() {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]!;
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* storage blocked — still applies for this page */
    }
    const dark = next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  const themeLabel = { system: "sf.nav.themeAuto", light: "sf.nav.themeLight", dark: "sf.nav.themeDark" }[mode];
  const close = () => setMenuOpen(false);
  const textLink = "type-label py-2 text-foreground transition-opacity hover:opacity-60";

  return (
    <>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-5">
          <button
            ref={menuBtnRef}
            type="button"
            aria-label={t(locale, "sf.nav.menu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            className="-ms-2 grid h-11 w-11 place-items-center"
            onClick={() => {
              setSearchOpen(false);
              setMenuOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
              <path d="M2 9h20M2 15h20" />
            </svg>
          </button>
          <Link href={lhref(locale, "/")} className="flex shrink-0 items-center" aria-label="BACH Wears">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bach.png" alt="BACH Wears" className="h-[18px] w-auto sm:h-[22px] dark:invert" />
          </Link>
        </div>

        {/* Desktop: text links. */}
        <nav aria-label={t(locale, "sf.nav.account")} className="hidden items-center gap-7 md:flex">
          <button
            type="button"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
            className="type-label w-36 border-b border-foreground pb-1 text-start"
          >
            {t(locale, "sf.nav.searchOpen")}
          </button>
          <AccountLink variant="text" className={textLink} />
          <Link href={lhref(locale, "/help")} className={textLink}>
            {t(locale, "sf.nav.help")}
          </Link>
          <CartLink variant="text" className={textLink} />
        </nav>

        {/* Phones: thin icons. */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            aria-label={t(locale, "sf.nav.searchOpen")}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center"
          >
            {searchOpen ? <X className="h-5 w-5" strokeWidth={1.25} aria-hidden /> : <Search className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
          </button>
          <AccountLink variant="icon" className="grid h-11 w-11 place-items-center">
            <User className="h-5 w-5" strokeWidth={1.25} aria-hidden />
          </AccountLink>
          <CartLink variant="box" className="grid h-11 w-11 place-items-center" />
        </div>
      </div>

      {searchOpen && (
        <div className="border-b bg-background">
          <form
            role="search"
            className="mx-auto flex max-w-[1440px] items-end gap-6 px-4 pb-6 pt-2 sm:px-8"
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
              placeholder={t(locale, "sf.nav.searchPlaceholder")}
              aria-label={t(locale, "sf.nav.searchPlaceholder")}
              className="type-label h-11 min-w-0 flex-1 border-0 border-b border-foreground bg-transparent px-0 outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="type-label h-11 shrink-0 px-1 hover:opacity-60">
              {t(locale, "sf.shop.searchButton")}
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute inset-0 hidden bg-black/20 sm:block"
            onClick={close}
          />
          <nav
            id="site-menu"
            aria-label={t(locale, "sf.nav.menu")}
            className="absolute inset-y-0 start-0 flex w-full flex-col overflow-y-auto overscroll-contain bg-background sm:w-[440px] sm:border-e"
          >
            <div className="flex h-16 shrink-0 items-center px-4 sm:px-8">
              <button
                ref={closeRef}
                type="button"
                aria-label={t(locale, "sf.nav.close")}
                className="-ms-2 grid h-11 w-11 place-items-center"
                onClick={close}
              >
                <X className="h-6 w-6" strokeWidth={1} aria-hidden />
              </button>
            </div>

            <div role="tablist" className="flex gap-6 px-4 pt-4 sm:px-8">
              {(["categories", "collections"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`type-label border-b pb-1 ${tab === k ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}
                >
                  {t(locale, k === "categories" ? "sf.nav.categories" : "sf.nav.collections")}
                </button>
              ))}
            </div>

            {tab === "categories" ? (
              <ol className="flex-1 space-y-8 px-4 py-8 sm:px-8">
                <li className="grid grid-cols-[2.25rem_1fr]">
                  <span className="type-meta pt-2 text-muted-foreground">01</span>
                  <ul>
                    <li>
                      <Link href={lhref(locale, "/shop")} className={`${textLink} block`} onClick={close}>
                        {t(locale, "sf.nav.newIn")}
                      </Link>
                    </li>
                    {hasSale && (
                      <li>
                        <Link href={lhref(locale, "/shop?sale=1")} className={`${textLink} block`} onClick={close}>
                          {t(locale, "sf.nav.onSale")}
                        </Link>
                      </li>
                    )}
                  </ul>
                </li>
                {groups.map((g, i) => (
                  <li key={g.code ?? g.label} className="grid grid-cols-[2.25rem_1fr]">
                    <span className="type-meta pt-2 text-muted-foreground">{two(i + 2)}</span>
                    <div>
                      {g.code ? (
                        <Link
                          href={lhref(locale, `/shop?cat=${g.code}`)}
                          className="type-heading block py-2 text-muted-foreground hover:text-foreground"
                          onClick={close}
                        >
                          {g.label}
                        </Link>
                      ) : (
                        <p className="type-heading py-2 text-muted-foreground">{g.label}</p>
                      )}
                      <ul>
                        {g.items.map((c) => (
                          <li key={c.code}>
                            <Link href={lhref(locale, `/shop?cat=${c.code}`)} className={`${textLink} block`} onClick={close}>
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="flex-1 px-4 py-8 sm:px-8">
                {collections.map((c) => (
                  <li key={c.slug}>
                    <Link href={lhref(locale, `/shop?col=${c.slug}`)} className={`${textLink} block`} onClick={close}>
                      {c.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-4">
                  <Link href={lhref(locale, "/shop")} className={`${textLink} block text-muted-foreground`} onClick={close}>
                    {t(locale, "sf.nav.viewAll")}
                  </Link>
                </li>
              </ul>
            )}

            <div className="mt-auto border-t px-4 py-6 sm:px-8">
              <ul className="flex flex-wrap gap-x-6">
                <li>
                  <Link href={lhref(locale, "/help")} className={`${textLink} block`} onClick={close}>
                    {t(locale, "sf.nav.help")}
                  </Link>
                </li>
                <li>
                  <Link href={lhref(locale, "/support/track")} className={`${textLink} block`} onClick={close}>
                    {t(locale, "sf.nav.trackOrder")}
                  </Link>
                </li>
                <li>
                  <AccountLink variant="text" className={`${textLink} block`} />
                </li>
                <li>
                  <button type="button" onClick={cycleTheme} className={`${textLink} block`}>
                    {t(locale, "sf.nav.theme")}: {t(locale, themeLabel)}
                  </button>
                </li>
              </ul>
              <p className="type-meta mt-4 text-muted-foreground" dir="ltr">
                {t(locale, "sf.footer.contact")}
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
