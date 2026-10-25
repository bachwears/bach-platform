import { setSupabaseFailureHook, supabaseBrowser } from "@bach/supabase/browser";
import { describeFailure } from "@bach/supabase/failure";

/**
 * Error tracking (MGMT → الأخطاء). reportError() sends one error to
 * log_app_error; the database groups it, counts it and emails the admin about
 * new kinds. In the browser a page sends each distinct error at most once every
 * 30 s and 25 in all, so a loop can't flood it.
 */
export type ErrorApp = "storefront" | "pos" | "mgmt";
export type ErrorKind = "client" | "server" | "db" | "boundary" | "unhandled";

export interface ErrorInput {
  kind: ErrorKind;
  message: string;
  stack?: string | null;
  digest?: string | null;
  context?: Record<string, unknown> | null;
  url?: string | null;
}

let app: ErrorApp = "storefront";
const lastSent = new Map<string, number>();
let sentCount = 0;
const MAX_PER_PAGE = 25;

/** A random id for this browser (no personal data), so MGMT can count how many people an error hit. */
let visitorId: string | null = null;
function visitor(): string {
  if (visitorId) return visitorId;
  try {
    visitorId = localStorage.getItem("bach-vid");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("bach-vid", visitorId);
    }
  } catch {
    visitorId ??= Math.random().toString(36).slice(2);
  }
  return visitorId;
}

export const RELEASE = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "").slice(0, 12) || null;

export function reportError(e: ErrorInput) {
  if (typeof window === "undefined") return;
  try {
    const key = `${e.kind}|${e.message}`;
    const now = Date.now();
    if (sentCount >= MAX_PER_PAGE || now - (lastSent.get(key) ?? 0) < 30_000) return;
    lastSent.set(key, now);
    sentCount++;
    void supabaseBrowser()
      .rpc("log_app_error", {
        p_app: app,
        p_kind: e.kind,
        p_message: e.message.slice(0, 500),
        p_stack: e.stack?.slice(0, 4000) ?? null,
        p_url: e.url ?? window.location.href,
        p_digest: e.digest ?? null,
        p_context: { ...(e.context ?? {}), screen: `${window.innerWidth}x${window.innerHeight}`, online: navigator.onLine, visitor: visitor() },
        p_release: RELEASE,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* tracking must never throw */
  }
}

function messageOf(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) return { message: `${reason.name}: ${reason.message}`, stack: reason.stack };
  if (typeof reason === "string") return { message: reason };
  try {
    return { message: JSON.stringify(reason).slice(0, 500) };
  } catch {
    return { message: String(reason) };
  }
}

/** Wire the page: uncaught errors, rejected promises, failed database calls. Returns the cleanup. */
export function startErrorTracking(which: ErrorApp): () => void {
  app = which;
  const onError = (ev: ErrorEvent) => {
    // a failed <img>/<script> load has no message; browser extensions' noise is skipped
    if (!ev.message || /^Script error\.?$/.test(ev.message) || /extension:\/\//.test(ev.filename ?? "")) return;
    // a browser layout notice, not a bug
    if (/ResizeObserver loop/.test(ev.message)) return;
    const { message, stack } = messageOf(ev.error ?? ev.message);
    reportError({ kind: "unhandled", message, stack: stack ?? `at ${ev.filename}:${ev.lineno}:${ev.colno}` });
  };
  const onRejection = (ev: PromiseRejectionEvent) => {
    const { message, stack } = messageOf(ev.reason);
    // a dropped connection isn't a bug (the POS works offline on purpose)
    if (/Failed to fetch|NetworkError|Load failed|AbortError|The operation was aborted/i.test(message)) return;
    reportError({ kind: "unhandled", message, stack });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  setSupabaseFailureHook((f) => {
    reportError({
      kind: "db",
      message: describeFailure(f),
      context: { status: f.status, code: f.code, details: f.details, hint: f.hint, endpoint: f.path },
    });
  });
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    setSupabaseFailureHook(null);
  };
}
