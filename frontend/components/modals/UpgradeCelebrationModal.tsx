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
    bgGrad: 'from-[#9B4819]/25 via-amber-600/10 to-transparent',
    icon: <Crown className="w-10 h-10 text-[#9B4819] dark:text-[#E06D3B]" />,
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
    bgGrad: 'from-[#9B4819]/30 via-orange-500/15 to-transparent',
    icon: <Sparkles className="w-10 h-10 text-[#9B4819] dark:text-[#E06D3B]" />,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-paper-float border border-border-subtle relative overflow-hidden text-center">
        {/* Glow Ambient Effect */}
        <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br ${details.bgGrad} blur-3xl pointer-events-none`} />
        <div className={`absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-tl ${details.bgGrad} blur-3xl pointer-events-none`} />

        {/* Floating Celebration Header */}
        <div className="relative mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-canvas border border-border-subtle shadow-paper mx-auto mb-4 animate-bounce">
            {details.icon}
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25 mb-2">
            🎉 Selamat! Akun Anda Telah Di-upgrade
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {details.name}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2 font-sans">
            Halo <strong>{user.fullName || user.email}</strong>, paket langganan Anda kini telah aktif. Semua limit harian telah dicabut!
          </p>
        </div>

        {/* Benefit Checklist */}
        <div className="relative bg-canvas rounded-2xl p-4 sm:p-5 border border-border-subtle text-left mb-6 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            Fasilitas Aktif Akun Anda:
          </div>
          {details.features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-text-secondary">
              <CheckCircle2 className="w-4 h-4 text-[#314028] dark:text-[#34D399] shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
          {user.subscriptionExpiry && (
            <div className="pt-2 mt-2 border-t border-border-subtle/80 text-[11px] text-text-muted flex items-center justify-between">
              <span>Masa Aktif:</span>
              <span className="font-semibold text-text-primary">{formatExpiry(user.subscriptionExpiry)}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="relative">
          <button
            onClick={handleAcknowledge}
            className="w-full py-3.5 px-6 rounded-xl bg-[#9B4819] hover:bg-[#7E3812] text-white font-bold text-sm shadow-paper flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
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
