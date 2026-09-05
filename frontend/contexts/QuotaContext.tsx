import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { EnvironmentMode } from '../types';

interface QuotaContextType {
  quota: number;
  maxQuota: number;
  guestQuota: number;
  consumeQuota: () => boolean;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
  // Environment Management (Vercel Preview vs Production)
  mode: EnvironmentMode;
  isPreview: boolean;
  branchName: string;
  setMode: (mode: EnvironmentMode) => void;
  toggleMode: () => void;
  resetGuestQuota: () => void;
}

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

const MAX_GUEST_QUOTA = 3;
const STORAGE_KEY = 'pdf_toolbox_guest_quota';
const STORAGE_DATE_KEY = 'pdf_toolbox_quota_date';
const STORAGE_ENV_KEY = 'pdf_toolbox_env_mode';

/**
 * Mendeteksi environment awal secara berjenjang:
 * 1. Parameter URL (?env=preview, ?mode=preview, ?preview=true)
 * 2. Cache preferensi pengguna di localStorage
 * 3. Injeksi sistem Vercel (__VERCEL_ENV__)
 * 4. Runtime Hostname (localhost, *.vercel.app preview URLs)
 */
const detectInitialEnvironment = (): { mode: EnvironmentMode; branch: string } => {
  let detectedMode: EnvironmentMode = 'production';
  let branch = '';

  try {
    if (typeof __GIT_BRANCH__ !== 'undefined' && __GIT_BRANCH__) {
      branch = __GIT_BRANCH__;
    }

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEnv = searchParams.get('env') || searchParams.get('mode');
      const urlPreview = searchParams.get('preview');

      // 1. Prioritas Utama: Parameter Query URL
      if (urlEnv === 'preview' || urlPreview === 'true' || urlPreview === '1') {
        localStorage.setItem(STORAGE_ENV_KEY, 'preview');
        return { mode: 'preview', branch };
      }
      if (urlEnv === 'production' || urlPreview === 'false' || urlPreview === '0') {
        localStorage.setItem(STORAGE_ENV_KEY, 'production');
        return { mode: 'production', branch };
      }

      // 2. Prioritas Kedua: Preferensi tersimpan di LocalStorage
      const savedEnv = localStorage.getItem(STORAGE_ENV_KEY);
      if (savedEnv === 'preview' || savedEnv === 'production') {
        return { mode: savedEnv, branch };
      }

      // 3. Prioritas Ketiga: Konstanta Vercel Build Environment
      if (typeof __VERCEL_ENV__ !== 'undefined') {
        if (__VERCEL_ENV__ === 'preview' || __VERCEL_ENV__ === 'development') {
          return { mode: 'preview', branch };
        }
        if (__VERCEL_ENV__ === 'production') {
          return { mode: 'production', branch };
        }
      }

      // 4. Prioritas Keempat: Runtime Hostname Vercel / Localhost
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      // URL Vercel preview biasanya mengandung '-git-' atau branch name
      const isVercelPreview = hostname.includes('-git-') || (hostname.includes('.vercel.app') && !hostname.startsWith('pdf-toolbox-pro.vercel.app'));

      if (isLocal || isVercelPreview) {
        detectedMode = 'preview';
      }
    }
  } catch (err) {
    console.warn('Error saat mendeteksi environment:', err);
  }

  return { mode: detectedMode, branch };
};

export const QuotaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = useMemo(() => detectInitialEnvironment(), []);
  const [mode, setModeState] = useState<EnvironmentMode>(initial.mode);
  const [branchName] = useState<string>(initial.branch);
  const [guestQuota, setGuestQuota] = useState<number>(MAX_GUEST_QUOTA);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);

  const isPreview = mode === 'preview';

  // Inisialisasi kuota tamu harian dari localStorage
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem(STORAGE_DATE_KEY);
      const savedQuota = localStorage.getItem(STORAGE_KEY);

      if (savedDate !== today) {
        // Reset kuota otomatis saat pergantian hari kalender
        localStorage.setItem(STORAGE_DATE_KEY, today);
        localStorage.setItem(STORAGE_KEY, MAX_GUEST_QUOTA.toString());
        setGuestQuota(MAX_GUEST_QUOTA);
      } else if (savedQuota !== null) {
        setGuestQuota(parseInt(savedQuota, 10));
      }
    } catch (e) {
      console.warn('LocalStorage tidak dapat diakses untuk pelacakan kuota:', e);
    }
  }, []);

  // Mengubah mode secara eksplisit (tersimpan ke localStorage)
  const setMode = (newMode: EnvironmentMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_ENV_KEY, newMode);
    } catch (e) {
      // ignore
    }
  };

  // Toggle instan antara Mode Preview dan Mode Production
  const toggleMode = () => {
    const next = mode === 'preview' ? 'production' : 'preview';
    setMode(next);
  };

  // Helper untuk reset kuota ke 3/3 saat pengujian mode produksi
  const resetGuestQuota = () => {
    setGuestQuota(MAX_GUEST_QUOTA);
    try {
      localStorage.setItem(STORAGE_KEY, MAX_GUEST_QUOTA.toString());
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(STORAGE_DATE_KEY, today);
    } catch (e) {
      // ignore
    }
  };

  /**
   * Mengonsumsi 1 kuota saat pemrosesan file berhasil.
   * Di MODE PREVIEW: Kuota bebas tanpa batas (selalu return true, tanpa decrement).
   * Di MODE PRODUCTION: Kuota terpotong 1 dan memicu dialog jika habis.
   */
  const consumeQuota = (): boolean => {
    if (isPreview) {
      // Mode Preview: Uji coba bebas tanpa batasan
      return true;
    }

    if (guestQuota <= 0) {
      setShowLimitModal(true);
      return false;
    }

    const nextQuota = Math.max(0, guestQuota - 1);
    setGuestQuota(nextQuota);
    try {
      localStorage.setItem(STORAGE_KEY, nextQuota.toString());
    } catch (e) {
      // ignore
    }
    return true;
  };

  // Nilai kuota efektif: Infinity jika Preview, angka riil jika Production
  const effectiveQuota = isPreview ? Infinity : guestQuota;
  const effectiveMaxQuota = isPreview ? Infinity : MAX_GUEST_QUOTA;

  return (
    <QuotaContext.Provider value={{
      quota: effectiveQuota,
      maxQuota: effectiveMaxQuota,
      guestQuota,
      consumeQuota,
      showLimitModal,
      setShowLimitModal,
      mode,
      isPreview,
      branchName,
      setMode,
      toggleMode,
      resetGuestQuota
    }}>
      {children}
    </QuotaContext.Provider>
  );
};

export const useQuota = () => {
  const context = useContext(QuotaContext);
  if (!context) {
    throw new Error('useQuota must be used within a QuotaProvider');
  }
  return context;
};
