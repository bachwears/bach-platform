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

async function trackedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetchWithRetry(input, init);
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
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: trackedFetch },
  });
}
