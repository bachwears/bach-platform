"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@bach/i18n";

import { photoSrc } from "../lib/media";
import { lhref, useLocale } from "../lib/locale-client";

interface Recap {
  n: number;
  lines: Array<{ name: string; size: string; color: string; quantity: number; lineTotal: number; image?: string | null }>;
  total: number;
  discount: number;
  /** delivery fee charged (cents); missing on recaps saved before the fee existed */
  delivery?: number;
  rate: number | null;
  city: string;
  address: string;
  wallet: boolean;
  /** set when the order is collected from the shop (free pickup) */
  pickup?: { address: string; hours: string };
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * What was just ordered, shown back on the confirmation page. Checkout leaves a
 * copy in this browser's session storage; it shows only for the matching order
 * number, and nothing shows when it's missing (another device, a reload later).
 */
export function OrderRecap({ n }: { n: string }) {
  const locale = useLocale();
  const [recap, setRecap] = useState<Recap | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bach-last-order");
      const data = raw ? (JSON.parse(raw) as Recap) : null;
      if (data && String(data.n) === n) setRecap(data);
    } catch {
      /* storage unavailable — the page still confirms the order */
    }
  }, [n]);

  const track = (
    <Link href={lhref(locale, `/track?n=${n}`)} className="type-label inline-block underline underline-offset-4 hover:opacity-60">
      {t(locale, "sf.confirmed.trackLink")}
    </Link>
  );

  if (!recap) return <div className="mt-6">{track}</div>;

  return (
    <section className="mt-12 border-t text-start">
      <h2 className="type-label mt-8">{t(locale, "sf.co.summary")}</h2>
      <ul className="mt-4 divide-y border-y">
        {recap.lines.map((l, i) => (
          <li key={i} className="flex gap-4 py-4">
            <span className="block w-16 shrink-0 bg-secondary">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img {...photoSrc(l.image, "64px")} alt="" className="aspect-[3/4] w-full object-cover" />
              ) : (
                <span className="block aspect-[3/4] w-full" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="type-meta block">{l.name}</span>
              <span className="type-meta mt-1 block text-muted-foreground">
                {l.size} | {l.color} · × {l.quantity}
              </span>
            </span>
            <span className="type-meta tabular-nums">{usd(l.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {recap.discount > 0 ? (
        <p className="type-meta mt-4 flex justify-between text-muted-foreground">
          <span>{t(locale, "sf.co.promoDiscount")}</span>
          <span className="tabular-nums">−{usd(recap.discount)}</span>
        </p>
      ) : null}
      {recap.delivery != null ? (
        <p className="type-meta mt-3 flex justify-between">
          <span>{t(locale, recap.pickup ? "sf.co.pickupLine" : "sf.co.delivery")}</span>
          <span className="tabular-nums">{recap.delivery ? usd(recap.delivery) : t(locale, "sf.co.deliveryFree")}</span>
        </p>
      ) : null}
      <p className="type-label mt-4 flex justify-between">
        <span>{t(locale, "sf.co.total")}</span>
        <span className="tabular-nums">{usd(recap.total)}</span>
      </p>
      {recap.rate ? (
        <p className="type-meta mt-1 text-end tabular-nums text-muted-foreground">
          ≈ {Math.round((recap.total / 100) * recap.rate).toLocaleString("en-US")} LBP
        </p>
      ) : null}

      <dl className="mt-8 space-y-4 text-sm">
        {recap.pickup ? (
          <div>
            <dt className="type-meta text-muted-foreground">{t(locale, "sf.confirmed.pickupAt")}</dt>
            <dd className="mt-1">
              {recap.pickup.address}
              {recap.pickup.hours ? <span className="block text-muted-foreground">{recap.pickup.hours}</span> : null}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="type-meta text-muted-foreground">{t(locale, "sf.confirmed.deliverTo")}</dt>
            <dd className="mt-1">
              {recap.address}, {recap.city}
            </dd>
          </div>
        )}
        <div>
          <dt className="type-meta text-muted-foreground">{t(locale, "sf.co.payment")}</dt>
          <dd className="mt-1">
            {t(locale, recap.wallet ? "sf.confirmed.paidWallet" : recap.pickup ? "sf.confirmed.payAtShop" : "sf.co.cod")}
          </dd>
        </div>
      </dl>
      <div className="mt-8 text-center">{track}</div>
    </section>
  );
}
