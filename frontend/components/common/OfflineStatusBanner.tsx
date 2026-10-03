// frontend/components/common/OfflineStatusBanner.tsx
import React from 'react';
import { WifiOff, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuota } from '../../contexts/QuotaContext';

interface OfflineStatusBannerProps {
  isOnline: boolean;
}

const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ isOnline }) => {
  const { isPro } = useAuth();
  const { openPaywall } = useQuota();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 dark:bg-amber-950/30 border-y border-amber-500/30 text-text-primary text-xs sm:text-sm py-2.5 px-4 shadow-xs sticky top-16 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span className="text-xs sm:text-sm">
            <strong className="text-amber-700 dark:text-amber-300">Mode Luring Aktif:</strong> Perkakas Grup A (Tanda Tangan, Anotasi, Atur Halaman) tetap berfungsi 100% tanpa internet.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPro ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <ShieldCheck size={13} />
              <span>Pro Offline Shield Aktif</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => openPaywall('offline_unlimited')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-primary text-white font-extrabold text-[11px] hover:bg-accent-hover active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Zap size={12} className="fill-current text-white" />
              <span>Upgrade Pro (Offline Tanpa Batas)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
