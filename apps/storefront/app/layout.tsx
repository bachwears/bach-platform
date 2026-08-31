import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BACH Wears",
  description: "Menswear, considered. BACH Wears — Lebanon.",
};

// EN/LTR default; AR/RTL locale routing lands with the i18n phase.
// Latin renders in Archivo; Arabic glyphs fall through to IBM Plex Sans Arabic.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${archivo.variable} ${plexArabic.variable}`}
      style={{ ["--font-app-sans" as string]: "var(--font-archivo), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif" }}
    >
      <body>{children}</body>
    </html>
  );
}
