export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-supabase-project-url") &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-supabase-anon-key")
  );
}
