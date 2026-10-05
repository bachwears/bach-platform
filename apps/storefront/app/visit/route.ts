import { NextResponse } from "next/server";
import { supabasePublic } from "@bach/supabase/public";

/** Map links we send shoppers to (the pickup map link is typed in MGMT). */
const MAP_HOSTS = new Set(["www.google.com", "google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl", "share.google"]);

/**
 * bachwears.com/visit: directions to the shop. One stable link for the
 * checkout, order pages and emails; it follows the map link (or, without one,
 * the address) saved in MGMT → Orders → pickup (site_content 'pickup').
 */
export async function GET(req: Request) {
  const { data } = await supabasePublic().from("site_content").select("value").eq("key", "pickup").maybeSingle();
  const v = (data?.value ?? {}) as { address?: string; map_url?: string };
  let target: string | null = null;
  try {
    const u = new URL(String(v.map_url ?? "").trim());
    if (u.protocol === "https:" && MAP_HOSTS.has(u.hostname)) target = u.toString();
  } catch {
    // no or bad map link: fall back to the address
  }
  if (!target && v.address?.trim()) {
    target = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`BACH Wears, ${v.address.trim()}`)}`;
  }
  return NextResponse.redirect(target ?? new URL("/support", req.url), { status: 302, headers: { "Cache-Control": "no-store" } });
}
