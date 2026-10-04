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

/** Photo tiles at the top of the menu (category banners, newest piece for New in). */
export interface NavTile {
  href: string;
  label: string;
  image: string;
}

// Phones get a bottom tab bar everywhere except where the bottom of the screen
// already carries the purchase (product page ADD bar, bag total, checkout).
const NO_TAB_BAR = [/^\/products\//, /^\/cart/, /^\/checkout/, /^\/confirmed/];

type Mode = "light" | "dark";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Bar-less storefront header (Zara-style, BACH identity): menu + wordmark left,
 * text links on desktop. Phones: wordmark on top and a bottom tab bar (home,
 * menu, search, account, bag). The menu is one drawer for every screen size,
 * with photo tiles and numbered category groups.
 */
export function HeaderActions({
  groups,
  collections,
  hasSale,
  tiles,
}: {
  groups: NavGroup[];
  collections: NavCollection[];
  hasSale: boolean;
  tiles: NavTile[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const path = pathname.replace(/^\/ar(?=\/|$)/, "") || "/";
  const tabBar = !NO_TAB_BAR.some((r) => r.test(path));
  const onBag = path.startsWith("/cart");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<"categories" | "collections">("categories");
  const [mode, setMode] = useState<Mode>("light");
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") setMode("dark");
    } catch {
      /* storage blocked — stay light */
    }
  }, []);

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
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Same contract as @bach/ui ThemeScript (fallback "light"): the storefront is
  // light unless the visitor switches to dark, which is remembered.
  function toggleTheme() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    try {
      if (next === "dark") localStorage.setItem("theme", "dark");
      else localStorage.removeItem("theme");
    } catch {
      /* storage blocked — still applies for this page */
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  const themeLabel = mode === "dark" ? "sf.nav.themeDark" : "sf.nav.themeLight";
  const close = () => setMenuOpen(false);
  const textLink = "type-label py-2 text-foreground transition-opacity hover:opacity-60";

  // The bag opens like a sheet on phones: a close X instead of the header.
  function leaveBag() {
    if (window.history.length > 1) router.back();
    else router.push(lhref(locale, "/"));
  }

  return (
    <>
      {onBag && (
        <div className="flex h-16 items-center px-4 md:hidden">
          <button
            type="button"
            aria-label={t(locale, "sf.nav.close")}
            className="-ms-2 grid h-11 w-11 place-items-center"
            onClick={leaveBag}
          >
            <X className="h-6 w-6" strokeWidth={1} aria-hidden />
          </button>
        </div>
      )}
      <div
        className={`mx-auto h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 ${onBag ? "hidden md:flex" : "flex"}`}
      >
        <div className="flex items-center gap-5">
          <button
            ref={menuBtnRef}
            type="button"
            aria-label={t(locale, "sf.nav.menu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            className={`-ms-2 h-11 w-11 place-items-center ${tabBar ? "hidden md:grid" : "grid"}`}
            onClick={() => setMenuOpen(true)}
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
          <Link
            href={lhref(locale, "/search")}
            className="type-label w-36 border-b border-foreground pb-1 text-start"
          >
            {t(locale, "sf.nav.searchOpen")}
          </Link>
          <AccountLink variant="text" className={textLink} />
          <Link href={lhref(locale, "/help")} className={textLink}>
            {t(locale, "sf.nav.help")}
          </Link>
          <CartLink variant="text" className={textLink} />
        </nav>

        {/* Phones without the tab bar: thin icons. */}
        <div className={`items-center md:hidden ${tabBar ? "hidden" : "flex"}`}>
          <Link
            href={lhref(locale, "/search")}
            aria-label={t(locale, "sf.nav.searchOpen")}
            className="grid h-11 w-11 place-items-center"
          >
            <Search className="h-5 w-5" strokeWidth={1.25} aria-hidden />
          </Link>
          <AccountLink variant="icon" className="grid h-11 w-11 place-items-center">
            <User className="h-5 w-5" strokeWidth={1.25} aria-hidden />
          </AccountLink>
          <CartLink variant="box" className="grid h-11 w-11 place-items-center" />
        </div>
      </div>

      {menuOpen && (
        <div className={`fixed inset-x-0 top-0 z-50 ${tabBar ? "bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0" : "bottom-0"}`}>
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
            <div className={`h-16 shrink-0 items-center px-4 sm:px-8 ${tabBar ? "hidden md:flex" : "flex"}`}>
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

            <div role="tablist" className={`flex gap-6 px-4 sm:px-8 ${tabBar ? "pt-8 md:pt-4" : "pt-4"}`}>
              {(["categories", "collections"] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`type-display relative pb-2 text-[1.75rem] leading-none ${tab === k ? "" : "text-muted-foreground"}`}
                >
                  {t(locale, k === "categories" ? "sf.nav.categories" : "sf.nav.collections")}
                  {tab === k && <span aria-hidden className="absolute bottom-0 start-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-foreground" />}
                </button>
              ))}
            </div>

            {tab === "categories" && tiles.length > 0 && (
              <ul className="mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
                {tiles.map((tile) => (
                  <li key={tile.href} className="w-[38%] shrink-0 snap-start sm:w-36">
                    <Link href={tile.href} onClick={close} className="block">
                      <span className="block aspect-[3/4] overflow-hidden bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tile.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                      </span>
                      <span className="type-meta mt-2 block text-center">{tile.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {tab === "categories" ? (
              <ol className="flex-1 space-y-8 px-4 py-8 sm:px-8">
                <li className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-x-4">
                  <span className="type-meta pt-2 text-muted-foreground">
                    <span className="tabular-nums">|01|</span> {t(locale, "sf.nav.newIn")}
                  </span>
                  <ul>
                    <li>
                      <Link href={lhref(locale, "/shop")} className={`${textLink} block`} onClick={close}>
                        {t(locale, "sf.nav.viewAll")}
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
                  <li key={g.code ?? g.label} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-x-4">
                    <span className="type-meta pt-2 text-muted-foreground">
                      <span className="tabular-nums">|{two(i + 2)}|</span> {g.label}
                    </span>
                    <ul>
                      {g.code ? (
                        <li>
                          <Link href={lhref(locale, `/shop?cat=${g.code}`)} className={`${textLink} block`} onClick={close}>
                            {t(locale, "sf.nav.viewAll")}
                          </Link>
                        </li>
                      ) : null}
                      {g.items.map((c) => (
                        <li key={c.code}>
                          <Link href={lhref(locale, `/shop?cat=${c.code}`)} className={`${textLink} block`} onClick={close}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
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
                  <Link href={lhref(locale, "/track")} className={`${textLink} block`} onClick={close}>
                    {t(locale, "sf.nav.trackOrder")}
                  </Link>
                </li>
                <li>
                  <AccountLink variant="text" className={`${textLink} block`} />
                </li>
                <li>
                  <button type="button" onClick={toggleTheme} className={`${textLink} block`}>
                    {t(locale, "sf.nav.theme")}: {t(locale, themeLabel)}
                  </button>
                </li>
              </ul>
              <p className="type-meta mt-4 normal-case text-muted-foreground" dir="ltr">
                {t(locale, "sf.footer.contact")}
              </p>
            </div>
          </nav>
        </div>
      )}

      {tabBar && (
        <nav
          data-tabbar
          aria-label={t(locale, "sf.nav.tabBar")}
          className="fixed inset-x-0 bottom-0 z-[45] border-t bg-background pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        >
          <ul className="grid h-14 grid-cols-5 items-stretch">
            <li>
              <Link href={lhref(locale, "/")} aria-label={t(locale, "sf.nav.home")} className={tabItem(path === "/" && !menuOpen)} onClick={close}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
                  <path d="M4.5 20V10.5a7.5 6 0 0 1 15 0V20" />
                </svg>
              </Link>
            </li>
            <li>
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                className={tabItem(menuOpen)}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="type-label">{t(locale, "sf.nav.menu")}</span>
              </button>
            </li>
            <li>
              <Link
                href={lhref(locale, "/search")}
                aria-label={t(locale, "sf.nav.searchOpen")}
                className={tabItem(path.startsWith("/search") && !menuOpen)}
                onClick={close}
              >
                <Search className="h-5 w-5" strokeWidth={1} aria-hidden />
              </Link>
            </li>
            <li>
              <AccountLink variant="text" fixedLabel="sf.nav.account" className={tabItem(path.startsWith("/account") && !menuOpen)} />
            </li>
            <li>
              <CartLink variant="box" className={tabItem(false)} />
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}

// Tab bar cell; the active one gets a small dot underneath.
function tabItem(active: boolean) {
  return `type-label relative flex h-full w-full items-center justify-center ${
    active ? "after:absolute after:bottom-2 after:h-1 after:w-1 after:rounded-full after:bg-foreground" : ""
  }`;
}
