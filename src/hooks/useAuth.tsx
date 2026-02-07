import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_CACHE_KEY = 'meetact.session.cache';

const readCachedSession = (): Session | null => {
  if (typeof window === 'undefined') return null;

  const rawSession = localStorage.getItem(SESSION_CACHE_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as Session;
  } catch {
    localStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
};

const writeCachedSession = (session: Session | null) => {
  if (typeof window === 'undefined') return;

  if (session) {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_CACHE_KEY);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cachedSession = readCachedSession();

    if (cachedSession) {
      setSession(cachedSession);
      setUser(cachedSession.user);
    }

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      writeCachedSession(nextSession);
      setLoading(false);
    };

    // Set up auth state listener FIRST and keep localStorage in sync.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        applySession(nextSession);
      }
    );

    // THEN check for existing session from Supabase and recover from cache if needed.
    const initSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          applySession(existingSession);
          return;
        }

        if (cachedSession?.access_token && cachedSession.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: cachedSession.access_token,
            refresh_token: cachedSession.refresh_token,
          });

          if (!error && data.session) {
            applySession(data.session);
            return;
          }
        }

        applySession(null);
      } catch (error) {
        console.error('Error restoring auth session:', error);
        applySession(cachedSession ?? null);
      }
    };

    void initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    writeCachedSession(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
