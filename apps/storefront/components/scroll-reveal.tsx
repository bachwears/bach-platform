"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveals [data-reveal] elements with a rise-fade as they enter the viewport.
 * The hidden initial state only applies under html.js-anim (set here), so
 * content stays visible without JavaScript, and reduced-motion users never
 * see hidden content at all (the CSS is media-gated too).
 */
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-anim");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Reveal on entry — and immediately for anything already scrolled
          // past, so scrolling back up never meets a blank block.
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
