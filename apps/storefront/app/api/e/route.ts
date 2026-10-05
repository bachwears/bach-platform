import { createHash, randomBytes } from "node:crypto";
import { supabasePublic } from "@bach/supabase/public";

export const dynamic = "force-dynamic";

/**
 * Cookie-free analytics intake (lib/track.ts → here → track_event RPC). The
 * visitor is counted Plausible-style: sha256(daily salt + ip + user agent + site),
 * truncated. The salt changes every UTC day, so the hash can't link days together,
 * and the IP and user agent are used for that one hash and never stored.
 *
 * Salt: ANALYTICS_SALT_SECRET + the date when that server env is set; otherwise a
 * random value held only in this server's memory and replaced every UTC day — it
 * can't be guessed or recovered (a restart mid-day just starts a new salt, which can
 * count a returning visitor twice that day).
 *
 * Always answers 204: tracking must never break or slow the page.
 */
const BOTS =
  /bot|crawl|spider|slurp|archiver|headless|lighthouse|pagespeed|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|axios|node-fetch|go-http|java\/|libwww|scrapy|phantom|selenium|puppeteer|playwright/i;

let memorySalt = { day: "", value: "" };
function saltFor(day: string) {
  const secret = process.env.ANALYTICS_SALT_SECRET;
  if (secret) return createHash("sha256").update(`${secret}:${day}`).digest("hex");
  if (memorySalt.day !== day) memorySalt = { day, value: randomBytes(32).toString("hex") };
  return memorySalt.value;
}

function done() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= max ? v : null;
}

export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOTS.test(ua)) return done();
    // Only our own pages post here (sendBeacon sends Origin on cross-site calls).
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const origin = request.headers.get("origin");
    if (origin && host && new URL(origin).host !== host) return done();

    const raw = await request.text();
    if (!raw || raw.length > 2048) return done();
    const body = JSON.parse(raw) as Record<string, unknown>;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
    const day = new Date().toISOString().slice(0, 10);
    const salt = saltFor(day);
    const visitor = createHash("sha256").update(`${salt}|${ip}|${ua}|${host}`).digest("hex").slice(0, 32);

    const value = typeof body.v === "number" && Number.isInteger(body.v) && body.v >= 0 ? body.v : null;
    const meta = body.m && typeof body.m === "object" && !Array.isArray(body.m) ? body.m : null;
    await supabasePublic().rpc("track_event", {
      p_event: str(body.e, 32),
      p_visitor_hash: visitor,
      p_path: str(body.p, 200),
      p_product: str(body.id, 160),
      p_source: str(body.s, 32),
      p_value_cents: value,
      p_meta: meta,
    });
  } catch {
    /* malformed body or database unreachable: drop the event */
  }
  return done();
}
