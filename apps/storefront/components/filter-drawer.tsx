"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { t } from "@bach/i18n";

import { useLocale } from "../lib/locale-client";

export interface FilterOption {
  label: string;
  href: string;
  active: boolean;
  count?: number;
  swatch?: string | null;
}

export interface FilterSection {
  label: string;
  options: FilterOption[];
  kind?: "swatch" | "chip" | "list";
}

/**
 * FILTERS opens a solid side panel with every facet (and sorting). Options
 * are plain links prepared on the server, so each filter state is a URL.
 */
export function FilterDrawer({
  sections,
  activeCount,
  resultCount,
  clearHref,
}: {
  sections: FilterSection[];
  activeCount: number;
  resultCount: number;
  clearHref: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="type-label h-11 px-0 hover:opacity-60"
        aria-expanded={open}
      >
        {t(locale, "sf.shop.filter")}
        {activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="anim-fade absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={t(locale, "sf.shop.filter")}
            className="anim-slide-in-end absolute inset-y-0 end-0 flex w-full max-w-md flex-col border-s bg-background"
          >
            <div className="flex h-16 shrink-0 items-center justify-between px-6">
              <p className="type-heading">{t(locale, "sf.shop.filter")}</p>
              <button
                ref={closeRef}
                type="button"
                aria-label={t(locale, "sf.nav.close")}
                className="-me-2 grid h-11 w-11 place-items-center"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" strokeWidth={1} aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto overscroll-contain px-6 pb-8 pt-2">
              {sections
                // an option with nothing behind it is noise; an active one stays so it can be undone
                .map((s) => ({ ...s, options: s.options.filter((o) => o.active || o.count !== 0) }))
                .filter((s) => s.options.length > 0)
                .map((s) => (
                  <div key={s.label}>
                    <p className="type-heading mb-3 text-muted-foreground">{s.label}</p>
                    {s.kind === "list" ? (
                      <ul>
                        {s.options.map((o) => (
                          <li key={o.label}>
                            <Link
                              href={o.href}
                              aria-current={o.active || undefined}
                              className={`type-label block py-2 ${o.active ? "font-medium underline underline-offset-4" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              {o.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {s.options.map((o) => (
                          <Link
                            key={o.label}
                            href={o.href}
                            aria-current={o.active || undefined}
                            className={`type-meta inline-flex h-10 items-center gap-2 border px-3 transition-colors ${
                              o.active ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
                            }`}
                          >
                            {s.kind === "swatch" && o.swatch ? (
                              <span
                                aria-hidden
                                className="h-3 w-3 border border-black/15 dark:border-white/25"
                                style={{ backgroundColor: o.swatch }}
                              />
                            ) : null}
                            {o.label}
                            {typeof o.count === "number" && <span className="opacity-60">({o.count})</span>}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex items-center gap-4 border-t p-6">
              {activeCount > 0 && (
                <Link href={clearHref} className="type-label shrink-0 underline underline-offset-4" onClick={() => setOpen(false)}>
                  {t(locale, "sf.shop.clear")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="type-label h-12 flex-1 bg-foreground text-background"
              >
                {t(locale, "sf.shop.showResults", { n: String(resultCount) })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
