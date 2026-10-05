"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t, type Locale } from "@bach/i18n";

/**
 * Loyalty points rules, from the loyalty_settings() RPC (site_content 'loyalty'
 * with defaults and bounds — the same numbers the earn trigger uses).
 * null = loading, paused, or not available (e.g. the migration hasn't landed):
 * every points block hides itself then.
 */
export interface LoyaltySettings {
  pointsPerUsd: number;
  rewardPoints: number;
  rewardUsdCents: number;
  expiryMonths: number;
}

export function useLoyalty(): LoyaltySettings | null {
  const [s, setS] = useState<LoyaltySettings | null>(null);
  useEffect(() => {
    let live = true;
    void supabaseBrowser()
      .rpc("loyalty_settings")
      .then(({ data, error }) => {
        const row = (Array.isArray(data) ? data[0] : data) as
          | { enabled: boolean; points_per_usd: number; reward_points: number; reward_usd_cents: number; expiry_months: number }
          | null
          | undefined;
        if (!live || error || !row?.enabled || !row.reward_points) return;
        setS({
          pointsPerUsd: row.points_per_usd,
          rewardPoints: row.reward_points,
          rewardUsdCents: row.reward_usd_cents,
          expiryMonths: row.expiry_months,
        });
      });
    return () => {
      live = false;
    };
  }, []);
  return s;
}

/** Whole points for the pieces paid (cents), as the earn trigger counts them. */
export function pointsFor(goodsCents: number, s: LoyaltySettings): number {
  return Math.floor((Math.max(goodsCents, 0) * s.pointsPerUsd) / 100);
}

/** Wallet credit (cents) a balance converts into: whole rewards only. */
export function rewardValue(balance: number, s: LoyaltySettings): number {
  return Math.floor(balance / s.rewardPoints) * s.rewardUsdCents;
}

export function usdShort(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/** "1 point per $1. 100 points = $5. Points expire after 6 months without a purchase." */
export function loyaltyRule(locale: Locale, s: LoyaltySettings): string {
  return t(locale, "sf.pts.rule", {
    p: s.pointsPerUsd,
    u: ptsUnit(locale, s.pointsPerUsd),
    r: s.rewardPoints,
    v: usdShort(s.rewardUsdCents),
    m: s.expiryMonths === 1 ? t(locale, "sf.pts.month") : t(locale, "sf.pts.months", { n: s.expiryMonths }),
  });
}

/** "point" / "points" for a count. */
export function ptsUnit(locale: Locale, n: number): string {
  return t(locale, Math.abs(n) === 1 ? "sf.pts.point" : "sf.pts.points");
}
