import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";

export const locales: Record<Locale, Record<string, string>> = { en, ar };

export const rtlLocales: ReadonlySet<Locale> = new Set(["ar"]);

export function dir(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
