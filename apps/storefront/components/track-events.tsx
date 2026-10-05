"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { track, trackProductView } from "../lib/track";

/** One page_view per route (root layout). */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view");
  }, [pathname]);
  return null;
}

/** product_view, credited to the recommendation row that led here (product page). */
export function ProductViewTracker({ productId, slug }: { productId: string; slug: string }) {
  useEffect(() => {
    trackProductView(productId, slug);
  }, [productId, slug]);
  return null;
}

// 1-3, 4-10, 11-20, 21+ (for n ≥ 1)
function bucket(n: number, edges: number[]): string {
  let lo = 1;
  for (const hi of edges) {
    if (n <= hi) return `${lo}-${hi}`;
    lo = hi + 1;
  }
  return `${lo}+`;
}

/** search: how long the query was and how many results it found — never the words. */
export function SearchTracker({ queryLength, results }: { queryLength: number; results: number }) {
  useEffect(() => {
    if (queryLength <= 0) return;
    track("search", { meta: { len: bucket(queryLength, [3, 10, 20]), hits: results === 0 ? "0" : bucket(results, [5, 20]) } });
  }, [queryLength, results]);
  return null;
}
