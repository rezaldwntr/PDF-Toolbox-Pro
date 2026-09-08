import React from 'react';
import { X, Zap, FileWarning, Lock } from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { PaywallVariant, UserTier } from '../../types';

const FLASH_PLAN: UserTier = 'flash';
const MONTHLY_PLAN: UserTier = 'monthly';

const variantConfig = {
  quota_exhausted: {
    icon: <Zap className="w-7 h-7" />,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    title: 'Kuota Harian Habis',
    subtitle: (tier: string, maxQ: number | null) =>
      tier === 'guest'
        ? `Pengguna tamu dibatasi ${maxQ ?? 3} konversi per hari. Masuk gratis untuk mendapat 10 konversi/hari.`
        : `Anda telah menggunakan ${maxQ ?? 10} konversi hari ini. Upgrade untuk konversi tanpa batas.`,
  },
  file_too_large: {
    icon: <FileWarning className="w-7 h-7" />,
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    title: 'Berkas Terlalu Besar',
    subtitle: (tier: string, maxQ: number | null, maxMB?: number) =>
      `Batas ukuran berkas untuk tier ${tier === 'guest' ? 'Tamu' : 'Anda'} adalah ${maxMB ?? 20} MB. Upgrade untuk berkas hingga 500 MB.`,
  },
  pro_feature: {
    icon: <Lock className="w-7 h-7" />,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    title: 'Fitur Pro',
    subtitle: () => 'Fitur ini tersedia untuk pengguna berbayar. Upgrade ke Flash Pass atau Monthly Pro untuk akses penuh.',
  },
};

const PaywallModal: React.FC = () => {
  const { showPaywallModal, paywallVariant, closePaywall, openCheckout, setShowPricingModal, maxFileSizeMB, quota, maxQuota } = useQuota();
  const { isGuest, userTier, signInWithGoogle } = useAuth();

  if (!showPaywallModal) return null;

  const cfg = variantConfig[paywallVariant];
  const subtitle = paywallVariant === 'file_too_large'
    ? (cfg.subtitle as any)(userTier, maxQuota, maxFileSizeMB)
    : (cfg.subtitle as any)(userTier, maxQuota);

  const handleGoogleLogin = async () => {
    closePaywall();
    await signInWithGoogle();
  };

  const handleFlashPass = () => {
    closePaywall();
    openCheckout(FLASH_PLAN);
  };

  const handleMonthly = () => {
    closePaywall();
    setShowPricingModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cfg.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {/* CTA Utama: Flash Pass */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 mb-3 text-white">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">⚡ Solusi Tercepat</p>
              <p className="text-lg font-extrabold">24-Hour Flash Pass</p>
              <p className="text-xs text-blue-200">Akses penuh tanpa batas selama 24 jam</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold">Rp5.000</p>
              <p className="text-xs text-blue-200">sekali bayar</p>
            </div>
          </div>
          <button
            onClick={handleFlashPass}
            className="w-full py-2.5 bg-white text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-50 transition-colors active:scale-98"
          >
            Bayar via QRIS / GoPay / OVO →
          </button>
        </div>

        {/* CTA Sekunder: Login Gratis (khusus guest) */}
        {isGuest && paywallVariant === 'quota_exhausted' && (
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[#161A22] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all mb-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Masuk Gratis — Dapat 10 Konversi/Hari
          </button>
        )}

        {/* Link ke pricing full */}
        <button
          onClick={handleMonthly}
          className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1.5 transition-colors font-medium"
        >
          Lihat semua paket & harga →
        </button>
      </div>
    </div>
  );
};

export default PaywallModal;
