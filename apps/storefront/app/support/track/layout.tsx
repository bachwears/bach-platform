import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Track your order — BACH Wears",
  description: "Follow your BACH Wears order from confirmation to delivery.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
