"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * "The New / Scroll down" with the moving line: scrolling on past it opens the
 * shop. It only fires after the visitor scrolls themselves, so coming back to a
 * page restored at the bottom doesn't bounce them straight out again.
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
      router.push(href);
    };
    const arm = () => {
      armed = true;
      go();
    };
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("touchstart", arm, { passive: true });
    window.addEventListener("touchmove", arm, { passive: true });
    window.addEventListener("keydown", arm);
    // after a touch or wheel, the scroll itself can be what brings the strip in
    window.addEventListener("scroll", go, { passive: true });
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
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("touchmove", arm);
      window.removeEventListener("keydown", arm);
      window.removeEventListener("scroll", go);
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
