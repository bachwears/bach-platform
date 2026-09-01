import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";

export const locales: Record<Locale, Record<string, string>> = { en, ar };

export const rtlLocales: ReadonlySet<Locale> = new Set(["ar"]);

export function dir(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}

/** Translate a key, falling back to English, then the key itself. `vars` fills {placeholders}. */
export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = locales[locale][key] ?? locales.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
