"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ListFilter, X } from "lucide-react";
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
  kind?: "swatch" | "chip";
}

/**
 * BOSS-style filter slide-over: one Filter control opens a glass panel with
 * every facet, counts, and color swatches. Options are plain links prepared
 * on the server, so filtering works with or without JavaScript elsewhere.
 */
export function FilterDrawer({
  sections,
  activeCount,
  resultCount,
  resultsLabelOverride,
}: {
  sections: FilterSection[];
  activeCount: number;
  resultCount: number;
  resultsLabelOverride?: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();

  // Route (or query) change means the shopper picked a filter — keep the
  // drawer open only while they are composing; closing on nav feels abrupt
  // mid-refinement, so we close only via the explicit controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Re-render on filter navigation so counts/active states stay fresh.
  void pathname;
  void search;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors hover:border-foreground"
        aria-expanded={open}
      >
        <ListFilter className="h-4 w-4" aria-hidden />
        {t(locale, "sf.shop.filter")}
        {activeCount > 0 && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t(locale, "sf.nav.close")}
            className="anim-fade absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="glass-panel anim-slide-in-end absolute inset-y-0 end-0 flex w-full max-w-sm flex-col shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <p className="text-sm font-semibold uppercase tracking-wider">{t(locale, "sf.shop.filter")}</p>
              <button
                type="button"
                aria-label={t(locale, "sf.nav.close")}
                className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
                onClick={() => setOpen(false)}
              >
                <X className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-6 py-6">
              {sections.map((s) => (
                <div key={s.label}>
                  <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.options.map((o) => (
                      <Link
                        key={o.label}
                        href={o.href}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          o.active
                            ? "border-foreground bg-foreground text-background"
                            : "text-muted-foreground hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        {s.kind === "swatch" && o.swatch ? (
                          <span
                            aria-hidden
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: o.swatch }}
                          />
                        ) : null}
                        {o.label}
                        {typeof o.count === "number" && (
                          <span className={o.active ? "opacity-70" : "text-muted-foreground/70"}>({o.count})</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-black/5 p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 w-full rounded-full bg-foreground text-sm font-medium text-background"
              >
                {resultsLabelOverride ?? t(locale, "sf.shop.showResults", { n: String(resultCount) })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
