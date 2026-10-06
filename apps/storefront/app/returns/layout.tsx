import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Start a return — BACH Wears",
  description: "Return a delivered BACH Wears order within 3 days, or exchange it within 7 days of delivery.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
