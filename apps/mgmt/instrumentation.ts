import type { Instrumentation } from "next";

import { reportServerError } from "@bach/ui/lib/report-server-error";

/** Every server-side error (page render, route, server action) → MGMT → الأخطاء. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  await reportServerError("mgmt", err, request, context);
};
