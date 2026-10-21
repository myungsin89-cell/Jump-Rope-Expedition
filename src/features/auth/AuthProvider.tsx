import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '../../shared/lib/supabase';
import { AuthContext } from './AuthContext';
import type { AuthStatus } from './AuthContext';

const testBypass =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_TEST_BYPASS === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    testBypass ? 'authenticated' : supabase ? 'loading' : 'unconfigured',
  );

  useEffect(() => {
    if (testBypass || !supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : (data.session?.user ?? null));
      setStatus(!error && data.session ? 'authenticated' : 'anonymous');
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase 로그인이 아직 연결되지 않았어요.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase 로그인이 아직 연결되지 않았어요.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (!data.session)
      throw new Error('가입은 됐지만 바로 로그인되지 않았어요. 잠시 후 로그인해 주세요.');
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.assign('#/');
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
