"use client";

import { useEffect } from "react";

/**
 * Reveals [data-reveal] elements with a rise-fade as they enter the viewport.
 * The hidden initial state only applies under html.js-anim (set here), so
 * content stays visible without JavaScript, and reduced-motion users never
 * see hidden content at all (the CSS is media-gated too).
 *
 * New elements are picked up as they are added to the page — client-side
 * navigation that only changes the query (shop filters, category tabs) keeps
 * the same pathname, so watching the route alone would leave them hidden.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-anim");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    const watch = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches("[data-reveal]:not(.is-in)")) io.observe(scope);
      scope.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    };
    watch(document);

    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && watch(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return null;
}
