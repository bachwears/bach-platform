import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh + auth gate for the staff apps (POS / MGMT):
 * - unauthenticated -> /login
 * - must_change_password -> /change-password (CLAUDE.md forced first-login change)
 * - canOpen (optional): a role check per path; refused paths go to /?denied=<path>
 */
export async function updateSession(
  request: NextRequest,
  canOpen?: (path: string, role: string | null) => boolean,
) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user) {
    if (path === "/login") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, role")
    .eq("id", user.id)
    .single();

  if (profile?.must_change_password && path !== "/change-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  if (canOpen && path !== "/" && !canOpen(path, (profile as { role?: string | null } | null)?.role ?? null)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = `?denied=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
