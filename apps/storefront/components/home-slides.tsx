"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Full-screen editorial slides under the header, swiped sideways (scroll-snap),
 * with arrows on desktop, arrow keys, and a 01 / 08 counter. No autoplay.
 * Slides are server-rendered children; this only adds the navigation.
 */
export function HomeSlides({ children, labels }: { children: React.ReactNode[]; labels: { prev: string; next: string } }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = children.length;

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }, []);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el) return;
      const next = Math.max(0, Math.min(count - 1, i));
      const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
      el.scrollTo({ left: dir * next * el.clientWidth, behavior: "smooth" });
    },
    [count],
  );

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!el.contains(document.activeElement) && document.activeElement !== el) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  return (
    <section className="relative" aria-roledescription="carousel">
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        className="flex h-[calc(100dvh-4rem)] min-h-[520px] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {children.map((slide, i) => (
          <div
            key={i}
            className="relative h-full w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-5 text-white mix-blend-difference sm:px-8">
          <p className="type-meta tabular-nums" aria-live="polite">
            {two(index + 1)} / {two(count)}
          </p>
          <div className="pointer-events-auto hidden items-center md:flex">
            <button
              type="button"
              aria-label={labels.prev}
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="grid h-11 w-11 place-items-center disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={labels.next}
              disabled={index === count - 1}
              onClick={() => go(index + 1)}
              className="grid h-11 w-11 place-items-center disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
