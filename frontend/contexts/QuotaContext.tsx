import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { EnvironmentMode, UserTier, PaywallVariant } from '../types';
import { useAuth, TIER_CONFIGS } from './AuthContext';
import { supabase } from '../lib/supabase';

interface QuotaContextType {
  quota: number | null;                    // null = unlimited (pro tier)
  maxQuota: number | null;                 // null = unlimited
  quotaUsed: number;
  consumeQuota: () => boolean;
  // Paywall
  showPaywallModal: boolean;
  paywallVariant: PaywallVariant;
  openPaywall: (variant: PaywallVariant) => void;
  closePaywall: () => void;
  // Pricing modal
  showPricingModal: boolean;
  setShowPricingModal: (show: boolean) => void;
  // Checkout modal
  showCheckoutModal: boolean;
  checkoutPlan: UserTier | null;
  openCheckout: (plan: UserTier) => void;
  closeCheckout: () => void;
  // File size guard
  checkFileSizeLimit: (bytes: number) => boolean;
  maxFileSizeMB: number;
  // Environment (legacy — tetap ada untuk backward compat)
  mode: EnvironmentMode;
  isPreview: boolean;
  branchName: string;
  setMode: (mode: EnvironmentMode) => void;
  toggleMode: () => void;
  resetGuestQuota: () => void;
  // Legacy alias
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
}

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

const GUEST_MAX_QUOTA = 3;
const STORAGE_KEY = 'pdf_toolbox_guest_quota';
const STORAGE_DATE_KEY = 'pdf_toolbox_quota_date';
const STORAGE_ENV_KEY = 'pdf_toolbox_env_mode';

export const isProductionDomain = (hostname: string): boolean => {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h === 'pdftoolbox.app' ||
    h.endsWith('.pdftoolbox.app') ||
    h === 'pdf-toolbox-pro.vercel.app' ||
    (typeof __VERCEL_ENV__ !== 'undefined' && __VERCEL_ENV__ === 'production' && !h.includes('-git-') && !h.includes('preview'))
  );
};

const detectInitialEnvironment = (): { mode: EnvironmentMode; branch: string } => {
  let detectedMode: EnvironmentMode = 'production';
  let branch = '';
  try {
    if (typeof __GIT_BRANCH__ !== 'undefined' && __GIT_BRANCH__) branch = __GIT_BRANCH__;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // JIKA DI DOMAIN PRODUKSI (pdftoolbox.app, dll.), KUNCI MUTLAK KE PRODUCTION!
      if (isProductionDomain(hostname)) {
        try { localStorage.removeItem(STORAGE_ENV_KEY); } catch (e) { /* ignore */ }
        return { mode: 'production', branch: '' };
      }

      // Khusus lingkungan non-produksi (localhost / Vercel preview URLs):
      const searchParams = new URLSearchParams(window.location.search);
      const urlEnv = searchParams.get('env') || searchParams.get('mode');
      const urlPreview = searchParams.get('preview');
      if (urlEnv === 'preview' || urlPreview === 'true' || urlPreview === '1') {
        try { localStorage.setItem(STORAGE_ENV_KEY, 'preview'); } catch (e) {}
        return { mode: 'preview', branch };
      }
      if (urlEnv === 'production' || urlPreview === 'false' || urlPreview === '0') {
        try { localStorage.setItem(STORAGE_ENV_KEY, 'production'); } catch (e) {}
        return { mode: 'production', branch };
      }
      const savedEnv = localStorage.getItem(STORAGE_ENV_KEY);
      if (savedEnv === 'preview' || savedEnv === 'production') return { mode: savedEnv, branch };
      if (typeof __VERCEL_ENV__ !== 'undefined') {
        if (__VERCEL_ENV__ === 'preview' || __VERCEL_ENV__ === 'development') return { mode: 'preview', branch };
        if (__VERCEL_ENV__ === 'production') return { mode: 'production', branch };
      }

      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const isVercelPreview = hostname.includes('-git-') || (hostname.includes('.vercel.app') && !hostname.startsWith('pdf-toolbox-pro.vercel.app'));
      if (isLocal || isVercelPreview) detectedMode = 'preview';
    }
  } catch (err) {
    console.warn('Error detecting environment:', err);
  }
  return { mode: detectedMode, branch };
};

export const QuotaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userTier, isGuest } = useAuth();
  const initial = useMemo(() => detectInitialEnvironment(), []);
  const [mode, setModeState] = useState<EnvironmentMode>(initial.mode);
  const [branchName] = useState<string>(initial.branch);
  const [guestQuota, setGuestQuota] = useState<number>(GUEST_MAX_QUOTA);
  const [userQuotaUsed, setUserQuotaUsed] = useState<number>(0);

  // Paywall state
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallVariant, setPaywallVariant] = useState<PaywallVariant>('quota_exhausted');

  // Pricing & Checkout modal state
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<UserTier | null>(null);

  const isPreview = mode === 'preview';

  // Inisialisasi kuota tamu dari localStorage
  useEffect(() => {
    if (!isGuest) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(STORAGE_DATE_KEY);
      const savedQuota = localStorage.getItem(STORAGE_KEY);
      if (savedDate !== today) {
        localStorage.setItem(STORAGE_DATE_KEY, today);
        localStorage.setItem(STORAGE_KEY, GUEST_MAX_QUOTA.toString());
        setGuestQuota(GUEST_MAX_QUOTA);
      } else if (savedQuota !== null) {
        setGuestQuota(parseInt(savedQuota, 10));
      }
    } catch (e) {
      console.warn('localStorage tidak tersedia:', e);
    }
  }, [isGuest]);

  // Sinkronisasi quota dari profil Supabase user
  useEffect(() => {
    if (user) {
      setUserQuotaUsed(user.quotaUsedToday);
    }
  }, [user]);

  const setMode = (newMode: EnvironmentMode) => {
    if (typeof window !== 'undefined' && isProductionDomain(window.location.hostname)) {
      return; // Tidak bisa beralih ke preview di domain produksi
    }
    setModeState(newMode);
    try { localStorage.setItem(STORAGE_ENV_KEY, newMode); } catch (e) { /* ignore */ }
  };
  const toggleMode = () => setMode(mode === 'preview' ? 'production' : 'preview');

  const resetGuestQuota = () => {
    setGuestQuota(GUEST_MAX_QUOTA);
    try {
      localStorage.setItem(STORAGE_KEY, GUEST_MAX_QUOTA.toString());
      localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString().split('T')[0]);
    } catch (e) { /* ignore */ }
  };

  const openPaywall = (variant: PaywallVariant) => {
    setPaywallVariant(variant);
    setShowPaywallModal(true);
  };
  const closePaywall = () => setShowPaywallModal(false);

  const openCheckout = (plan: UserTier) => {
    setCheckoutPlan(plan);
    setShowCheckoutModal(true);
  };
  const closeCheckout = () => {
    setShowCheckoutModal(false);
    setCheckoutPlan(null);
  };

  const tierConfig = TIER_CONFIGS[userTier];
  const maxFileSizeMB = tierConfig.maxFileSizeMB;

  const checkFileSizeLimit = (bytes: number): boolean => {
    const mb = bytes / (1024 * 1024);
    if (mb > maxFileSizeMB) {
      openPaywall('file_too_large');
      return false;
    }
    return true;
  };

  const consumeQuota = (): boolean => {
    // Mode Preview: bebas tanpa batas
    if (isPreview) return true;

    // Tier Pro (flash/monthly/annual): unlimited
    if (userTier === 'flash' || userTier === 'monthly' || userTier === 'annual') return true;

    if (isGuest) {
      if (guestQuota <= 0) {
        openPaywall('quota_exhausted');
        return false;
      }
      const next = Math.max(0, guestQuota - 1);
      setGuestQuota(next);
      try { localStorage.setItem(STORAGE_KEY, next.toString()); } catch (e) { /* ignore */ }
      return true;
    }

    // Free user (login): 10/hari, tracked di Supabase
    const maxQ = TIER_CONFIGS.free.dailyQuota!;
    if (userQuotaUsed >= maxQ) {
      openPaywall('quota_exhausted');
      return false;
    }
    const nextUsed = userQuotaUsed + 1;
    setUserQuotaUsed(nextUsed);
    // Update di Supabase secara asinkron (fire and forget)
    if (user) {
      supabase
        .from('user_profiles')
        .update({ quota_used_today: nextUsed })
        .eq('id', user.id)
        .then(() => {})
        .catch(() => {});
    }
    return true;
  };

  // Hitung nilai quota yang ditampilkan di UI
  let displayQuota: number | null = null;
  let displayMaxQuota: number | null = null;
  if (isPreview) {
    displayQuota = null; // unlimited
    displayMaxQuota = null;
  } else if (isGuest) {
    displayQuota = guestQuota;
    displayMaxQuota = GUEST_MAX_QUOTA;
  } else if (user?.tier === 'free') {
    displayQuota = TIER_CONFIGS.free.dailyQuota! - userQuotaUsed;
    displayMaxQuota = TIER_CONFIGS.free.dailyQuota;
  } else {
    displayQuota = null;  // Pro: unlimited
    displayMaxQuota = null;
  }

  // Legacy aliases for backward-compat with existing tool components
  const showLimitModal = showPaywallModal && paywallVariant === 'quota_exhausted';
  const setShowLimitModal = (show: boolean) => {
    if (show) openPaywall('quota_exhausted');
    else closePaywall();
  };

  return (
    <QuotaContext.Provider value={{
      quota: displayQuota,
      maxQuota: displayMaxQuota,
      quotaUsed: isGuest ? (GUEST_MAX_QUOTA - guestQuota) : userQuotaUsed,
      consumeQuota,
      showPaywallModal,
      paywallVariant,
      openPaywall,
      closePaywall,
      showPricingModal,
      setShowPricingModal,
      showCheckoutModal,
      checkoutPlan,
      openCheckout,
      closeCheckout,
      checkFileSizeLimit,
      maxFileSizeMB,
      mode,
      isPreview,
      branchName,
      setMode,
      toggleMode,
      resetGuestQuota,
      showLimitModal,
      setShowLimitModal,
    }}>
      {children}
    </QuotaContext.Provider>
  );
};

export const useQuota = () => {
  const context = useContext(QuotaContext);
  if (!context) throw new Error('useQuota must be used within a QuotaProvider');
  return context;
};