import React, { useState, useEffect } from 'react';
import { X, Check, Zap, Star, Crown } from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth, TIER_RANK } from '../../contexts/AuthContext';
import { View, UserTier, PromoSetting } from '../../types';
import { fetchPromoSettings, calculateEffectivePrice } from '../../lib/promo';

interface PricingModalProps {
  onSelectView?: (view: View) => void;
}

import { PLANS } from '../../lib/plans';
import { formatRupiah } from '../../lib/formatters';

const renderModalIcon = (iconName: string) => {
  switch (iconName) {
    case 'Zap': return <span className="text-2xl mb-2 inline-block">⚡</span>;
    case 'Star': return <span className="text-2xl mb-2 inline-block">🚀</span>;
    case 'Crown': return <span className="text-2xl mb-2 inline-block">👑</span>;
    case 'Gift':
    default:
      return <span className="text-2xl mb-2 inline-block">🎁</span>;
  }
};

const PricingModal: React.FC<PricingModalProps> = ({ onSelectView }) => {
  const { showPricingModal, setShowPricingModal, openCheckout } = useQuota();
  const { user, isGuest, signInWithGoogle, userTier } = useAuth();
  const [promos, setPromos] = useState<PromoSetting[]>([]);
  const currentRank = TIER_RANK[userTier] || 0;

  useEffect(() => {
    if (showPricingModal) {
      fetchPromoSettings().then(setPromos);
    }
  }, [showPricingModal]);

  if (!showPricingModal) return null;

  const handleCTA = async (planId: string) => {
    setShowPricingModal(false);
    if (planId === 'free') {
      if (isGuest) await signInWithGoogle();
    } else {
      openCheckout(planId as any);
    }
  };

  return (
    <div className="google-anno-skip fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1A1E27] rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setShowPricingModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Pilih Paket yang Tepat</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Mulai gratis, bayar hanya saat butuh. Tidak ada biaya tersembunyi.</p>
        </div>

        {/* Plan Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const planRank = TIER_RANK[plan.id as UserTier] || 0;
            const isActive = plan.id === userTier || (plan.id === 'free' && userTier === 'guest');
            // Proteksi: Pengguna berbayar tidak boleh downgrade ke paket di bawahnya
            const isLower = currentRank > planRank && !isGuest && userTier !== 'free';
            const isUpgrade = planRank > currentRank && currentRank > 1;

            const eff = plan.id === 'free'
              ? { price: 0, originalPrice: 0, isPromo: false, discountPercent: 0, bannerText: '' }
              : calculateEffectivePrice(plan.id, user?.email, promos);

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-5 flex flex-col border transition-all ${
                  plan.highlight && !isLower
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-transparent shadow-xl shadow-blue-500/30'
                    : 'bg-white dark:bg-[#1E222B] border-slate-200 dark:border-slate-700'
                } ${isActive ? 'ring-2 ring-emerald-500' : ''} ${isLower ? 'opacity-80' : ''}`}
              >
                {plan.badge && !isLower && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-xs">
                    {plan.badge}
                  </div>
                )}
                {isActive && (
                  <div className="absolute -top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    Aktif
                  </div>
                )}
                {isLower && (
                  <div className="absolute -top-3 right-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Sudah Termasuk
                  </div>
                )}

                {renderModalIcon(plan.iconName)}
                <h3 className={`font-bold text-sm mb-1 ${plan.highlight && !isLower ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h3>
                
                {/* Dynamic Promo Pricing */}
                <div className="mb-0.5">
                  {eff.isPromo ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`line-through text-xs font-semibold ${plan.highlight && !isLower ? 'text-blue-200' : 'text-slate-400'}`}>
                          {formatRupiah(eff.originalPrice)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
                          Promo -{eff.discountPercent}%
                        </span>
                      </div>
                      <p className={`text-2xl font-extrabold ${plan.highlight && !isLower ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {formatRupiah(eff.price)}
                      </p>
                    </div>
                  ) : (
                    <p className={`text-2xl font-extrabold ${plan.highlight && !isLower ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.price}
                    </p>
                  )}
                </div>

                <p className={`text-xs mb-4 ${plan.highlight && !isLower ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>{plan.priceNote}</p>
                {eff.isPromo && eff.bannerText && (
                  <div className="mb-3 px-2 py-1 rounded-lg bg-amber-400/20 text-amber-200 text-[10px] font-bold text-center">
                    {eff.bannerText}
                  </div>
                )}

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${plan.highlight && !isLower ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      <Check size={13} className={`mt-0.5 shrink-0 ${plan.highlight && !isLower ? 'text-blue-300' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan.id)}
                  disabled={isLower || (isActive && plan.id !== 'free') || (isActive && plan.id === 'free' && !isGuest)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-98 ${
                    isLower
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      : isActive && plan.id !== 'free'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default'
                      : isActive && plan.id === 'free' && !isGuest
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-default'
                      : plan.highlight
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isLower
                    ? 'Sudah Termasuk ✓'
                    : isActive && plan.id !== 'free'
                    ? '✓ Paket Aktif'
                    : isActive && plan.id === 'free' && !isGuest
                    ? '✓ Paket Saat Ini'
                    : isUpgrade
                    ? `Upgrade →`
                    : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer comparison note */}
        <div className="px-6 pb-6 text-center space-y-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Semua pembayaran aman via QRIS / GoPay / OVO / Dana · Data berkas dihapus otomatis · Tidak ada auto-renew tanpa konfirmasi
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Dengan melakukan pembelian, Anda menyetujui{' '}
            {onSelectView ? (
              <button
                type="button"
                onClick={() => {
                  setShowPricingModal(false);
                  onSelectView(View.TERMS);
                }}
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium"
              >
                Syarat & Ketentuan
              </button>
            ) : (
              <span className="underline">Syarat & Ketentuan</span>
            )}{' '}
            serta{' '}
            {onSelectView ? (
              <button
                type="button"
                onClick={() => {
                  setShowPricingModal(false);
                  onSelectView(View.PRIVACY);
                }}
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium"
              >
                Kebijakan Privasi
              </button>
            ) : (
              <span className="underline">Kebijakan Privasi</span>
            )}
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
