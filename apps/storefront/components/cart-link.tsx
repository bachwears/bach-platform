"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <Link href={lhref(locale, "/cart")} className="relative text-muted-foreground hover:text-foreground">
      {t(locale, "sf.nav.bag")}
      {count > 0 && (
        <span className="absolute -top-1.5 start-auto -end-4 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[10px] leading-none text-background">
          {count}
        </span>
      )}
    </Link>
  );
}
