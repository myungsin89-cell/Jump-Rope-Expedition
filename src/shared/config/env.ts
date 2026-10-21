const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
  '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  '';

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;
