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
    <div className="google-anno-skip fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-surface rounded-3xl max-w-4xl w-full shadow-paper-float border border-border-subtle relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 text-center border-b border-border-subtle/80 relative">
          <button
            type="button"
            onClick={() => setShowPricingModal(false)}
            aria-label="Tutup Modal"
            className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated transition-all duration-200 active:scale-[0.95] cursor-pointer"
          >
            <X size={20} />
          </button>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary mb-1">Pilih Paket yang Tepat</h2>
          <p className="text-sm text-text-secondary font-sans">Mulai gratis, bayar hanya saat butuh. Tidak ada biaya tersembunyi.</p>
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
                className={`relative rounded-2xl p-5 flex flex-col justify-between border transition-all duration-200 ${
                  plan.highlight && !isLower
                    ? 'bg-gradient-to-b from-[#9B4819] via-[#853C12] to-[#6E2F0B] text-white border-transparent shadow-paper-float'
                    : 'bg-surface border-border-subtle hover:border-border-strong hover:shadow-paper'
                } ${isActive ? 'ring-2 ring-[#314028] dark:ring-[#34D399]' : ''} ${isLower ? 'opacity-80' : ''}`}
              >
                {plan.badge && !isLower && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold px-3 py-1 rounded-full shadow-xs tracking-wider uppercase ${
                    plan.highlight
                      ? 'bg-[#F4F1E8] text-[#9B4819] dark:bg-[#222222] dark:text-[#E06D3B] border border-[#D8C6B7]/40'
                      : 'bg-[#9B4819]/15 text-[#9B4819] dark:bg-[#9B4819]/30 dark:text-[#E06D3B] border border-[#9B4819]/30'
                  }`}>
                    {plan.badge}
                  </div>
                )}
                {isActive && (
                  <div className="absolute -top-3 right-3 bg-[#314028] text-white dark:bg-[#34D399] dark:text-[#181818] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    Aktif
                  </div>
                )}
                {isLower && (
                  <div className="absolute -top-3 right-3 bg-elevated text-text-secondary text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-border-subtle">
                    Sudah Termasuk
                  </div>
                )}

                <div>
                  <div className="mb-1">{renderModalIcon(plan.iconName)}</div>
                  <h3 className={`font-serif font-bold text-base mb-1 ${plan.highlight && !isLower ? 'text-white' : 'text-text-primary'}`}>{plan.name}</h3>
                  
                  {/* Dynamic Promo Pricing */}
                  <div className="mb-0.5">
                    {eff.isPromo ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`line-through text-xs font-semibold ${plan.highlight && !isLower ? 'text-amber-200/80' : 'text-text-muted'}`}>
                            {formatRupiah(eff.originalPrice)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
                            Promo -{eff.discountPercent}%
                          </span>
                        </div>
                        <p className={`font-serif text-3xl font-bold tracking-tight ${plan.highlight && !isLower ? 'text-white' : 'text-text-primary'}`}>
                          {formatRupiah(eff.price)}
                        </p>
                      </div>
                    ) : (
                      <p className={`font-serif text-3xl font-bold tracking-tight ${plan.highlight && !isLower ? 'text-white' : 'text-text-primary'}`}>
                        {plan.price}
                      </p>
                    )}
                  </div>

                  <p className={`text-xs mb-4 ${plan.highlight && !isLower ? 'text-white/85' : 'text-text-secondary'}`}>{plan.priceNote}</p>
                  {eff.isPromo && eff.bannerText && (
                    <div className="mb-3 px-2 py-1 rounded-lg bg-amber-400/20 text-amber-200 text-[10px] font-bold text-center">
                      {eff.bannerText}
                    </div>
                  )}

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-xs ${plan.highlight && !isLower ? 'text-white/95' : 'text-text-secondary'}`}>
                        <Check size={14} className={`mt-0.5 shrink-0 ${plan.highlight && !isLower ? 'text-amber-200' : 'text-[#314028] dark:text-[#34D399]'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleCTA(plan.id)}
                  disabled={isLower || (isActive && plan.id !== 'free') || (isActive && plan.id === 'free' && !isGuest)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                    isLower
                      ? 'bg-elevated text-text-muted border border-border-subtle cursor-not-allowed'
                      : isActive && plan.id !== 'free'
                      ? 'bg-[#314028]/15 text-[#314028] dark:text-[#34D399] border border-[#314028]/30 cursor-default'
                      : isActive && plan.id === 'free' && !isGuest
                      ? 'bg-elevated text-text-secondary border border-border-subtle cursor-default'
                      : plan.highlight
                      ? 'bg-white text-[#9B4819] hover:bg-[#F4F1E8] shadow-sm'
                      : plan.id === 'free'
                      ? 'bg-elevated hover:bg-border-subtle text-text-primary border border-border-subtle'
                      : 'bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper'
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
        <div className="px-6 pb-6 text-center space-y-2 border-t border-border-subtle/40 pt-4">
          <p className="text-xs text-text-muted">
            Semua pembayaran aman via QRIS / GoPay / OVO / Dana · Data berkas dihapus otomatis · Tidak ada auto-renew tanpa konfirmasi
          </p>
          <p className="text-[11px] text-text-muted">
            Dengan melakukan pembelian, Anda menyetujui{' '}
            {onSelectView ? (
              <button
                type="button"
                onClick={() => {
                  setShowPricingModal(false);
                  onSelectView(View.TERMS);
                }}
                className="text-[#9B4819] dark:text-[#E06D3B] underline hover:opacity-85 font-medium cursor-pointer"
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
                className="text-[#9B4819] dark:text-[#E06D3B] underline hover:opacity-85 font-medium cursor-pointer"
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
