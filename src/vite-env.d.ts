/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BOARD_API_URL?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_AUTH_TEST_BYPASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
