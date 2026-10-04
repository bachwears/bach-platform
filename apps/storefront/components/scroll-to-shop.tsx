"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * "The New / Scroll down" with the moving line: scrolling on past it opens the
 * shop. Only a downward move by the visitor counts (wheel down, swipe up, a
 * downward scroll, arrow/page/space keys outside text fields), so coming back
 * to a page restored at the bottom — and scrolling up from there — never
 * bounces them straight out again.
 */
export function ScrollToShop({ href, title, cue }: { href: string; title: string; cue: string }) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = end.current;
    if (!el) return;
    let armed = false;
    let visible = false;
    let gone = false;
    const go = () => {
      if (gone || !armed || !visible) return;
      gone = true;
      // open the shop at its top: the home page is scrolled far down at this point,
      // and on phones the new page would otherwise keep that offset
      router.push(href, { scroll: false });
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    const down = () => {
      armed = true;
      go();
    };
    let lastY = window.scrollY;
    let touchY: number | null = null;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY) down();
      lastY = y;
    };
    const onWheel = (e: WheelEvent) => e.deltaY > 0 && down();
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
    };
    // finger moving up = page moving down
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (touchY != null && y != null && y < touchY - 8) down();
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (["ArrowDown", "PageDown", "End", " "].includes(e.key)) down();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      ([e]) => {
        visible = !!e?.isIntersecting;
        go();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [href, router]);

  return (
    <section>
      <Link href={href} className="flex flex-col items-center py-24 text-center sm:py-32">
        <h2 className="type-display text-5xl sm:text-6xl">{title}</h2>
        <span className="type-meta mt-3">{cue}</span>
        <span aria-hidden className="scroll-cue mt-10" />
      </Link>
      {/* reaching this strip (by scrolling) opens the shop */}
      <div ref={end} aria-hidden className="h-[45dvh]" />
    </section>
  );
}
