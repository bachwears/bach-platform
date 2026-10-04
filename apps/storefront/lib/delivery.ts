"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";

/**
 * Delivery fee for online orders, from site_content 'delivery' (the checkout RPC
 * charges the same rule): a flat fee on the pieces after discounts, free from
 * the threshold up. Defaults: $5, free from $100.
 */
export interface DeliveryRule {
  fee: number;
  freeOver: number;
}

const DEFAULT: DeliveryRule = { fee: 500, freeOver: 10000 };

export function deliveryFor(goodsCents: number, rule: DeliveryRule): number {
  return goodsCents > 0 && goodsCents < rule.freeOver ? rule.fee : 0;
}

export function useDeliveryRule(): DeliveryRule {
  const [rule, setRule] = useState<DeliveryRule>(DEFAULT);
  useEffect(() => {
    void supabaseBrowser()
      .from("site_content")
      .select("value")
      .eq("key", "delivery")
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.value as { fee_usd_cents?: number; free_over_usd_cents?: number } | undefined;
        if (v) setRule({ fee: v.fee_usd_cents ?? DEFAULT.fee, freeOver: v.free_over_usd_cents ?? DEFAULT.freeOver });
      });
  }, []);
  return rule;
}
