"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SwitcherInner() {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString();
  const isAr = pathname === "/ar" || pathname.startsWith("/ar/");
  const stripped = isAr ? pathname.slice(3) || "/" : pathname;
  const target = (isAr ? stripped : stripped === "/" ? "/ar" : `/ar${stripped}`) + (search ? `?${search}` : "");

  return (
    <Link
      href={target}
      lang={isAr ? "en" : "ar"}
      className="text-muted-foreground hover:text-foreground"
      aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
    >
      {isAr ? "English" : "العربية"}
    </Link>
  );
}

export function LanguageSwitcher() {
  return (
    <Suspense fallback={null}>
      <SwitcherInner />
    </Suspense>
  );
}
