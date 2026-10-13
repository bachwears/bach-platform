"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";

export interface PricedLineInput {
  key: string;
  variantId: string;
  quantity: number;
  /** current unit price in cents, as shown */
  unit: number;
  outfitId?: string;
  outfitGroup?: string;
}

export interface PricedCart {
  /** what the looks take off (0 when none is complete) */
  outfitDiscount: number;
  /** what the promo code takes off, after the looks' promo modes */
  promoDiscount: number;
  /** each line's share of its look's saving, by key */
  lineDiscount: Record<string, number>;
  /** the database refused the bag (e.g. a look sold complete only is missing a piece) */
  error: string | null;
  ready: boolean;
}

const EMPTY: PricedCart = { outfitDiscount: 0, promoDiscount: 0, lineDiscount: {}, error: null, ready: false };

/**
 * The bag priced by the same function checkout uses (price_cart), so the bag and
 * the checkout summary show exactly what the order will charge: each look's
 * saving and the promo code after the looks' promo modes.
 */
export function usePricedCart(lines: PricedLineInput[], promo: { kind: "percent" | "fixed"; value: number } | null): PricedCart {
  const [state, setState] = useState<PricedCart>(EMPTY);
  const input = JSON.stringify({ lines, promo });

  useEffect(() => {
    const { lines: ls, promo: pr } = JSON.parse(input) as { lines: PricedLineInput[]; promo: typeof promo };
    if (!ls.length) {
      setState({ ...EMPTY, ready: true });
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabaseBrowser().rpc("price_cart", {
        p_lines: ls.map((l) => ({
          key: l.key,
          variant_id: l.variantId,
          quantity: l.quantity,
          unit: l.unit,
          outfit_id: l.outfitId ?? null,
          outfit_group: l.outfitGroup ?? null,
        })),
        p_promo_kind: pr ? (pr.kind === "percent" ? "percent_bp" : "fixed") : null,
        p_promo_value: pr ? (pr.kind === "percent" ? pr.value * 100 : pr.value) : 0,
      });
      if (!live) return;
      if (error || !data) {
        setState({ ...EMPTY, ready: true, error: error?.message ?? "pricing failed" });
        return;
      }
      const d = data as { outfit_discount: number; promo_discount: number; lines: Array<{ key: string; outfit_discount: number }> };
      setState({
        outfitDiscount: d.outfit_discount,
        promoDiscount: d.promo_discount,
        lineDiscount: Object.fromEntries(d.lines.map((l) => [l.key, l.outfit_discount])),
        error: null,
        ready: true,
      });
    }, 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [input]);

  return state;
}
