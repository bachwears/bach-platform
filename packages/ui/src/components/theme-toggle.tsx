"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

const ORDER: Mode[] = ["system", "light", "dark"];

export interface ThemeToggleLabels {
  action: string;
  system: string;
  light: string;
  dark: string;
}

/**
 * Cycles system -> light -> dark. Stores the explicit choice under
 * localStorage "theme" (removed again on "system"), the same contract
 * ThemeScript applies before first paint, so the two never disagree.
 */
export function ThemeToggle({
  labels = { action: "الثيم", system: "تلقائي حسب الجهاز", light: "فاتح", dark: "داكن" },
  className = "",
}: {
  labels?: ThemeToggleLabels;
  className?: string;
}) {
  // Server renders "system"; a stored choice re-syncs after mount.
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "light" || t === "dark") setMode(t);
    } catch {
      /* storage blocked — stay on system */
    }
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]!;
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* storage blocked — still applies for this page */
    }
    const dark =
      next === "dark" || (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${labels.action}: ${labels[mode]}`}
      title={`${labels.action}: ${labels[mode]}`}
      className={`grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground ${className}`}
    >
      {mode === "system" ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      ) : mode === "light" ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
