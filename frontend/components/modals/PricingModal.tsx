import React from 'react';
import { X, Check, Zap, Star, Crown } from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { View } from '../../types';

interface PricingModalProps {
  onSelectView?: (view: View) => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'Gratis',
    price: 'Rp0',
    priceNote: 'Selamanya',
    icon: '🎁',
    highlight: false,
    features: [
      'Tamu: 3 tugas/hari',
      'Login: 10 tugas/hari',
      'Berkas hingga 50 MB',
      'Semua alat dasar',
      'Penyimpanan cloud 1 jam',
    ],
    cta: 'Masuk Gratis',
    ctaVariant: 'secondary' as const,
  },
  {
    id: 'flash',
    name: '24-Hour Flash Pass',
    price: 'Rp5.000',
    priceNote: 'Sekali bayar',
    icon: '⚡',
    highlight: true,
    badge: 'TERPOPULER',
    features: [
      'Unlimited konversi selama 24 jam',
      'Berkas hingga 75 MB',
      'Batch hingga 20 file sekaligus',
      'Bebas iklan selama 24 jam',
      'OCR PDF ✓ Aktif',
    ],
    cta: 'Beli Flash Pass',
    ctaVariant: 'primary' as const,
  },
  {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 'Rp29.000',
    priceNote: 'Per bulan',
    icon: '🚀',
    highlight: false,
    features: [
      'Unlimited konversi setiap hari',
      'Berkas hingga 250 MB (via Cloud Storage)',
      'Batch hingga 50 file sekaligus',
      'Bebas iklan selamanya',
      'OCR PDF ✓ Aktif',
    ],
    cta: 'Berlangganan Bulanan',
    ctaVariant: 'secondary' as const,
  },
  {
    id: 'annual',
    name: 'Annual Pass',
    price: 'Rp149.000',
    priceNote: 'Per tahun · Hemat 57%',
    icon: '👑',
    highlight: false,
    features: [
      'Semua fitur Monthly Pro',
      'Berkas hingga 500 MB (via Cloud Storage)',
      'Batch hingga 100 file sekaligus',
      'Penyimpanan cloud 24 jam',
      'Prioritas support',
    ],
    cta: 'Beli Annual Pass',
    ctaVariant: 'secondary' as const,
  },
];

const PricingModal: React.FC<PricingModalProps> = ({ onSelectView }) => {
  const { showPricingModal, setShowPricingModal, openCheckout } = useQuota();
  const { isGuest, signInWithGoogle, userTier } = useAuth();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
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
            const isActive = plan.id === userTier || (plan.id === 'free' && userTier === 'guest');
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-5 flex flex-col border transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-transparent shadow-xl shadow-blue-500/30'
                    : 'bg-white dark:bg-[#1E222B] border-slate-200 dark:border-slate-700'
                } ${isActive ? 'ring-2 ring-emerald-500' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-extrabold px-3 py-0.5 rounded-full">
                    {plan.badge}
                  </div>
                )}
                {isActive && (
                  <div className="absolute -top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Aktif
                  </div>
                )}

                <div className="text-2xl mb-2">{plan.icon}</div>
                <h3 className={`font-bold text-sm mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h3>
                <p className={`text-2xl font-extrabold mb-0.5 ${plan.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.price}</p>
                <p className={`text-xs mb-4 ${plan.highlight ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>{plan.priceNote}</p>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${plan.highlight ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      <Check size={13} className={`mt-0.5 shrink-0 ${plan.highlight ? 'text-blue-300' : 'text-emerald-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCTA(plan.id)}
                  disabled={isActive && plan.id !== 'free'}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-98 ${
                    plan.highlight
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isActive && plan.id !== 'free' ? '✓ Paket Aktif' : plan.cta}
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
