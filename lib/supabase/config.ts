export function isSupabaseConfigured() {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      supabaseKey &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project-url") &&
      !supabaseKey.includes("your-supabase-anon-key")
  );
}
