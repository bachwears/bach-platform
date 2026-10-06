"use client";

import { useState, type ReactNode } from "react";

/**
 * The product's details as one row of horizontal tabs (Zara-style) instead of
 * stacked lines and fold-outs: one panel open at a time, the row scrolls
 * sideways on narrow phones.
 */
export function PdpTabs({ tabs }: { tabs: Array<{ key: string; label: string; content: ReactNode }> }) {
  const [open, setOpen] = useState(tabs[0]?.key ?? "");
  if (!tabs.length) return null;
  const current = tabs.find((t) => t.key === open) ?? tabs[0]!;
  return (
    <div className="mt-10">
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`pdp-tab-${t.key}`}
            aria-selected={t.key === current.key}
            aria-controls={`pdp-panel-${t.key}`}
            onClick={() => setOpen(t.key)}
            className="type-meta -mb-px shrink-0 whitespace-nowrap border-b border-transparent pb-3 text-muted-foreground transition-colors hover:text-foreground aria-selected:border-foreground aria-selected:text-foreground"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pdp-panel-${current.key}`} aria-labelledby={`pdp-tab-${current.key}`} className="pt-4 text-sm leading-relaxed text-muted-foreground">
        {current.content}
      </div>
    </div>
  );
}
