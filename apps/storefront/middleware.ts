import { NextResponse, type NextRequest } from "next/server";

// /ar and /ar/* serve the same pages in Arabic: the URL keeps the prefix
// (hreflang, shareability) while the app renders from the unprefixed route
// with an x-locale header the layout and pages read.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    const headers = new Headers(request.headers);
    headers.set("x-locale", "ar");
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  // Skip static assets and API routes.
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
