/**
 * Error tracking (MGMT → الأخطاء), shared by the browser and server clients:
 * turns a failed Supabase response into a SupabaseFailure, or null when the
 * answer is expected (no row for .single(), a wrong password, the tracker's
 * own call).
 */
export interface SupabaseFailure {
  status: number;
  method: string;
  /** the endpoint without its query string (filters can hold phone numbers) */
  path: string;
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

const EXPECTED_CODES = new Set(["PGRST116", "PGRST103"]);

export async function failureOf(res: Response, input: RequestInfo | URL, init?: RequestInit): Promise<SupabaseFailure | null> {
  if (res.ok) return null;
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const path = url.pathname;
  if (path.endsWith("/rpc/log_app_error")) return null;
  if (path.startsWith("/auth/") && res.status < 500) return null;
  if (res.status === 416) return null;
  const body = (await res.clone().json().catch(() => null)) as
    | { code?: string; message?: string; error?: string; details?: string; hint?: string }
    | null;
  if (body?.code && EXPECTED_CODES.has(body.code)) return null;
  return {
    status: res.status,
    method: (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase(),
    path,
    code: body?.code,
    message: body?.message ?? body?.error ?? (res.statusText || `HTTP ${res.status}`),
    details: body?.details ?? undefined,
    hint: body?.hint ?? undefined,
  };
}

export function describeFailure(f: SupabaseFailure): string {
  const rpc = f.path.match(/\/rpc\/([\w_]+)/)?.[1];
  const target = rpc ? `rpc ${rpc}` : `${f.method} ${f.path.replace(/^\/(rest|storage)\/v1\//, "")}`;
  return `${target} → ${f.status}${f.code ? ` ${f.code}` : ""}: ${f.message}`;
}

const RETRY_STATUS = new Set([502, 503, 504]);

/**
 * Supabase's gateway now and then answers one read with 502/503/504, or drops
 * the connection. A read (GET/HEAD) is safe to send again, so it gets one more
 * try before anyone sees the failure; writes are never repeated.
 */
export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method !== "GET" && method !== "HEAD") return fetch(input, init);
  try {
    const res = await fetch(input, init);
    if (!RETRY_STATUS.has(res.status) || init?.signal?.aborted) return res;
    void res.body?.cancel().catch(() => undefined);
  } catch (e) {
    if (init?.signal?.aborted) throw e;
  }
  await new Promise((r) => setTimeout(r, 400));
  return fetch(input, init);
}

/** Server side: post a failure straight to log_app_error (no session, no visitor data). */
export function trackedServerFetch(where: string) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await fetchWithRetry(input, init);
    if (res.ok) return res;
    try {
      const f = await failureOf(res, input, init);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (f && url && key) {
        const app = ["storefront", "pos", "mgmt"].includes(process.env.BACH_APP ?? "") ? process.env.BACH_APP : "server";
        void fetch(`${url}/rest/v1/rpc/log_app_error`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            p_app: app,
            p_kind: "db",
            p_message: describeFailure(f).slice(0, 500),
            p_url: null,
            p_context: { where, status: f.status, code: f.code, details: f.details, hint: f.hint, endpoint: f.path },
            p_release: (process.env.NEXT_PUBLIC_BUILD_SHA ?? "").slice(0, 12) || null,
          }),
          signal: AbortSignal.timeout(3000),
        }).catch(() => undefined);
      }
    } catch {
      /* never let tracking break the call */
    }
    return res;
  };
}
