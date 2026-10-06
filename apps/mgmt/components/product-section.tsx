"use client";

import { useEffect, useRef } from "react";
import { HintDot, type HintContent } from "@bach/ui/components/hint-dot";
import { Icon, type IconName } from "@bach/ui/components/icon";

/** Each product-page section's icon (same meanings as the rest of the portal). */
const SECTION_ICON: Record<string, IconName> = {
  overview: "info",
  basics: "price",
  photos: "categoryImages",
  variants: "colour",
  details: "details",
  "wear-with": "collections",
  seo: "web",
};

/**
 * One collapsible block of the product page. Opens itself when the page jumps
 * to it (#photos etc.), so links from the status bar and checklist always land.
 */
export function ProductSection({
  id,
  step,
  title,
  summary,
  hint,
  defaultOpen = true,
  children,
}: {
  id: string;
  step: number;
  title: string;
  /** a short line under the title: what's in here / what's missing */
  summary?: React.ReactNode;
  hint?: HintContent;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const open = () => {
      if (window.location.hash === `#${id}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [id]);

  return (
    <details ref={ref} id={id} open={defaultOpen} className="group scroll-mt-48 border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-muted/40 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums text-muted-foreground">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-medium">
            {SECTION_ICON[id] ? <Icon name={SECTION_ICON[id]!} size={18} className="text-muted-foreground" /> : null}
            {title}
            {hint ? (
              // the hint button must not toggle the section
              <span onClick={(e) => e.preventDefault()}>
                <HintDot hint={hint} />
              </span>
            ) : null}
          </span>
          {summary ? <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span> : null}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t p-4 sm:p-5">{children}</div>
    </details>
  );
}
