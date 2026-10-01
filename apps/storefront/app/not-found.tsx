import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@bach/i18n";

import { getLocale, lhref } from "../lib/locale";

export const metadata: Metadata = { title: "Page not found — BACH Wears" };

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-8 sm:pt-24">
        <p className="type-meta text-muted-foreground">404</p>
        <h1 className="type-display mt-4 text-4xl sm:text-5xl">{t(locale, "sf.404.title")}</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{t(locale, "sf.404.body")}</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href={lhref(locale, "/shop")}
            className="type-label grid h-12 flex-1 place-items-center bg-foreground text-background hover:opacity-90"
          >
            {t(locale, "sf.404.shop")}
          </Link>
          <Link href={lhref(locale, "/search")} className="type-label grid h-12 flex-1 place-items-center border border-foreground hover:bg-secondary">
            {t(locale, "sf.search.title")}
          </Link>
          <Link href={lhref(locale, "/help")} className="type-label grid h-12 flex-1 place-items-center border border-foreground hover:bg-secondary">
            {t(locale, "sf.nav.help")}
          </Link>
        </div>
      </main>
    </div>
  );
}
