import React, { useState, useEffect } from 'react';
import { X, QrCode, Timer, CheckCircle2, Shield } from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { TIER_CONFIGS } from '../../contexts/AuthContext';
import { UserTier } from '../../types';

const PLAN_DETAILS: Record<string, { name: string; price: string; priceNote: string; desc: string; features: string[] }> = {
  flash: {
    name: '24-Hour Flash Pass',
    price: 'Rp5.000',
    priceNote: 'sekali bayar · berlaku 24 jam',
    desc: 'Solusi cepat untuk kebutuhan mendesak',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 100 MB', 'Batch hingga 20 file sekaligus', 'Bebas iklan selama 24 jam'],
  },
  monthly: {
    name: 'Monthly Pro',
    price: 'Rp29.000',
    priceNote: '/bulan · batalkan kapan saja',
    desc: 'Untuk pengguna rutin harian',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 250 MB', 'Batch hingga 50 file sekaligus', 'Bebas iklan selamanya'],
  },
  annual: {
    name: 'Annual Value Pass',
    price: 'Rp149.000',
    priceNote: '/tahun · hemat 57% vs bulanan',
    desc: 'Nilai terbaik untuk pengguna power',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 500 MB', 'Batch hingga 100 file sekaligus', 'Bebas iklan + prioritas support'],
  },
};

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', emoji: '📱', desc: 'Semua m-banking & e-wallet' },
  { id: 'gopay', label: 'GoPay', emoji: '💚', desc: 'GoPay / GoTagihan' },
  { id: 'ovo', label: 'OVO', emoji: '💜', desc: 'OVO Cash' },
  { id: 'dana', label: 'Dana', emoji: '🔵', desc: 'DANA' },
];

const CheckoutModal: React.FC = () => {
  const { showCheckoutModal, checkoutPlan, closeCheckout, openPaywall } = useQuota();
  const [selectedMethod, setSelectedMethod] = useState('qris');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit dalam detik
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!showCheckoutModal) {
      setTimeLeft(15 * 60);
      setIsPaid(false);
      setSelectedMethod('qris');
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          closeCheckout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showCheckoutModal, closeCheckout]);

  if (!showCheckoutModal || !checkoutPlan) return null;
  const plan = PLAN_DETAILS[checkoutPlan];
  if (!plan) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (isPaid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pembayaran Dikonfirmasi!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Akun Anda telah diupgrade ke <span className="font-bold text-blue-600">{plan.name}</span>. Selamat menggunakan!</p>
          <button onClick={closeCheckout} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Mulai Menggunakan ✨
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Checkout</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
              <Timer size={14} />
              <span className="text-xs font-bold font-mono">{timerStr}</span>
            </div>
            <button onClick={closeCheckout} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Price */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{plan.desc}</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{plan.price}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{plan.priceNote}</p>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Method Picker */}
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Metode Pembayaran:</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedMethod === m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <div className="text-xl mb-0.5">{m.emoji}</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{m.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="w-40 h-40 bg-white dark:bg-slate-700 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-2 mb-3">
              <QrCode className="w-16 h-16 text-slate-400 dark:text-slate-500" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-2">QRIS aktif setelah<br/>integrasi Midtrans</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[220px]">
              Pindai QR dengan aplikasi m-banking atau e-wallet apapun
            </p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={() => setIsPaid(true)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/25 active:scale-98"
          >
            Saya Sudah Bayar ✓
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Shield size={12} />
            <span>Pembayaran diproses aman · Data terenkripsi TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
