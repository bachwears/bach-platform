"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@bach/i18n";

import { cartCount, onCartChange } from "../lib/cart";
import { lhref, useLocale } from "../lib/locale-client";

/** "Bag [n]" as text on desktop, the count in a hairline box on phones. */
export function CartLink({ variant, className = "" }: { variant: "text" | "box"; className?: string }) {
  const locale = useLocale();
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    setCount(cartCount());
    return onCartChange(() => {
      setCount((prev) => {
        const next = cartCount();
        // Pop only when something was added — not on load or removal.
        if (next > prev) setPop((k) => k + 1);
        return next;
      });
    });
  }, []);

  const label = t(locale, "sf.nav.bag");
  return (
    <Link href={lhref(locale, "/cart")} aria-label={`${label} (${count})`} className={className}>
      {variant === "text" ? (
        <span key={pop} className={pop > 0 ? "anim-pop inline-block" : undefined}>
          {label} [{count}]
        </span>
      ) : (
        <span
          key={pop}
          className={`grid h-[22px] min-w-[22px] place-items-center border border-current px-1 text-[11px] leading-none tabular-nums ${pop > 0 ? "anim-pop" : ""}`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
