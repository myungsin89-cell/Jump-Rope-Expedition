import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'unconfigured';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<'signed-in' | 'confirmation-sent'>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
