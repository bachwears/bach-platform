"use client";

import { ErrorScreen } from "@bach/ui/components/error-tracking";

/** The root layout itself crashed: its own minimal page, reported like any other error. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <ErrorScreen app="pos" error={error} reset={reset} lang="ar" global />
      </body>
    </html>
  );
}
