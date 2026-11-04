import { createClient } from "@supabase/supabase-js";

// Server only. The service role key bypasses row level security, so it must
// never get a NEXT_PUBLIC_ prefix or be imported from client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
