import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GOOGLE_CLIENT_ID } from '../config';
import type { UserProfile, UserTier } from '../types';

declare global {
  interface Window {
    google?: any;
  }
}

// --- Tier Configs ---
// Sesuai Matriks Kapasitas Komputasi (Alat Standar s.d. 300 MB & Alat Berat s.d. 50 MB) & Retensi Tautan Unduh
export const TIER_CONFIGS = {
  guest:   { dailyQuota: 3,    maxFileSizeMB: 30,  maxFileSizeHeavyMB: 10, maxBatchFiles: 1,  downloadRetentionHours: 0,  retentionLabel: 'Langsung dihapus (0 jam)', hasAds: true,  hasWatermark: true,  label: 'Tamu',            price: 'Gratis', priceNote: '' },
  free:    { dailyQuota: 10,   maxFileSizeMB: 30,  maxFileSizeHeavyMB: 10, maxBatchFiles: 1,  downloadRetentionHours: 0,  retentionLabel: 'Langsung dihapus (0 jam)', hasAds: true,  hasWatermark: true,  label: 'Gratis (Login)',  price: 'Gratis', priceNote: '' },
  flash:   { dailyQuota: null, maxFileSizeMB: 100, maxFileSizeHeavyMB: 35, maxBatchFiles: 10, downloadRetentionHours: 6,  retentionLabel: 'Aktif 6 Jam',              hasAds: false, hasWatermark: false, label: '24-Hour Pass',    price: 'Rp5.000', priceNote: 'sekali bayar' },
  monthly: { dailyQuota: null, maxFileSizeMB: 200, maxFileSizeHeavyMB: 50, maxBatchFiles: 30, downloadRetentionHours: 24, retentionLabel: 'Aktif 24 Jam',             hasAds: false, hasWatermark: false, label: 'Monthly Pro',     price: 'Rp29.000', priceNote: '/bulan' },
  annual:  { dailyQuota: null, maxFileSizeMB: 300, maxFileSizeHeavyMB: 50, maxBatchFiles: 50, downloadRetentionHours: 48, retentionLabel: 'Aktif 48 Jam',             hasAds: false, hasWatermark: false, label: 'Annual Pass',     price: 'Rp149.000', priceNote: '/tahun' },
} as const;

// Tingkatan level tier untuk proteksi hierarki & pencegahan downgrade tidak disengaja
export const TIER_RANK: Record<UserTier, number> = {
  guest: 0,
  free: 1,
  flash: 2,
  monthly: 3,
  annual: 4,
};


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

const mapSupabaseUser = async (authUser: any): Promise<UserProfile> => {
  const defaultProfile: UserProfile = {
    id: authUser.id,
    email: authUser.email || '',
    fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
    tier: 'free',
    quotaUsedToday: 0,
    quotaResetDate: new Date().toISOString().split('T')[0],
    subscriptionExpiry: null,
    acceptsMarketingEmails: true,
    lastNotifiedTier: 'free',
  };

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !data) {
      // Jika profil belum ada di DB, coba buat record otomatis
      try {
        await supabase.from('user_profiles').upsert({
          id: authUser.id,
          email: defaultProfile.email,
          full_name: defaultProfile.fullName,
          avatar_url: defaultProfile.avatarUrl,
          accepts_marketing_emails: true,
          last_notified_tier: 'free',
        });
      } catch {
        // Table mungkin belum dibuat, tetap gunakan defaultProfile agar user tetap berhasil masuk
      }
      return defaultProfile;
    }

    // Pastikan masa aktif subscription berbayar (flash, monthly, annual) belum kedaluwarsa
    let effectiveTier: Exclude<UserTier, 'guest'> = data.tier || 'free';
    if (['flash', 'monthly', 'annual'].includes(effectiveTier) && data.subscription_expiry) {
      const expiry = new Date(data.subscription_expiry);
      if (expiry < new Date()) {
        effectiveTier = 'free';
        await supabase
          .from('user_profiles')
          .update({ tier: 'free' })
          .eq('id', authUser.id);
      }
    }

    return {
      id: data.id,
      email: data.email || defaultProfile.email,
      fullName: data.full_name || defaultProfile.fullName,
      avatarUrl: data.avatar_url || defaultProfile.avatarUrl,
      tier: effectiveTier,
      quotaUsedToday: data.quota_used_today || 0,
      quotaResetDate: data.quota_reset_date || defaultProfile.quotaResetDate,
      subscriptionExpiry: data.subscription_expiry,
      acceptsMarketingEmails: data.accepts_marketing_emails ?? true,
      lastNotifiedTier: data.last_notified_tier || 'free',
    };
  } catch {
    return defaultProfile;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dismissGoogleOneTap = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.google?.accounts?.id?.cancel?.();
      } catch {
        // Abaikan jika script GIS belum siap
      }
      const pickerContainer = document.getElementById('credential_picker_container');
      if (pickerContainer) {
        pickerContainer.remove();
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        dismissGoogleOneTap();
        const profile = await mapSupabaseUser(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [dismissGoogleOneTap]);

  useEffect(() => {
    // Cek session aktif saat pertama kali mount
    const initAuth = async () => {
      setIsLoading(true);
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();

    // Subscribe ke perubahan auth state (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
        dismissGoogleOneTap();
        const profile = await mapSupabaseUser(session.user);
        setUser(profile);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser, dismissGoogleOneTap]);

  // Inisialisasi Google Identity Services (GIS) khusus untuk pengguna tamu (belum login)
  useEffect(() => {
    // Jika masih mengecek session awal atau user sudah login, batalkan dan jangan tampilkan One Tap
    if (isLoading || user) {
      dismissGoogleOneTap();
      return;
    }

    let isCancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const initGoogleGsi = async () => {
      if (isCancelled) return;

      // Jangan tampilkan One Tap jika sedang memproses callback OAuth di URL
      if (
        typeof window !== 'undefined' &&
        (window.location.hash.includes('access_token=') || window.location.search.includes('code='))
      ) {
        return;
      }

      // Pastikan sekali lagi ke Supabase bahwa tidak ada sesi aktif sebelum memunculkan popup
      const { data: { session } } = await supabase.auth.getSession();
      if (isCancelled || session?.user) {
        dismissGoogleOneTap();
        return;
      }

      if (typeof window !== 'undefined' && window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                setIsLoading(true);
                try {
                  const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: response.credential,
                  });
                  if (error) {
                    console.error('[GIS] signInWithIdToken gagal:', error);
                    // Fallback otomatis ke signInWithOAuth jika id_token ditolak
                    await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: window.location.origin },
                    });
                  } else if (data?.user) {
                    dismissGoogleOneTap();
                    const profile = await mapSupabaseUser(data.user);
                    setUser(profile);
                  }
                } catch (err: any) {
                  console.error('[GIS] Exception saat verifikasi token:', err);
                } finally {
                  setIsLoading(false);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (!isCancelled) {
            // Tampilkan Google One Tap di pdftoolbox.app hanya jika benar-benar pengguna tamu
            window.google.accounts.id.prompt();
          }
        } catch (e) {
          console.warn('[GIS] Inisialisasi gagal:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      intervalId = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (intervalId) clearInterval(intervalId);
          intervalId = null;
          initGoogleGsi();
        }
      }, 500);
    }

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
      dismissGoogleOneTap();
    };
  }, [user, isLoading, dismissGoogleOneTap]);

  const signInWithGoogle = useCallback(async () => {
    // 1. Coba tampilkan prompt Google Identity Services (One Tap/Account Picker langsung di domain pdftoolbox.app)
    if (typeof window !== 'undefined' && window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
      let promptDisplayed = false;
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isDisplayed()) {
          promptDisplayed = true;
        } else if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Jika One Tap tidak dapat ditampilkan (misal user pernah close atau cooldown),
          // fallback langsung ke alur OAuth
          if (!promptDisplayed) {
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.origin,
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                },
              },
            });
          }
        }
      });
      return;
    }

    // 2. Fallback standar jika script GIS belum siap atau diblokir
    try {
      const { error } = await supabase.auth.signInWithOAuth({
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