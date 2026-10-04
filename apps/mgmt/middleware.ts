import type { NextRequest } from "next/server";
import { updateSession } from "@bach/supabase/middleware";

import { canOpen } from "./lib/access";

export async function middleware(request: NextRequest) {
  return updateSession(request, canOpen);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
