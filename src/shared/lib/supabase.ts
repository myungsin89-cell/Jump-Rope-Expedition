import { createClient } from '@supabase/supabase-js';

import { appEnv } from '../config/env';

export const supabase = appEnv.isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    })
  : null;
