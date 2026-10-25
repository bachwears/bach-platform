"use client";

import { ErrorScreen } from "@bach/ui/components/error-tracking";

/** A page that crashed: reported to MGMT → الأخطاء, with a way to try again. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen app="pos" error={error} reset={reset} lang="ar" />;
}
