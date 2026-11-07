import { createBrowserClient } from "@supabase/ssr";

import { failureOf, fetchWithRetry, type SupabaseFailure } from "./failure";

export type { SupabaseFailure } from "./failure";

/**
 * Error tracking hook (MGMT → الأخطاء): every failed database / storage call
 * made through this client is handed to it. Set by ErrorTracking in each app.
 */
let onFailure: ((f: SupabaseFailure) => void) | null = null;
export function setSupabaseFailureHook(fn: ((f: SupabaseFailure) => void) | null) {
  onFailure = fn;
}

// just what retryExpired needs: typing it as the client would erase supabaseBrowser()'s inferred type
let client: { auth: { refreshSession(): Promise<{ data: { session: { access_token: string } | null } }> } } | null = null;
let refreshing: Promise<string | null> | null = null;

/** One session refresh shared by every call that found its token expired. */
function freshToken(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const { data } = await client!.auth.refreshSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

/**
 * A tab left open (a POS screen overnight, a laptop waking from sleep) can send
 * a call before the client has renewed its sign-in: the database answers 401
 * "JWT expired" (PGRST303) without doing anything. Renew the session once and
 * send the call again with the new token, instead of failing the screen.
 */
async function retryExpired(res: Response, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (res.status !== 401 || !client || input instanceof Request) return res;
  if (typeof ReadableStream !== "undefined" && init?.body instanceof ReadableStream) return res;
  const body = await res.clone().text().catch(() => "");
  if (!/PGRST303|jwt expired/i.test(body)) return res;
  const token = await freshToken();
  if (!token) return res;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetchWithRetry(input, { ...init, headers });
}

async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await retryExpired(await fetchWithRetry(input, init), input, init);
  if (res.ok || !onFailure) return res;
  try {
    const f = await failureOf(res, input, init);
    if (f) onFailure(f);
  } catch {
    /* never let tracking break the call */
  }
  return res;
}

export function supabaseBrowser() {
  // createBrowserClient hands back the same client on every call in the browser
  const c = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: trackedFetch },
  });
  client = c;
  return c;
}
