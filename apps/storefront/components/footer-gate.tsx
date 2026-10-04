"use client";

import { usePathname } from "next/navigation";

/**
 * The site footer (newsletter, help, contact, policies) lives on the account
 * pages only — the rest of the store stays clean (founder decision 2026-10-04).
 * Help and order tracking stay one tap away in the menu.
 */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const path = (usePathname() ?? "/").replace(/^\/ar(?=\/|$)/, "") || "/";
  return path === "/account" || path.startsWith("/account/") ? <>{children}</> : null;
}
