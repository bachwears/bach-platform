import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "BACH Management",
  description: "لوحة الإدارة — BACH Wears",
};

// Arabic-first UI (Lebanese half-formal tone), RTL end-to-end.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
