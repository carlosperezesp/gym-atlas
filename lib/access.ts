export const ACCESS_COOKIE = "gymatlas_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// The cookie holds an HMAC of the passcode, never the passcode itself, so
// changing APP_PASSCODE signs out every device. Runs in both the Edge and
// Node runtimes, hence Web Crypto.
export async function createAccessToken(passcode: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("gymatlas-access-v1"));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Only same-origin paths, so ?next= can't send someone to another site.
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
