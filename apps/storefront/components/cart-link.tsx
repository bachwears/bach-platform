"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { t } from "@bach/i18n";

import { cartCount, onCartChange } from "../lib/cart";
import { lhref, useLocale } from "../lib/locale-client";

export function CartLink() {
  const locale = useLocale();
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(cartCount());
    return onCartChange(() => setCount(cartCount()));
  }, []);

  return (
    <Link
      href={lhref(locale, "/cart")}
      aria-label={t(locale, "sf.nav.bag")}
      className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground"
    >
      <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
      {count > 0 && (
        <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[10px] leading-none text-background">
          {count}
        </span>
      )}
    </Link>
  );
}
