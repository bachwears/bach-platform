import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Start a return — BACH Wears",
  description: "Return or exchange a delivered BACH Wears order within 30 days.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
