import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, createAccessToken, safeEqual } from "@/lib/access";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/unlock", "/api/unlock"]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return await updateSession(request);

  // Local development stays open without a passcode. Production never does:
  // a missing APP_PASSCODE locks the app instead of exposing it.
  const passcode = process.env.APP_PASSCODE;
  if (!passcode && process.env.NODE_ENV !== "production") return await updateSession(request);

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (passcode && token && safeEqual(token, await createAccessToken(passcode))) {
    return await updateSession(request);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.search = "";
  unlockUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
