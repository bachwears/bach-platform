/**
 * Server half of error tracking: Next.js calls onRequestError (instrumentation.ts)
 * for every error thrown while rendering a page, running a route or an action.
 * It is posted to log_app_error with the public key (the database fills in
 * nothing about the visitor); failures here are swallowed.
 */
export async function reportServerError(
  app: "storefront" | "pos" | "mgmt",
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string; renderSource?: string },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  const e = err instanceof Error ? err : new Error(String(err));
  const host = { storefront: "bachwears.com", pos: "pos.bachwears.com", mgmt: "mgmt.bachwears.com" }[app];
  try {
    await fetch(`${url}/rest/v1/rpc/log_app_error`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_app: app,
        p_kind: "server",
        p_message: `${e.name}: ${e.message}`.slice(0, 500),
        p_stack: e.stack?.slice(0, 4000) ?? null,
        p_url: `https://${host}${request.path}`,
        p_digest: (err as { digest?: string }).digest ?? null,
        p_context: { method: request.method, route: context.routePath, routeType: context.routeType, renderSource: context.renderSource ?? null },
        p_release: (process.env.NEXT_PUBLIC_BUILD_SHA ?? "").slice(0, 12) || null,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* never fail a request because tracking failed */
  }
}
