import { redirect } from "next/navigation";
import type { supabaseServer } from "@bach/supabase/server";

/**
 * The signed-in user for a server page. The middleware only lets a request
 * through with a user, so a missing one here is a hiccup reaching Supabase Auth
 * on the page's own check: load the page again (a visitor who is really signed
 * out is sent to /login by the middleware) instead of crashing on user.id.
 */
export async function pageUser(supabase: Awaited<ReturnType<typeof supabaseServer>>, path: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(path);
  return user;
}
