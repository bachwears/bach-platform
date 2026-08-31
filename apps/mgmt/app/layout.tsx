import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";

import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BACH Management",
  description: "لوحة الإدارة — BACH Wears",
};

// Arabic-first UI (Lebanese half-formal tone), RTL end-to-end.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${plexArabic.variable} ${plexMono.variable}`}
      style={{
        ["--font-app-sans" as string]: "var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif",
        ["--font-app-mono" as string]: "var(--font-plex-mono), ui-monospace, monospace",
      }}
    >
      <body>{children}</body>
    </html>
  );
}
