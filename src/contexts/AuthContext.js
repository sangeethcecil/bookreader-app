import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // includes subscription/entitlement info
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the existing session on app load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    // Pulls subscription/entitlement status from our own table (set up in schema.sql)
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subscriptions(status, plan, current_period_end)')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Could not load profile:', error.message);
    }
    setProfile(data ?? null);
    setLoading(false);
  }

  async function signUp(email, password) {
    return supabase.auth.signUp({ email, password });
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  // True if the user has an active paid subscription right now.
  // This is the single gate the rest of the app should check before showing locked content.
  function hasActiveSubscription() {
    const sub = profile?.subscriptions?.[0];
    if (!sub) return false;
    if (sub.status !== 'active') return false;
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
    return true;
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    hasActiveSubscription,
    refreshProfile: () => session?.user && loadProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
