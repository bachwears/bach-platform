"use client";

import { useEffect } from "react";

import { reportError, startErrorTracking, type ErrorApp } from "../lib/error-report";

/** Mounted once in each app's root layout: sends this app's errors to MGMT → الأخطاء. */
export function ErrorTracking({ app }: { app: ErrorApp }) {
  useEffect(() => startErrorTracking(app), [app]);
  return null;
}

/**
 * The screen a crashed page falls back to (app/error.tsx, app/global-error.tsx):
 * reports the error once, then offers to try again.
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
  useEffect(() => {
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
