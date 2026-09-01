import Link from "next/link";
import { t } from "@bach/i18n";

import { getLocale, lhref } from "../../lib/locale";

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const [{ n }, locale] = await Promise.all([searchParams, getLocale()]);
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto grid max-w-xl place-items-center px-4 py-24 text-center">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t(locale, "sf.confirmed.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {t(locale, "sf.confirmed.thanks")}
            {n ? ` — ${t(locale, "sf.confirmed.order", { n })}` : ""}.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t(locale, "sf.confirmed.body")}</p>
          <div className="mt-8 space-y-4">
            <Link
              href={lhref(locale, "/account/new")}
              className="inline-block rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background"
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
