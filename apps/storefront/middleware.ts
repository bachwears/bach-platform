import { NextResponse, type NextRequest } from "next/server";

// Founder decision 2026-09-07: the storefront is English-only. Old /ar URLs
// (indexed or shared) permanently redirect to their English twin instead of 404ing.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  // Skip static assets and API routes.
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
