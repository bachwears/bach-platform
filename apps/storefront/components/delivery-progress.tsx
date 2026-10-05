"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t } from "@bach/i18n";

import { onCartChange, readCart } from "../lib/cart";
import { useDeliveryRule } from "../lib/delivery";
import { useLocale } from "../lib/locale-client";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * What the pieces in the bag come to (sale prices applied), read live from the
 * catalogue and kept in step with every add/remove — for places that don't
 * already hold the bag's prices (the PDP's added-to-bag panel).
 */
export function useBagGoods(): number | null {
  const [goods, setGoods] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const lines = readCart();
      if (!lines.length) return live && setGoods(0);
      const { data, error } = await supabaseBrowser()
        .from("product_variants")
        .select("id, products!inner(price_usd_cents, sale_price_usd_cents)")
        .in("id", lines.map((l) => l.variantId));
      if (!live || error) return;
      const price = new Map(
        (data ?? []).map((v) => {
          const p = v.products as unknown as { price_usd_cents: number; sale_price_usd_cents: number | null };
          return [v.id as string, Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents)];
        }),
      );
      setGoods(lines.reduce((s, l) => s + (price.get(l.variantId) ?? 0) * l.quantity, 0));
    };
    void load();
    const off = onCartChange(() => void load());
    return () => {
      live = false;
      off();
    };
  }, []);
  return goods;
}

/**
 * "You're $24 away from free delivery" with a hairline bar (Zara-style), or
 * "Free delivery unlocked" once the pieces reach the threshold. Seeing the gap is
 * what makes one more piece feel worth it. `goods` = pieces after any promo
 * (the same base the checkout charges delivery on).
 */
export function DeliveryProgress({ goods, className = "" }: { goods: number; className?: string }) {
  const locale = useLocale();
  const rule = useDeliveryRule();
  if (goods <= 0 || rule.freeOver <= 0) return null;
  const gap = rule.freeOver - goods;
  const done = gap <= 0;
  const pct = Math.min(100, Math.round((goods / rule.freeOver) * 100));
  return (
    <div className={className} role="status" aria-live="polite">
      <p className="type-meta">
        {done ? t(locale, "sf.cart.freeUnlocked") : t(locale, "sf.cart.awayFromFree", { v: usd(gap) })}
      </p>
      <div
        className="mt-2 h-px w-full bg-foreground/15"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={rule.freeOver / 100}
        aria-valuenow={Math.min(goods, rule.freeOver) / 100}
        aria-label={t(locale, "sf.cart.freeProgress")}
      >
        <div
          className="h-px bg-foreground transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
