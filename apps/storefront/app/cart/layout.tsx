import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Bag — BACH Wears",
  description: "Your BACH Wears shopping bag and saved favourites. Cash on delivery across Lebanon, in USD or LBP.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
