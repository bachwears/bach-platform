"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  // fixed to the screen and kept inside it (phones cut off a box hung off the "?")
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(288, vw - 24);
      const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, 12), vw - width - 12);
      const h = pop.current?.offsetHeight ?? 180;
      const below = r.bottom + 8;
      const top = below + h > vh - 8 && r.top - 8 - h > 8 ? r.top - 8 - h : Math.min(below, Math.max(8, vh - h - 8));
      setPos({ left, top, width });
    };
    place();
    // measure again once the content has its real height
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: PointerEvent) {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-label={hint.title}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-4 w-4 place-items-center rounded-full border border-muted-foreground/50 text-[10px] leading-none text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        ?
      </button>
      {open &&
        createPortal(
        <span
          ref={pop}
          dir="rtl"
          role="dialog"
          aria-label={hint.title}
          className="fixed z-50 block max-h-[70vh] overflow-y-auto rounded-md border bg-popover p-3 text-start text-xs leading-relaxed shadow-lg"
          style={pos ? { left: pos.left, top: pos.top, width: pos.width } : { visibility: "hidden", left: 0, top: 0, width: 288 }}
        >
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
      , document.body)}
    </span>
  );
}
