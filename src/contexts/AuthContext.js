import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setPurchases([]); setLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const [profileRes, purchasesRes] = await Promise.all([
      supabase.from('profiles').select('*, subscriptions(status, plan, current_period_end)').eq('id', userId).single(),
      supabase.from('purchases').select('*').eq('user_id', userId).eq('status', 'paid'),
    ]);
    setProfile(profileRes.data ?? null);
    setPurchases(purchasesRes.data ?? []);
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

  function hasActiveSubscription() {
    const sub = profile?.subscriptions?.[0];
    if (!sub) return false;
    if (sub.status !== 'active') return false;
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
    return true;
  }

  function hasPurchasedBook(bookId) {
    const purchase = purchases.find(p => p.book_id === bookId);
    if (!purchase) return false;
    if (new Date(purchase.expires_at) < new Date()) return false;
    return true;
  }

  function canReadBook(book) {
    if (book.is_free) return true;
    if (hasActiveSubscription()) return true;
    if (hasPurchasedBook(book.id)) return true;
    return false;
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    purchases,
    loading,
    signUp,
    signIn,
    signOut,
    hasActiveSubscription,
    hasPurchasedBook,
    canReadBook,
    refreshProfile: () => session?.user && loadProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}