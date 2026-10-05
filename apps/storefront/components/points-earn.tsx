"use client";

import { t } from "@bach/i18n";

import { pointsFor, ptsUnit, useLoyalty } from "../lib/loyalty";
import { useLocale } from "../lib/locale-client";

/**
 * "Earn 24 points with this order" under the bag/checkout total. `goods` = the
 * pieces as they will be paid (delivery excluded), the base the earn trigger
 * counts. Signed-out shoppers learn how guest points reach them. Hidden while
 * the programme is paused or unavailable.
 */
export function PointsEarn({ goods, signedIn, className = "" }: { goods: number; signedIn: boolean; className?: string }) {
  const locale = useLocale();
  const loyalty = useLoyalty();
  if (!loyalty) return null;
  const n = pointsFor(goods, loyalty);
  if (n <= 0) return null;
  return (
    <p className={`type-meta normal-case text-muted-foreground ${className}`}>
      {t(locale, "sf.pts.earn", { n, u: ptsUnit(locale, n) })}
      {signedIn ? "" : t(locale, "sf.pts.earnGuest")}
    </p>
  );
}
