import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

import "./globals.css";

// Fonts are served from the repo (app/fonts, Google Fonts files under the OFL):
// fetching them from Google at build time made the Docker build fail at random.
// IBM Plex Sans Arabic comes as separate Arabic and Latin files, so it is two
// families: Latin text uses the Latin cut, Arabic falls through to the Arabic one.
const plexArabic = localFont({
  src: [
    { path: "./fonts/PlexArabic-arabic-300.woff2", weight: "300" },
    { path: "./fonts/PlexArabic-arabic-400.woff2", weight: "400" },
    { path: "./fonts/PlexArabic-arabic-500.woff2", weight: "500" },
    { path: "./fonts/PlexArabic-arabic-600.woff2", weight: "600" },
    { path: "./fonts/PlexArabic-arabic-700.woff2", weight: "700" },
  ],
  variable: "--font-plex-arabic",
  display: "swap",
});
const plexArabicLatin = localFont({
  src: [
    { path: "./fonts/PlexArabic-latin-300.woff2", weight: "300" },
    { path: "./fonts/PlexArabic-latin-400.woff2", weight: "400" },
    { path: "./fonts/PlexArabic-latin-500.woff2", weight: "500" },
    { path: "./fonts/PlexArabic-latin-600.woff2", weight: "600" },
    { path: "./fonts/PlexArabic-latin-700.woff2", weight: "700" },
  ],
  variable: "--font-plex-latin",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/PlexMono-latin-400.woff2", weight: "400" },
    { path: "./fonts/PlexMono-latin-500.woff2", weight: "500" },
    { path: "./fonts/PlexMono-latin-600.woff2", weight: "600" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BACH POS",
  description: "نقطة البيع — BACH Wears",
};

// Arabic-first UI (Lebanese half-formal tone), RTL end-to-end.
import { StaffAssistant } from "@bach/ui/components/staff-assistant";
import { ThemeScript } from "@bach/ui/components/theme-script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${plexArabic.variable} ${plexArabicLatin.variable} ${plexMono.variable}`}
      style={{
        ["--font-app-sans" as string]: "var(--font-plex-latin), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif",
        ["--font-app-mono" as string]: "var(--font-plex-mono), ui-monospace, monospace",
      }}
    >
      <body><ThemeScript />{children}<StaffAssistant /></body>
    </html>
  );
}
