"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t } from "@bach/i18n";

import { lhref, useLocale } from "../lib/locale-client";

export function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [q, setQ] = useState(initial);

  return (
    <form
      role="search"
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(lhref(locale, term ? `/shop?q=${encodeURIComponent(term)}` : "/shop"));
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(locale, "sf.shop.searchPlaceholder")}
        aria-label={t(locale, "sf.shop.searchPlaceholder")}
        className="h-9 w-56 rounded-full border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground"
      />
      <button
        type="submit"
        className="h-9 rounded-full border px-4 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        {t(locale, "sf.shop.searchButton")}
      </button>
    </form>
  );
}
