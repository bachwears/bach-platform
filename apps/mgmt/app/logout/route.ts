import { NextResponse } from "next/server";
import { supabaseServer } from "@bach/supabase/server";

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
