"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Baked into every build (next.config env), so the page knows which version it runs. */
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHECK_EVERY_MS = 2 * 60 * 1000;
/** Back on a tab after this long: reload its data (phones keep pages frozen). */
const STALE_AFTER_MS = 30 * 1000;

/**
 * Keeps a staff portal current, especially on phones:
 * - coming back to the tab after a while reloads the page's data;
 * - when a newer version is live, a bar offers to reload. Never automatic, so a
 *   sale or a form in progress is never lost.
 */
export function FreshApp() {
  const router = useRouter();
  const [update, setUpdate] = useState(false);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!BUILD) return;
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v?: string };
        if (!stop && v && v !== BUILD) setUpdate(true);
      } catch {
        // offline or signed out: try again later
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      if (hiddenAt.current && Date.now() - hiddenAt.current > STALE_AFTER_MS) router.refresh();
      hiddenAt.current = null;
      void check();
    };
    void check();
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  if (!update) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 border-t bg-foreground px-4 py-3 text-sm text-background print:hidden"
    >
      <span>في نسخة جديدة من البرنامج.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-background px-3 py-1 font-medium text-foreground"
      >
        حدّث
      </button>
      <button type="button" onClick={() => setUpdate(false)} className="px-2 opacity-70 hover:opacity-100" aria-label="بعدين">
        بعدين
      </button>
    </div>
  );
}
