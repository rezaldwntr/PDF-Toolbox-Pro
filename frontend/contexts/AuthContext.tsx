import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, UserTier } from '../types';

// --- Tier Configs ---
export const TIER_CONFIGS = {
  guest:   { dailyQuota: 3,    maxFileSizeMB: 20,  maxBatchFiles: 3,   hasAds: true,  hasWatermark: true,  label: 'Tamu',            price: 'Gratis', priceNote: '' },
  free:    { dailyQuota: 10,   maxFileSizeMB: 50,  maxBatchFiles: 3,   hasAds: true,  hasWatermark: true,  label: 'Gratis (Login)',  price: 'Gratis', priceNote: '' },
  flash:   { dailyQuota: null, maxFileSizeMB: 100, maxBatchFiles: 20,  hasAds: false, hasWatermark: false, label: '24-Hour Pass',    price: 'Rp5.000', priceNote: 'sekali bayar' },
  monthly: { dailyQuota: null, maxFileSizeMB: 250, maxBatchFiles: 50,  hasAds: false, hasWatermark: false, label: 'Monthly Pro',     price: 'Rp29.000', priceNote: '/bulan' },
  annual:  { dailyQuota: null, maxFileSizeMB: 500, maxBatchFiles: 100, hasAds: false, hasWatermark: false, label: 'Annual Pass',     price: 'Rp149.000', priceNote: '/tahun' },
} as const;

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  isFree: boolean;
  isPro: boolean;         // flash | monthly | annual
  userTier: UserTier;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapSupabaseUser = async (supabaseUserId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', supabaseUserId)
      .single();
    if (error || !data) return null;

    // Pastikan subscription flash pass belum kadaluarsa
    let effectiveTier: Exclude<UserTier, 'guest'> = data.tier || 'free';
    if (effectiveTier === 'flash' && data.subscription_expiry) {
      const expiry = new Date(data.subscription_expiry);
      if (expiry < new Date()) {
        effectiveTier = 'free';
        // Update tier di DB
        await supabase
          .from('user_profiles')
          .update({ tier: 'free' })
          .eq('id', supabaseUserId);
      }
    }

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      tier: effectiveTier,
      quotaUsedToday: data.quota_used_today || 0,
      quotaResetDate: data.quota_reset_date || new Date().toISOString().split('T')[0],
      subscriptionExpiry: data.subscription_expiry,
    };
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await mapSupabaseUser(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Cek session aktif saat pertama kali mount
    const initAuth = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();

    // Subscribe ke perubahan auth state (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await mapSupabaseUser(session.user.id);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Refresh profile setelah token refresh (misal: setelah pembayaran webhook update tier)
        const profile = await mapSupabaseUser(session.user.id);
        setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error('Error saat login Google:', error);
        alert(`Gagal login Google: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Exception saat login Google:', err);
      alert(`Terjadi kesalahan saat autentikasi: ${err.message || err}`);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const userTier: UserTier = user ? user.tier : 'guest';
  const isGuest = !user;
  const isFree = user?.tier === 'free';
  const isPro = !!user && ['flash', 'monthly', 'annual'].includes(user.tier);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isGuest,
      isFree,
      isPro,
      userTier,
      signInWithGoogle,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};