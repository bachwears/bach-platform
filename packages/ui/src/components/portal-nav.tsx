"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";

export interface PortalNavLink {
  href: string;
  label: string;
}

export interface PortalNavGroup {
  label: string;
  links: PortalNavLink[];
}

export type PortalNavItem = PortalNavLink | PortalNavGroup;

const isGroup = (i: PortalNavItem): i is PortalNavGroup => "links" in i;

/**
 * Arabic-first portal chrome for POS/MGMT: glass bar with the wordmark and
 * title, inline links + hover dropdowns on desktop, and a hamburger glass
 * panel on mobile — the storefront header pattern, tuned for dense back-of-
 * house navigation. Plain anchors keep it framework-light.
 */
export function PortalNav({
  title,
  subtitle,
  items,
  meta,
  logoutLabel = "خروج",
}: {
  title: string;
  subtitle?: string;
  items: PortalNavItem[];
  meta?: string;
  logoutLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 print:hidden sm:px-5">
      <div className="glass-bar relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 shadow-sm ring-1 ring-black/5 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH" className="h-3.5 w-auto dark:invert" />
          <span className="text-sm font-semibold text-muted-foreground">{title}</span>
          {subtitle ? <span className="hidden text-sm text-muted-foreground lg:inline">· {subtitle}</span> : null}
        </a>

        {/* Desktop: inline links, groups as hover dropdowns */}
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {items.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="group relative">
                <button
                  type="button"
                  className="inline-flex h-14 items-center gap-1 text-muted-foreground group-hover:text-foreground group-focus-within:text-foreground"
                  aria-haspopup="true"
                >
                  {item.label}
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div className="glass-panel invisible absolute start-0 top-full mt-1 min-w-44 origin-top -translate-y-1 scale-[0.99] rounded-xl p-1.5 opacity-0 shadow-lg ring-1 ring-black/5 transition-[opacity,transform] duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100 motion-reduce:transition-none motion-reduce:transform-none">
                  {item.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="block rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <a key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {meta ? <span className="hidden max-w-48 truncate text-sm text-muted-foreground xl:inline">{meta}</span> : null}
          <form action="/logout" method="post" className="hidden md:block">
            <Button type="submit" variant="ghost" size="sm">
              {logoutLabel}
            </Button>
          </form>
          <button
            type="button"
            aria-label={open ? "سكّر القائمة" : "القائمة"}
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile: everything in one scrollable glass panel */}
        {open && (
          <nav
            aria-label="القائمة"
            className="glass-panel anim-materialize absolute inset-x-0 top-full mt-2 max-h-[75vh] overflow-y-auto overscroll-contain rounded-2xl p-2 shadow-lg ring-1 ring-black/5 md:hidden"
          >
            {subtitle ? (
              <p className="border-b border-black/5 px-4 py-2.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
            {items.map((item) =>
              isGroup(item) ? (
                <div key={item.label} className="border-b border-black/5 px-4 py-3">
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <ul className="grid grid-cols-2 gap-x-4">
                    {item.links.map((l) => (
                      <li key={l.href}>
                        <a href={l.href} className="block py-1.5 text-sm" onClick={() => setOpen(false)}>
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="block border-b border-black/5 px-4 py-3 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ),
            )}
            <div className="flex items-center justify-between px-4 py-3">
              {meta ? <span className="truncate text-xs text-muted-foreground">{meta}</span> : <span />}
              <form action="/logout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  {logoutLabel}
                </Button>
              </form>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
