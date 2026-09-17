import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Sans_Arabic } from "next/font/google";
import { dir } from "@bach/i18n";

import "./globals.css";

import { AssistantWidget } from "../components/assistant-widget";
import { SpinWheel } from "../components/spin-wheel";
import { supabaseServer } from "@bach/supabase/server";
import { ScrollReveal } from "../components/scroll-reveal";
import { BirthdayPopup } from "../components/birthday-popup";
import { MarketingPopup } from "../components/marketing-popup";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { ThemeScript } from "@bach/ui/components/theme-script";
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
  openGraph: {
    title: "BACH Wears",
    description: "Menswear, considered. BACH Wears — Lebanon.",
    url: "https://bachwears.com",
    siteName: "BACH Wears",
    images: [{ url: "/og-image.jpg", width: 1024, height: 537 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
};

// Storefront is English-only (founder decision 2026-09-07); /ar redirects here.
// Latin renders in Archivo; Arabic glyphs fall through to IBM Plex Sans Arabic —
// the stack order flips per locale so each script leads with its own face.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const { data: wheelRow } = await supabase.from("site_content").select("value").eq("key", "wheel").maybeSingle();
  const wheel = (wheelRow?.value ?? {}) as { enabled?: boolean; title?: string; sub?: string };
  const locale = await getLocale();
  const stack =
    locale === "ar"
      ? "var(--font-plex-arabic), var(--font-archivo), ui-sans-serif, system-ui, sans-serif"
      : "var(--font-archivo), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif";
  return (
    <html
      lang={locale}
      dir={dir(locale)}
      suppressHydrationWarning
      className={`${archivo.variable} ${plexArabic.variable}`}
      style={{ ["--font-app-sans" as string]: stack }}
    >
      <body>
        <ThemeScript />
        <div className="flex min-h-dvh flex-col bg-background">
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
        <ScrollReveal />
        <BirthdayPopup />
        <MarketingPopup />
        <AssistantWidget />
        {wheel.enabled ? <SpinWheel title={wheel.title || "Spin & win"} sub={wheel.sub || "One spin per email — win up to 15% off."} /> : null}
      </body>
    </html>
  );
}
