"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PdpNavItem {
  slug: string;
  href: string;
  name: string;
  /** small front photo */
  img: string | null;
}

/**
 * Phones: a sideways swipe on the lead photo moves through the category —
 * finger right-to-left opens the next piece, left-to-right the one before
 * (the way Zara's app flips products). Vertical scrolling is left alone.
 */
export function PdpSwipe({ prev, next, children }: { prev: string | null; next: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (next) router.prefetch(next);
    if (prev) router.prefetch(prev);
  }, [router, next, prev]);

  return (
    <div
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = t ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        const t = e.changedTouches[0];
        start.current = null;
        if (!s || !t) return;
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        // a clear sideways flick, not a scroll
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 800) return;
        const target = dx < 0 ? next : prev;
        if (target) router.push(target);
      }}
    >
      {children}
    </div>
  );
}

/**
 * Phones: the pieces of the same category as a strip of small photos pinned to
 * the bottom of the first screen, just above the pinned buy bar, the current
 * one marked — tap to jump. It steps aside once the shopper scrolls down.
 */
export function PdpStrip({ items, current }: { items: PdpNavItem[]; current: string }) {
  const [shown, setShown] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY < 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // the current piece sits in view
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  if (items.length < 2) return null;
  return (
    <div
      ref={ref}
      aria-label="More in this category"
      className={`fixed inset-x-0 bottom-[var(--buybar-h,4.5rem)] z-20 flex gap-1 overflow-x-auto border-t bg-background px-2 py-1 transition-transform duration-200 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden ${
        shown ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+var(--buybar-h,4.5rem))]"
      }`}
    >
      {items.map((it) => (
        <Link
          key={it.slug}
          href={it.href}
          aria-label={it.name}
          aria-current={it.slug === current ? "page" : undefined}
          className="block h-14 w-10 shrink-0 border border-transparent bg-secondary aria-[current=page]:border-foreground"
        >
          {it.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.img} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}
