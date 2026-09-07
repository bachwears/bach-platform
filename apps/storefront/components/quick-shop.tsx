"use client";

import { useEffect, useState } from "react";
import { t } from "@bach/i18n";

import { addToCart } from "../lib/cart";
import { useLocale } from "../lib/locale-client";

export interface QuickShopSize {
  variantId: string;
  size: string;
}

/**
 * BOSS-grade quick shop: hovering a listing card reveals a size row on the
 * image; picking a size drops it straight in the bag. Desktop-hover only —
 * touch devices go through the PDP, where stock and color live.
 */
export function QuickShop({ sizes }: { sizes: QuickShopSize[] }) {
  const locale = useLocale();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(id);
  }, [added]);

  if (!sizes.length) return null;

  return (
    <div
      className="glass-panel invisible absolute inset-x-0 bottom-0 z-10 hidden translate-y-1.5 px-3 pb-3 pt-2 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none motion-reduce:transform-none [@media(hover:hover)]:block"
      onClick={(e) => e.preventDefault()}
    >
      {added ? (
        <p className="py-1.5 text-center text-xs font-medium">{t(locale, "sf.shop.addedShort")}</p>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t(locale, "sf.shop.quickShop")} · {t(locale, "sf.shop.selectSize")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sizes.map((s) => (
              <button
                key={s.variantId}
                type="button"
                className="h-7 min-w-9 rounded-full px-2 text-xs transition-colors hover:bg-foreground hover:text-background"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(s.variantId);
                  setAdded(true);
                }}
              >
                {s.size}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
