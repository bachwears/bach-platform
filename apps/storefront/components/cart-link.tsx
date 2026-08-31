"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { cartCount, onCartChange } from "../lib/cart";

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(cartCount());
    return onCartChange(() => setCount(cartCount()));
  }, []);

  return (
    <Link href="/cart" className="relative text-muted-foreground hover:text-foreground">
      Bag
      {count > 0 && (
        <span className="absolute -left-4 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 font-mono text-[10px] leading-none text-background">
          {count}
        </span>
      )}
    </Link>
  );
}
