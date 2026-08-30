import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "BACH Wears",
  description: "Menswear, considered. BACH Wears — Lebanon.",
};

// EN/LTR default; AR/RTL locale routing lands with the i18n phase.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
