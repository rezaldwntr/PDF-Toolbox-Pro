import React from 'react';
import { Sparkles, Zap, Crown, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserProfile, UserTier } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatDateTimeIndonesia } from '../../lib/formatters';

interface UpgradeCelebrationModalProps {
  user: UserProfile;
  onClose: () => void;
}

const TIER_DETAILS: Record<string, {
  name: string;
  badge: string;
  bgGrad: string;
  icon: React.ReactNode;
  features: string[];
}> = {
  flash: {
    name: '24-Hour Flash Pass',
    badge: '⚡ Flash Pass Aktif',
    bgGrad: 'from-amber-500/20 via-orange-500/10 to-transparent',
    icon: <Zap className="w-10 h-10 text-amber-500" />,
    features: [
      'Alat manipulasi PDF standar tanpa batas (24 Jam)',
      'Batas ukuran berkas longgar hingga 100 MB',
      'Batch processing hingga 10 file sekaligus',
      '100% Bebas Iklan & Tanpa Watermark',
    ],
  },
  monthly: {
    name: 'Monthly Pro Pass',
    badge: '🚀 Monthly Pro Aktif',
    bgGrad: 'from-blue-600/20 via-indigo-600/10 to-transparent',
    icon: <Crown className="w-10 h-10 text-blue-500" />,
    features: [
      'Semua alat standar & berat tanpa batas harian',
      'Kapasitas berkas ekstra besar hingga 200 MB',
      'Batch pemrosesan massal hingga 30 berkas',
      'Jalur prioritas server kecepatan tinggi',
      'Bebas iklan & penyimpanan unduh aman',
    ],
  },
  annual: {
    name: 'Annual VIP Pass',
    badge: '👑 Annual VIP Aktif',
    bgGrad: 'from-purple-600/20 via-pink-600/10 to-transparent',
    icon: <Sparkles className="w-10 h-10 text-purple-500" />,
    features: [
      'Akses VIP menyeluruh sepanjang tahun penuh',
      'Kapasitas komputasi puncak hingga 300 MB',
      'Batch simultan hingga 50 berkas',
      'Dukungan prioritas utama & fitur perdana',
      '100% Bebas batas & Privasi terenkripsi',
    ],
  },
};

export const UpgradeCelebrationModal: React.FC<UpgradeCelebrationModalProps> = ({ user, onClose }) => {
  const tierKey = user.tier as string;
  const details = TIER_DETAILS[tierKey] || TIER_DETAILS.monthly;

  const formatExpiry = (isoString?: string | null) => {
    if (!isoString) return 'Sesuai masa aktif paket';
    return formatDateTimeIndonesia(isoString) + ' WIB';
  };

  const handleAcknowledge = async () => {
    try {
      localStorage.setItem(`seen_tier_upgrade_${user.id}`, user.tier);
      if (supabase) {
        await supabase
          .from('user_profiles')
          .update({ last_notified_tier: user.tier })
          .eq('id', user.id);
      }
    } catch (e) {
      console.warn('Gagal menyimpan status notifikasi tier:', e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden text-center">
        {/* Glow Ambient Effect */}
        <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br ${details.bgGrad} blur-3xl pointer-events-none`} />
        <div className={`absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-tl ${details.bgGrad} blur-3xl pointer-events-none`} />

        {/* Floating Celebration Header */}
        <div className="relative mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xl shadow-blue-500/10 mx-auto mb-4 animate-bounce">
            {details.icon}
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 mb-2">
            🎉 Selamat! Akun Anda Telah Di-upgrade
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {details.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2">
            Halo <strong>{user.fullName || user.email}</strong>, paket langganan Anda kini telah aktif. Semua limit harian telah dicabut!
          </p>
        </div>

        {/* Benefit Checklist */}
        <div className="relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 text-left mb-6 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Fasilitas Aktif Akun Anda:
          </div>
          {details.features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
          {user.subscriptionExpiry && (
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Masa Aktif:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatExpiry(user.subscriptionExpiry)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="relative">
          <button
            onClick={handleAcknowledge}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>Mulai Gunakan Fitur Pro</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeCelebrationModal;
