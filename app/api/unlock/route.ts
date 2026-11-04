import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_COOKIE_MAX_AGE, createAccessToken, safeEqual } from "@/lib/access";

export async function POST(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) {
    return NextResponse.json({ error: "APP_PASSCODE is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { passcode?: unknown } | null;
  const attempt = typeof body?.passcode === "string" ? body.passcode : "";
  const expected = await createAccessToken(passcode);

  // Web Crypto rejects empty HMAC keys, so an empty attempt can't reach createAccessToken.
  if (!attempt || !safeEqual(await createAccessToken(attempt), expected)) {
    return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return response;
}
