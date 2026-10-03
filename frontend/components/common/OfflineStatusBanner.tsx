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
    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs sm:text-sm py-2 px-4 shadow-md sticky top-16 z-30 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="shrink-0 animate-pulse" />
          <span>
            <strong>Mode Offline Aktif:</strong> Anda sedang tanpa koneksi internet. Alat peramban (Gabungkan & Pisahkan PDF) tetap dapat digunakan secara instan.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPro ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
              <ShieldCheck size={13} />
              <span>Pro Offline Shield Aktif</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => openPaywall('offline_unlimited')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-orange-700 font-extrabold text-[11px] hover:bg-orange-50 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Zap size={12} className="fill-current text-amber-500" />
              <span>Upgrade Pro (Offline Tanpa Batas)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
