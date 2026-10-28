"use client";

import { useEffect, useState } from "react";

import { NETWORK_ERROR, reportError, startErrorTracking, type ErrorApp } from "../lib/error-report";
import { guardDomAgainstTranslation } from "../lib/translate-guard";

// before anything renders on the client: page translation must not crash React
if (typeof window !== "undefined") guardDomAgainstTranslation();

/** Mounted once in each app's root layout: sends this app's errors to MGMT → الأخطاء. */
export function ErrorTracking({ app }: { app: ErrorApp }) {
  useEffect(() => startErrorTracking(app), [app]);
  return null;
}

const RELOADED_KEY = "bach-net-reload";

/**
 * A page that crashed because the connection dropped while it loaded (Instagram's
 * in-app browser does this when it's sent to the background) isn't broken: load
 * it again, once a minute at most so a real outage can't loop. True = reloading.
 */
function reloadAfterNetworkDrop(error: Error): boolean {
  if (!NETWORK_ERROR.test(`${error.name}: ${error.message}`)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOADED_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    return false;
  }
  const go = () => window.location.reload();
  if (navigator.onLine) go();
  else window.addEventListener("online", go, { once: true });
  return true;
}

/**
 * The screen a crashed page falls back to (app/error.tsx, app/global-error.tsx):
 * reports the error once, then offers to try again. A dropped connection
 * reloads the page instead and isn't reported.
 */
export function ErrorScreen({
  app,
  error,
  reset,
  lang = "ar",
  global = false,
}: {
  app: ErrorApp;
  error: Error & { digest?: string };
  reset: () => void;
  lang?: "ar" | "en";
  global?: boolean;
}) {
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (reloadAfterNetworkDrop(error)) {
      setReloading(true);
      return;
    }
    // the boundary can mount before the layout's tracker
    startErrorTracking(app);
    reportError({
      kind: "boundary",
      message: `${error.name}: ${error.message}`,
      stack: error.stack,
      digest: error.digest,
      context: { global },
    });
  }, [app, error, global]);
  const en = lang === "en";
  if (reloading) return <main className="min-h-[60vh]" aria-busy="true" />;
  return (
    <main dir={en ? "ltr" : "rtl"} className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-xl">{en ? "Something went wrong." : "صار في خطأ."}</h1>
      <p className="text-sm text-muted-foreground">
        {en
          ? "We've been notified and are looking into it. Try again — it usually works the second time."
          : "وصلنا الخطأ أوتوماتيك ورح ننتبهلو. جرّب مرة تانية — غالباً بتمشي."}
      </p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground" dir="ltr">ref {error.digest}</p> : null}
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="h-11 border border-foreground bg-foreground px-6 text-sm text-background">
          {en ? "Try again" : "جرّب مرة تانية"}
        </button>
        <a href="/" className="flex h-11 items-center border px-6 text-sm">
          {en ? "Home" : "الرئيسية"}
        </a>
      </div>
    </main>
  );
}
