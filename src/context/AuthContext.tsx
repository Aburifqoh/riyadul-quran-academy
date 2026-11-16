'use client';
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserData } from '@/lib/auth';

interface AuthContextType {
  user: any | null;
  userData: any | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true, refreshUserData: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  // Re-fetch the signed-in user's profile row. Used after a student picks a
  // schedule, a teacher edits availability, etc., so the UI shows fresh data
  // without a full reload.
  const refreshUserData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUserData(null);
      return;
    }
    const data = await getUserData(session.user.id);
    setUserData(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const data = await getUserData(session.user.id);
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const data = await getUserData(session.user.id);
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cross-Tab Inactivity Timeout (Role-Based)
  useEffect(() => {
    if (!user || !userData) return;

    const isAdmin = userData.role === 'admin' || userData.role === 'super_admin';
    const INACTIVITY_LIMIT = isAdmin ? 5 * 60 * 1000 : 15 * 60 * 1000;

    const handleActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem('lastActivity', now.toString());
      } catch (e) {}
    };

    // Initialize activity on mount
    handleActivity();

    const interval = setInterval(() => {
      let lastAct = lastActivityRef.current;
      try {
        const stored = localStorage.getItem('lastActivity');
        if (stored) {
           lastAct = Math.max(lastAct, parseInt(stored, 10));
        }
      } catch (e) {}

      if (Date.now() - lastAct > INACTIVITY_LIMIT) {
        supabase.auth.signOut().then(() => {
           let redirectPath = '/login';
           if (userData.role === 'admin' || userData.role === 'super_admin') redirectPath = '/admin-login';
           else if (userData.role === 'teacher') redirectPath = '/teacher-login';
           window.location.href = `${redirectPath}?expired=true`;
        });
      }
    }, 60000); // Check every minute

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, userData]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
