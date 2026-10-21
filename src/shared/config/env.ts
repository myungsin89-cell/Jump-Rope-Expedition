const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ??
  '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
  '';
const gameAuthorityUrl =
  import.meta.env.VITE_GAME_API_URL?.trim() ??
  (supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/game-authority` : '');

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  gameAuthorityUrl,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  isGameAuthorityConfigured: Boolean(supabaseUrl && supabaseAnonKey && gameAuthorityUrl),
} as const;
