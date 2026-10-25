"use client";

import { ErrorScreen } from "@bach/ui/components/error-tracking";

/** The root layout itself crashed: its own minimal page, reported like any other error. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" dir="ltr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111" }}>
        <ErrorScreen app="storefront" error={error} reset={reset} lang="en" global />
      </body>
    </html>
  );
}
