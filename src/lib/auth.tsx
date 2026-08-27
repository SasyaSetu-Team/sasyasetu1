import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AppRole = 'Farmer' | 'Buyer' | 'FPO' | 'Storage Provider' | 'Transport Provider';

export interface Profile {
  id: string;
  display_name: string;
  language: string;
  buyer_category: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithRole: (role: AppRole, email: string, password: string, buyerCategory?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateLanguage: (language: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const demoEmails: Record<AppRole, string> = {
  Farmer: 'demo.farmer@sasyasetu.demo',
  Buyer: 'demo.buyer@sasyasetu.demo',
  FPO: 'demo.fpo@sasyasetu.demo',
  'Storage Provider': 'demo.storage@sasyasetu.demo',
  'Transport Provider': 'demo.transport@sasyasetu.demo',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const signingInRef = useRef(false);

  const loadUserData = async (userId: string): Promise<AppRole | null> => {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    ]);
    setProfile(profileData as Profile | null);
    const assignedRole = (roleData?.role as AppRole | null) ?? null;
    setRole(assignedRole);
    return assignedRole;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        if (!session) {
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }
        if (signingInRef.current) {
          setLoading(false);
          return;
        }
        await loadUserData(session.user.id);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithRole = async (selectedRole: AppRole, email: string, password: string, buyerCategory?: string) => {
    setAuthError(null);
    setSigningIn(true);
    signingInRef.current = true;
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { error: rpcError } = await supabase.rpc('claim_demo_role', { p_role: selectedRole });
      if (rpcError) throw rpcError;

      if (buyerCategory) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          const { error: profileError } = await supabase.from('profiles').update({ buyer_category: buyerCategory }).eq('id', currentSession.user.id);
          if (profileError) throw profileError;
        }
      }

      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (!finalSession) throw new Error('Your sign-in session could not be created.');
      const assignedRole = await loadUserData(finalSession.user.id);
      if (assignedRole !== selectedRole) {
        throw new Error(`This account is assigned to ${assignedRole ?? 'another role'}, not ${selectedRole}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';
      setAuthError(message);
      await supabase.auth.signOut();
      throw new Error(message);
    } finally {
      setSigningIn(false);
      signingInRef.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setAuthError(null);
  };

  const updateLanguage = async (language: string) => {
    if (!session) return;
    const { error } = await supabase.from('profiles').update({ language }).eq('id', session.user.id);
    if (!error && profile) {
      setProfile({ ...profile, language });
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ session, profile, role, loading, signingIn, authError, signInWithRole, signOut, updateLanguage, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
