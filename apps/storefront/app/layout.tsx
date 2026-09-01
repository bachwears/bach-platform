import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import { dir } from "@bach/i18n";

import "./globals.css";

import { AssistantWidget } from "../components/assistant-widget";
import { BirthdayPopup } from "../components/birthday-popup";
import { MarketingPopup } from "../components/marketing-popup";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getLocale } from "../lib/locale";

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
  metadataBase: new URL("https://bachwears.com"),
  title: "BACH Wears",
  description: "Menswear, considered. BACH Wears — Lebanon.",
  alternates: {
    languages: { en: "/", ar: "/ar" },
  },
};

// EN/LTR default; /ar serves the same routes RTL in Arabic (middleware rewrite).
// Latin renders in Archivo; Arabic glyphs fall through to IBM Plex Sans Arabic —
// the stack order flips per locale so each script leads with its own face.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const stack =
    locale === "ar"
      ? "var(--font-plex-arabic), var(--font-archivo), ui-sans-serif, system-ui, sans-serif"
      : "var(--font-archivo), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif";
  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${archivo.variable} ${plexArabic.variable}`}
      style={{ ["--font-app-sans" as string]: stack }}
    >
      <body>
        <div className="flex min-h-dvh flex-col bg-background">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
        <BirthdayPopup />
        <MarketingPopup />
        <AssistantWidget />
      </body>
    </html>
  );
}
