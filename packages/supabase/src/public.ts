import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous, cookie-free client for public catalogue reads (what any visitor
 * sees under RLS). Safe to use inside cached functions: it carries no session,
 * so a cached result can never contain one shopper's private data.
 */
export function supabasePublic() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
