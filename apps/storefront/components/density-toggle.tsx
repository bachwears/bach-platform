"use client";

import { useEffect, useState } from "react";
import { t } from "@bach/i18n";

import { useLocale } from "../lib/locale-client";

const KEY = "shop-density";

/**
 * Switches the product grid between the standard view (2 columns on phones,
 * 4 on desktop) and larger photos (1 / 2). Remembered per visitor.
 */
export function DensityToggle({ target }: { target: string }) {
  const locale = useLocale();
  const [large, setLarge] = useState(false);

  useEffect(() => {
    try {
      setLarge(localStorage.getItem(KEY) === "large");
    } catch {
      /* storage blocked — standard view */
    }
  }, []);

  useEffect(() => {
    document.getElementById(target)?.setAttribute("data-density", large ? "large" : "standard");
  }, [large, target]);

  function choose(next: boolean) {
    setLarge(next);
    try {
      if (next) localStorage.setItem(KEY, "large");
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked — applies to this visit */
    }
  }

  const btn = (on: boolean) =>
    `grid h-11 w-11 place-items-center transition-opacity ${on ? "" : "opacity-35 hover:opacity-70"}`;

  return (
    <div className="flex items-center" role="group" aria-label={t(locale, "sf.shop.view")}>
      <button type="button" aria-pressed={large} aria-label={t(locale, "sf.shop.viewLarge")} className={btn(large)} onClick={() => choose(true)}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
          <rect x="2.5" y="2.5" width="11" height="11" />
        </svg>
      </button>
      <button type="button" aria-pressed={!large} aria-label={t(locale, "sf.shop.viewGrid")} className={btn(!large)} onClick={() => choose(false)}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" />
          <rect x="9" y="2.5" width="4.5" height="4.5" />
          <rect x="2.5" y="9" width="4.5" height="4.5" />
          <rect x="9" y="9" width="4.5" height="4.5" />
        </svg>
      </button>
    </div>
  );
}
