import type { Metadata } from "next";
import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { t } from "@bach/i18n";

import { OrderRecap } from "../../components/order-recap";
import { getLocale, lhref } from "../../lib/locale";

export const metadata: Metadata = {
  title: "Order confirmed — BACH Wears",
  robots: { index: false, follow: false },
};

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const [{ n }, locale, supabase] = await Promise.all([searchParams, getLocale(), supabaseServer()]);
  // Signed-in customers already have the order in their account; only guests
  // get the "create an account" offer.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <div className="min-h-dvh bg-background">
      <main className="form-underline mx-auto grid max-w-xl place-items-center px-4 pb-24 pt-16 text-center sm:pt-24">
        <div className="w-full">
          <p className="type-meta text-muted-foreground">
            {t(locale, "sf.confirmed.eyebrow")}
          </p>
          <h1 className="type-display mt-4 text-4xl sm:text-5xl">{t(locale, "sf.confirmed.thanks")}</h1>
          {n ? (
            <p className="type-label mt-5 text-base tracking-wide">{t(locale, "sf.confirmed.order", { n })}</p>
          ) : null}
          <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.confirmed.body")}</p>
          <div className="mt-8 space-y-4">
            <Link
              href={lhref(locale, user ? "/account?open=orders" : "/account/new")}
              className="type-label inline-grid h-12 place-items-center bg-foreground px-10 text-background hover:opacity-90"
            >
              {t(locale, user ? "sf.confirmed.viewOrders" : "sf.confirmed.createAccount")}
            </Link>
            <p className="text-xs text-muted-foreground">
              {t(locale, user ? "sf.confirmed.trackSignedIn" : "sf.confirmed.track")}
            </p>
            <Link href={lhref(locale, "/shop")} className="type-label inline-block underline underline-offset-4 hover:opacity-60">
              {t(locale, "sf.confirmed.continue")}
            </Link>
          </div>
          {n ? <OrderRecap n={n} /> : null}
        </div>
      </main>
    </div>
  );
}
