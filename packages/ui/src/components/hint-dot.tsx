"use client";

import { useEffect, useRef, useState } from "react";

export interface HintContent {
  title: string;
  what: string;
  source: string;
  edit: string;
  articleHref?: string | null;
}

/**
 * §11 contextual "?" hint: what it is, where the data comes from,
 * where to edit it, and a link to the full article.
 */
export function HintDot({ hint }: { hint: HintContent }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={hint.title}
        onClick={() => setOpen((v) => !v)}
        className="grid h-4 w-4 place-items-center rounded-full border border-muted-foreground/50 text-[10px] leading-none text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        ?
      </button>
      {open && (
        <span className="absolute end-0 top-6 z-30 block w-64 rounded-md border bg-popover p-3 text-start text-xs shadow-lg">
          <span className="block font-medium">{hint.title}</span>
          <span className="mt-1 block text-muted-foreground">{hint.what}</span>
          <span className="mt-2 block">
            <span className="font-medium">مصدر المعلومة: </span>
            <span className="text-muted-foreground">{hint.source}</span>
          </span>
          <span className="mt-1 block">
            <span className="font-medium">وين بتتعدّل: </span>
            <span className="text-muted-foreground">{hint.edit}</span>
          </span>
          {hint.articleHref && (
            <a href={hint.articleHref} className="mt-2 block underline underline-offset-2">
              المقال الكامل ←
            </a>
          )}
        </span>
      )}
    </span>
  );
}
