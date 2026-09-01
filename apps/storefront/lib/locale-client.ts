"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@bach/i18n";

/** Client-side: the /ar prefix survives in the browser URL after the middleware rewrite. */
export function useLocale(): Locale {
  const pathname = usePathname() ?? "/";
  return pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";
}

/** Client twin of lhref. */
export function lhref(locale: Locale, href: string): string {
  if (locale !== "ar") return href;
  return href === "/" ? "/ar" : `/ar${href}`;
}
