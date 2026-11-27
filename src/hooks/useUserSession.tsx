'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserProfileAction } from '@/lib/portfolio-actions';
import type { UserProfileData } from '@/types/profile';

interface UserSessionContextValue {
  user: User | null;
  profile: UserProfileData | null;
  isAuthenticated: boolean;
  authResolved: boolean;
  isPro: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSessionAndProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setAuthResolved(true);
      }

      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser();

      if (!verifiedUser) {
        setUser(null);
        setProfile(null);
        setAuthResolved(true);
        return;
      }

      setUser(verifiedUser);
      setAuthResolved(true);

      const res = await getUserProfileAction();
      if (res && res.success && res.data) {
        setProfile(res.data as UserProfileData);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setAuthResolved(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setAuthResolved(true);
        setLoading(false);
        return;
      }
      setUser(session.user);
      setAuthResolved(true);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        void loadSessionAndProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSessionAndProfile]);

  return (
    <UserSessionContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: Boolean(user),
        authResolved,
        isPro: profile?.subscription_tier === 'premium',
        loading,
        refreshSession: loadSessionAndProfile,
      }}
    >
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession(): UserSessionContextValue {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    return {
      user: null,
      profile: null,
      isAuthenticated: false,
      authResolved: false,
      isPro: false,
      loading: false,
      refreshSession: async () => {},
    };
  }
  return ctx;
}
