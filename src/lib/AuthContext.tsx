import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User, UserRole } from '../types';

interface SignUpResult {
  error: string | null;
  hasSession: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    pseudo: string,
    role: UserRole,
    isProfessional?: boolean
  ) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Empêcher onAuthStateChange d'écraser la session pendant un signup/signin en cours
  const authActionInProgress = useRef(false);

  async function fetchUser(authId: string): Promise<User | null> {
    if (!supabase) return null;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();
      return data as User | null;
    } catch {
      return null;
    }
  }

  // Attendre que le trigger crée le profil (petite latence possible)
  async function fetchUserWithRetry(authId: string, retries = 5): Promise<User | null> {
    for (let i = 0; i < retries; i++) {
      const u = await fetchUser(authId);
      if (u) return u;
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Pattern Supabase v2 : utiliser onAuthStateChange comme source unique de vérité
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        // Si un signup/signin est en cours, ne pas interférer
        if (authActionInProgress.current) return;

        if (event === 'SIGNED_OUT' || !s) {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(s);
        // Important : ne jamais attendre un appel Supabase à l'intérieur de ce rappel.
        // supabase-js le déconseille (blocage interne) : au rechargement de la page,
        // la fiche utilisateur ne se chargeait pas. On diffère donc la lecture.
        setTimeout(async () => {
          const u = await fetchUserWithRetry(s.user.id, 2);
          setUser(u);
          setLoading(false);
        }, 0);
      }
    );

    // Fallback : si onAuthStateChange ne fire pas dans les 3s, débloquer l'app
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Inscription : les métadonnées sont passées au trigger via raw_user_meta_data
  async function signUp(
    email: string,
    password: string,
    fullName: string,
    pseudo: string,
    role: UserRole,
    isProfessional = false
  ): Promise<SignUpResult> {
    if (!supabase) return { error: 'Supabase non configuré', hasSession: false };

    authActionInProgress.current = true;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            pseudo,
            role,
            is_professional: isProfessional,
          },
        },
      });

      if (error) return { error: error.message, hasSession: false };
      if (!data.user) return { error: 'Erreur lors de la création du compte', hasSession: false };

      // Stocker la session immédiatement si elle existe
      if (data.session) {
        setSession(data.session);
      }

      // Attendre que le trigger PostgreSQL crée le profil users
      const u = await fetchUserWithRetry(data.user.id);
      setUser(u);

      return { error: null, hasSession: !!data.session };
    } finally {
      // Laisser un petit délai avant de réactiver onAuthStateChange
      setTimeout(() => { authActionInProgress.current = false; }, 2000);
    }
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase non configuré';

    authActionInProgress.current = true;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;

      // Stocker la session immédiatement
      if (data.session) {
        setSession(data.session);
        const u = await fetchUser(data.session.user.id);
        setUser(u);
      }

      return null;
    } finally {
      setTimeout(() => { authActionInProgress.current = false; }, 2000);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
