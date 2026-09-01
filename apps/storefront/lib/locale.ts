import { headers } from "next/headers";
import type { Locale } from "@bach/i18n";

/** Server-side: locale set by middleware for /ar/* requests. */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  return h.get("x-locale") === "ar" ? "ar" : "en";
}

/** Prefix an internal href with the locale segment when needed. */
export function lhref(locale: Locale, href: string): string {
  if (locale !== "ar") return href;
  return href === "/" ? "/ar" : `/ar${href}`;
}

/** Pick the Arabic value when present and the locale asks for it. */
export function pick(locale: Locale, en: string, ar: string | null | undefined): string {
  return locale === "ar" && ar ? ar : en;
}
