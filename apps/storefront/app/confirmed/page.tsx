import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@bach/i18n";

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
  const [{ n }, locale] = await Promise.all([searchParams, getLocale()]);
  return (
    <div className="min-h-dvh bg-background">
      <main className="form-underline mx-auto grid max-w-xl place-items-center px-4 pb-24 pt-16 text-center sm:pt-24">
        <div>
          <p className="type-meta text-muted-foreground">
            {t(locale, "sf.confirmed.eyebrow")}
          </p>
          <h1 className="type-display mt-4 text-4xl sm:text-5xl">
            {t(locale, "sf.confirmed.thanks")}
            {n ? ` — ${t(locale, "sf.confirmed.order", { n })}` : ""}.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.confirmed.body")}</p>
          <div className="mt-8 space-y-4">
            <Link
              href={lhref(locale, "/account/new")}
              className="type-label inline-grid h-12 place-items-center bg-foreground px-10 text-background hover:opacity-90"
            >
              {t(locale, "sf.confirmed.createAccount")}
            </Link>
            <p className="text-xs text-muted-foreground">{t(locale, "sf.confirmed.track")}</p>
            <Link href={lhref(locale, "/shop")} className="inline-block text-sm underline underline-offset-4">
              {t(locale, "sf.confirmed.continue")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
