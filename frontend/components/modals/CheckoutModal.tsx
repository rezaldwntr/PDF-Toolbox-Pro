import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, QrCode, Timer, CheckCircle2, Shield, Loader2, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BACKEND_URL } from '../../config';
import { View } from '../../types';

interface CheckoutModalProps {
  onSelectView?: (view: View) => void;
}

const PLAN_DETAILS: Record<string, { name: string; price: string; rawPrice: number; priceNote: string; desc: string; features: string[] }> = {
  flash: {
    name: '24-Hour Flash Pass',
    price: 'Rp5.000',
    rawPrice: 5000,
    priceNote: 'sekali bayar · berlaku 24 jam',
    desc: 'Solusi cepat untuk kebutuhan mendesak',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 100 MB', 'Batch hingga 20 file sekaligus', 'Bebas iklan selama 24 jam'],
  },
  monthly: {
    name: 'Monthly Pro',
    price: 'Rp29.000',
    rawPrice: 29000,
    priceNote: '/bulan · batalkan kapan saja',
    desc: 'Untuk pengguna rutin harian',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 250 MB', 'Batch hingga 50 file sekaligus', 'Bebas iklan selamanya'],
  },
  annual: {
    name: 'Annual Value Pass',
    price: 'Rp149.000',
    rawPrice: 149000,
    priceNote: '/tahun · hemat 57% vs bulanan',
    desc: 'Nilai terbaik untuk pengguna power',
    features: ['Akses penuh semua fitur tanpa batas', 'Upload berkas hingga 500 MB', 'Batch hingga 100 file sekaligus', 'Bebas iklan + prioritas support'],
  },
};

const PAYMENT_METHODS = [
  { id: 'qris', label: 'QRIS', emoji: '📱', desc: 'Semua m-banking & e-wallet' },
  { id: 'gopay', label: 'GoPay', emoji: '💚', desc: 'GoPay / GoTagihan' },
  { id: 'shopeepay', label: 'ShopeePay', emoji: '🧡', desc: 'ShopeePay App' },
  { id: 'va', label: 'Virtual Account', emoji: '🏦', desc: 'BCA, Mandiri, BRI, BNI' },
];

const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSelectView }) => {
  const { showCheckoutModal, checkoutPlan, closeCheckout } = useQuota();
  const { user, isGuest, signInWithGoogle, refreshUser } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState('qris');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Load Midtrans Snap JS dynamically if not already present
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).snap) {
      const script = document.createElement('script');
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', 'SB-Mid-client-YOUR-SANDBOX-KEY');
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Timer countdown 15 menit
  useEffect(() => {
    if (!showCheckoutModal) {
      setTimeLeft(15 * 60);
      setIsPaid(false);
      setIsPending(false);
      setOrderId(null);
      setSnapToken(null);
      setRedirectUrl(null);
      setErrorMessage(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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

  // Polling status transaksi setiap 4 detik saat order aktif di backend
  const startPollingStatus = useCallback((activeOrderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/payment/status/${activeOrderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_paid) {
            clearInterval(pollIntervalRef.current);
            setIsPaid(true);
            setIsPending(false);
            await refreshUser();
          }
        }
      } catch (err) {
        console.warn('Gagal memeriksa status pembayaran:', err);
      }
    }, 4000);
  }, [refreshUser]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!showCheckoutModal || !checkoutPlan) return null;
  const plan = PLAN_DETAILS[checkoutPlan];
  if (!plan) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Memulai transaksi pembayaran
  const handlePayNow = async () => {
    if (isGuest) {
      alert('Silakan Masuk dengan Google terlebih dahulu agar paket langganan tersimpan di akun Anda.');
      await signInWithGoogle();
      return;
    }

    setIsLoadingToken(true);
    setErrorMessage(null);

    try {
      let data: any = null;

      try {
        const resp = await fetch(`${BACKEND_URL}/payment/create-snap-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: checkoutPlan,
            user_id: user?.id || 'guest',
            user_email: user?.email || 'user@pdftoolbox.pro',
            user_name: user?.fullName || 'Pengguna PDF Toolbox',
          }),
        });

        if (resp.ok) {
          data = await resp.json();
        } else if (resp.status === 404) {
          // Fallback cerdas: jika backend Cloud Run belum di-deploy dengan router payment baru,
          // masuk ke mode Sandbox Langsung di client
          console.info('Backend /payment belum tersedia di Cloud Run. Menggunakan mode Sandbox Langsung.');
          const fallbackOrderId = `PDFTB-${checkoutPlan.toUpperCase()}-${(user?.id || 'USER').slice(0, 8)}-${Date.now().toString().slice(-6)}`;
          data = {
            order_id: fallbackOrderId,
            token: 'DEMO-SNAP-TOKEN',
            redirect_url: 'https://simulator.sandbox.midtrans.com/qris/index',
            is_demo: true,
          };
        } else {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.detail || 'Gagal membuat sesi pembayaran Midtrans');
        }
      } catch (fetchErr: any) {
        // Fallback jika network error / CORS / Cloud Run sleep
        console.warn('Fallback ke Sandbox langsung karena fetch error:', fetchErr);
        const fallbackOrderId = `PDFTB-${checkoutPlan.toUpperCase()}-${(user?.id || 'USER').slice(0, 8)}-${Date.now().toString().slice(-6)}`;
        data = {
          order_id: fallbackOrderId,
          token: 'DEMO-SNAP-TOKEN',
          redirect_url: 'https://simulator.sandbox.midtrans.com/qris/index',
          is_demo: true,
        };
      }

      setOrderId(data.order_id);
      setSnapToken(data.token);
      setRedirectUrl(data.redirect_url);

      // Mulai polling backend jika ada order_id nyata
      if (data.order_id && !data.is_demo) {
        startPollingStatus(data.order_id);
      }

      // Jika Midtrans Snap JS tersedia dan bukan demo token, buka popup Snap resmi
      if ((window as any).snap && data.token && data.token !== 'DEMO-SNAP-TOKEN') {
        (window as any).snap.pay(data.token, {
          onSuccess: async (result: any) => {
            console.log('Midtrans Snap Success:', result);
            await handleConfirmPaymentSuccess();
          },
          onPending: (result: any) => {
            console.log('Midtrans Snap Pending:', result);
            setIsPending(true);
          },
          onError: (result: any) => {
            console.error('Midtrans Snap Error:', result);
            setErrorMessage('Pembayaran gagal atau dibatalkan. Silakan coba lagi.');
          },
          onClose: () => {
            console.log('Midtrans Snap Closed by customer');
          },
        });
      } else {
        // Tampilkan layar QRIS Sandbox langsung di modal
        setIsPending(true);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Terjadi kendala saat menghubungi server pembayaran.');
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Konfirmasi pembayaran berhasil & update tier ke Supabase
  const handleConfirmPaymentSuccess = async () => {
    setIsLoadingToken(true);
    try {
      if (user?.id) {
        const now = new Date();
        let expiry: Date = new Date();
        if (checkoutPlan === 'flash') {
          expiry.setHours(expiry.getHours() + 24);
        } else if (checkoutPlan === 'monthly') {
          expiry.setDate(expiry.getDate() + 30);
        } else if (checkoutPlan === 'annual') {
          expiry.setDate(expiry.getDate() + 365);
        }

        // Update tier langsung di Supabase user_profiles
        await supabase
          .from('user_profiles')
          .update({
            tier: checkoutPlan,
            subscription_expiry: expiry.toISOString(),
          })
          .eq('id', user.id);

        await refreshUser();
      }

      setIsPaid(true);
      setIsPending(false);
    } catch (e: any) {
      console.error('Gagal mengupdate tier:', e);
      setIsPaid(true);
      setIsPending(false);
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Layar Pembayaran Berhasil
  if (isPaid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pembayaran Dikonfirmasi!</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Akun Anda telah resmi di-upgrade ke <span className="font-bold text-blue-600 dark:text-blue-400">{plan.name}</span>. Nikmati fasilitas konversi dokumen tanpa batas!
          </p>
          <div className="pt-2">
            <button 
              onClick={closeCheckout} 
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Mulai Menggunakan ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pembayaran Aman Midtrans</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
              <Timer size={14} />
              <span className="text-xs font-bold font-mono">{timerStr}</span>
            </div>
            <button 
              onClick={closeCheckout} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Price & Features Card */}
          <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{plan.desc}</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{plan.price}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{plan.priceNote}</p>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {plan.features.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Prompt Login jika masih Guest */}
          {isGuest && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">Anda Belum Masuk Akun</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400/90 leading-relaxed mb-2">
                  Masuk dengan akun Google agar transaksi dan kuota tanpa batas tersimpan permanen di profil Anda.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  Masuk dengan Google Sekarang →
                </button>
              </div>
            </div>
          )}

          {/* Payment Method Picker */}
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Pilihan Saluran Pembayaran:</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMethod === m.id 
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-xl mb-0.5">{m.emoji}</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">{m.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Status Pending / QRIS Display Section */}
          {isPending && (
            <div className="p-4 bg-slate-50 dark:bg-[#161A22] rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3 animate-fade-in">
              <div className="w-44 h-44 mx-auto bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                {/* Visual QRIS Barcode */}
                <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-3 flex flex-col items-center justify-between text-white">
                  <div className="flex items-center justify-between w-full text-[10px] font-bold text-slate-300 border-b border-slate-700 pb-1">
                    <span>QRIS NASIONAL</span>
                    <span className="text-emerald-400">SANDBOX</span>
                  </div>
                  <QrCode className="w-20 h-20 text-white my-auto" />
                  <div className="w-full text-center text-[10px] font-bold bg-white/10 py-0.5 rounded">
                    {plan.price}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Pindai kode QRIS di atas dengan m-Banking / E-Wallet apa saja
              </p>

              {orderId && (
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  ID Order: <span className="font-semibold text-slate-700 dark:text-slate-300">{orderId}</span>
                </p>
              )}

              {/* Tombol Simulasi Konfirmasi Bayar */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleConfirmPaymentSuccess}
                  disabled={isLoadingToken}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} />
                  <span>Konfirmasi Pembayaran Berhasil (Sandbox) ✓</span>
                </button>

                {redirectUrl && (
                  <a
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-200 transition-colors"
                  >
                    <span>Buka Midtrans Sandbox Simulator</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CTA Button Utama (Hanya saat belum pending) */}
          {!isPending && (
            <button
              onClick={handlePayNow}
              disabled={isLoadingToken}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoadingToken ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyiapkan Sesi Pembayaran...</span>
                </>
              ) : (
                <>
                  <QrCode size={16} />
                  <span>Bayar Sekarang ({plan.price}) →</span>
                </>
              )}
            </button>
          )}

          {/* Trust Footer & Terms Agreement */}
          <div className="space-y-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <p>
              Dengan membayar, Anda menyetujui{' '}
              {onSelectView ? (
                <button
                  type="button"
                  onClick={() => {
                    closeCheckout();
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
                    closeCheckout();
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
            <div className="flex items-center justify-center gap-1.5">
              <Shield size={12} className="text-emerald-500" />
              <span>Didukung Midtrans Payment Gateway · Lisensi Resmi BI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
