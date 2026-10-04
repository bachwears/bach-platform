import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "Support — BACH Wears",
  description: "Contact BACH Wears customer care — open a request and follow it by ticket number.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
