"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";

export interface PortalNavLink {
  href: string;
  label: string;
  /** small line icon (POS tabs) */
  icon?: ReactNode;
}

export interface PortalNavGroup {
  label: string;
  links: PortalNavLink[];
}

export type PortalNavItem = PortalNavLink | PortalNavGroup;

const isGroup = (i: PortalNavItem): i is PortalNavGroup => "links" in i;

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    {open ? (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ) : (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    )}
  </svg>
);

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Staff portal chrome (POS + MGMT) in the BACH/Zara language: a flat white bar
 * with a hairline, no glass, no rounded pills.
 *
 * - layout "sidebar" (MGMT): numbered sections, always visible at the start
 *   side on large screens; on phones a full-height panel opened from «القائمة»,
 *   with a filter box to jump straight to a screen.
 * - layout "tabs" (POS): the few POS screens as a tab row on large screens and
 *   a bottom tab bar with icons on phones — one tap from anywhere.
 */
export function PortalNav({
  title,
  subtitle,
  items,
  meta,
  logoutLabel = "خروج",
  layout = "sidebar",
}: {
  title: string;
  subtitle?: string;
  items: PortalNavItem[];
  meta?: string;
  logoutLabel?: string;
  layout?: "sidebar" | "tabs";
}) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // a new page closes the phone menu
  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [path]);

  const groups = useMemo(
    () =>
      items.map((i) => (isGroup(i) ? i : { label: "", links: [i] })).map((g) => ({
        ...g,
        links: q.trim() ? g.links.filter((l) => l.label.includes(q.trim())) : g.links,
      })),
    [items, q],
  );
  const flat = items.flatMap((i) => (isGroup(i) ? i.links : [i]));
  const current = flat.filter((l) => isActive(path, l.href)).sort((a, b) => b.href.length - a.href.length)[0];

  const bar = (
    <header className="sticky top-0 z-40 border-b bg-background print:hidden">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {layout === "sidebar" && (
          <button
            type="button"
            aria-label={open ? "سكّر القائمة" : "القائمة"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="-ms-1 inline-flex h-10 items-center gap-2 px-1 text-sm lg:hidden"
          >
            <MenuIcon open={open} />
            <span>القائمة</span>
          </button>
        )}
        <a href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" />
          <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{title}</span>
        </a>
        {subtitle ? <span className="hidden text-sm text-muted-foreground sm:inline">· {subtitle}</span> : null}
        {current && layout === "sidebar" ? (
          <span className="hidden truncate text-sm md:inline lg:hidden">· {current.label}</span>
        ) : null}

        {layout === "tabs" && (
          <nav aria-label="أقسام الكاشير" className="ms-4 hidden h-14 items-stretch gap-1 text-sm md:flex">
            {flat.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={isActive(path, l.href) && current?.href === l.href ? "page" : undefined}
                className="inline-flex items-center border-b-2 border-transparent px-3 text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="ms-auto flex items-center gap-2">
          {meta ? <span className="hidden max-w-56 truncate text-sm text-muted-foreground xl:inline">{meta}</span> : null}
          <ThemeToggle />
          <form action="/logout" method="post" className={layout === "tabs" ? "" : "hidden lg:block"}>
            <Button type="submit" variant="ghost" size="sm">
              {logoutLabel}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );

  if (layout === "tabs") {
    return (
      <>
        {bar}
        {/* Phones: bottom tab bar, the POS screens one tap away */}
        <nav
          data-tabbar
          aria-label="أقسام الكاشير"
          className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-background pb-[env(safe-area-inset-bottom)] print:hidden md:hidden"
          style={{ gridTemplateColumns: `repeat(${Math.min(flat.length, 6)}, minmax(0, 1fr))` }}
        >
          {flat.slice(0, 6).map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={current?.href === l.href ? "page" : undefined}
              className="flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] leading-tight text-muted-foreground aria-[current=page]:text-foreground"
            >
              <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5" aria-hidden>
                {l.icon}
              </span>
              <span className="max-w-full truncate px-0.5">{l.label}</span>
            </a>
          ))}
        </nav>
      </>
    );
  }

  const menu = (
    <nav aria-label="القائمة" className="space-y-6 p-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="روح على شاشة…"
        aria-label="دوّر بالقائمة"
        className="h-9 w-full border-0 border-b bg-transparent px-0 text-sm outline-none focus:border-foreground"
      />
      {groups.map((g, i) =>
        g.links.length ? (
          <div key={g.label || g.links[0]!.href}>
            {g.label ? (
              <p className="mb-2 flex items-baseline gap-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {g.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {g.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    aria-current={current?.href === l.href ? "page" : undefined}
                    className="block border-s-2 border-transparent py-1.5 ps-3 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      <div className="space-y-2 border-t pt-4 lg:hidden">
        {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
        <form action="/logout" method="post">
          <Button type="submit" variant="outline" size="sm">
            {logoutLabel}
          </Button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {bar}
      {/* Large screens: the menu stays open at the start side */}
      <aside
        data-portal-sidebar
        className="fixed bottom-0 start-0 top-14 z-30 hidden w-60 overflow-y-auto border-e bg-background print:hidden lg:block"
      >
        {menu}
      </aside>
      {/* Phones / tablets: full-height panel */}
      {open && (
        <div className="fixed inset-0 top-14 z-50 lg:hidden">
          <button type="button" aria-label="سكّر القائمة" className="absolute inset-0 bg-foreground/20" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 start-0 top-0 w-[min(20rem,85vw)] overflow-y-auto overscroll-contain border-e bg-background">
            {menu}
          </div>
        </div>
      )}
    </>
  );
}
