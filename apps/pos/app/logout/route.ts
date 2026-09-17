import { NextResponse } from "next/server";
import { supabaseServer } from "@bach/supabase/server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // Relative Location: behind the reverse proxy request.url is the
  // container address (0.0.0.0:3000), so an absolute URL built from it
  // would send the browser off-domain.
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}
