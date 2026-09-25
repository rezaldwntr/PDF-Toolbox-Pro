import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Timer, CheckCircle2, Shield, Loader2, 
  Sparkles, AlertCircle, Copy, Check, Zap, CreditCard, Tag
} from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth, TIER_RANK, TIER_CONFIGS } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BACKEND_URL } from '../../config';
import { View, UserTier, PromoSetting } from '../../types';
import { fetchPromoSettings, calculateEffectivePrice } from '../../lib/promo';

interface CheckoutModalProps {
  onSelectView?: (view: View) => void;
}

import { PLANS_BY_ID } from '../../lib/plans';
import { formatRupiah, formatDateIndonesia } from '../../lib/formatters';

const ADMIN_EMAIL = 'rezaldewantara@gmail.com';

const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSelectView }) => {
  const { showCheckoutModal, checkoutPlan, closeCheckout } = useQuota();
  const { user, isGuest, userTier, signInWithGoogle, refreshUser } = useAuth();

  const [promos, setPromos] = useState<PromoSetting[]>([]);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isLoadingSnap, setIsLoadingSnap] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Fetch promo settings when checkout modal opens
  useEffect(() => {
    if (showCheckoutModal) {
      fetchPromoSettings().then(setPromos);
    }
  }, [showCheckoutModal]);

  // Proteksi Hierarki Tier: Cek apakah paket yang dipilih lebih rendah dari paket aktif
  const currentRank = TIER_RANK[userTier] || 0;
  const targetPlanRank = checkoutPlan ? (TIER_RANK[checkoutPlan as UserTier] || 0) : 0;
  const isDowngrade = !isGuest && userTier !== 'free' && currentRank > targetPlanRank;
  const isExtension = !isGuest && user?.tier === checkoutPlan && !!user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

  // Timer countdown 15 menit & reset state saat ditutup
  useEffect(() => {
    if (!showCheckoutModal) {
      setTimeLeft(15 * 60);
      setIsPaid(false);
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

  // Helper sukses konfirmasi pembayaran & update tier di Supabase
  const handleConfirmPaymentSuccess = useCallback(async () => {
    if (user?.id) {
      const now = new Date();
      let baseDate = now;
      if (user?.subscriptionExpiry) {
        const existingExpiry = new Date(user.subscriptionExpiry);
        if (existingExpiry > now && user.tier === checkoutPlan) {
          baseDate = existingExpiry; // Stacking perpanjangan
        }
      }

      let expiry = new Date(baseDate.getTime());
      if (checkoutPlan === 'flash') {
        expiry.setHours(expiry.getHours() + 24);
      } else if (checkoutPlan === 'monthly') {
        expiry.setDate(expiry.getDate() + 30);
      } else if (checkoutPlan === 'annual') {
        expiry.setDate(expiry.getDate() + 365);
      }

      const { error: dbErr } = await supabase
        .from('user_profiles')
        .update({
          tier: checkoutPlan,
          subscription_expiry: expiry.toISOString(),
        })
        .eq('id', user.id);

      if (dbErr) {
        console.warn('Update tier Supabase gagal:', dbErr);
      }

      await refreshUser();
    }
    setIsPaid(true);
  }, [checkoutPlan, user, refreshUser]);

  // Polling status transaksi Midtrans
  const startPollingStatus = useCallback((activeOrderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/payment/status/${activeOrderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_paid) {
            clearInterval(pollIntervalRef.current);
            await handleConfirmPaymentSuccess();
          }
        }
      } catch (err) {
        console.warn('Gagal memeriksa status pembayaran Midtrans:', err);
      }
    }, 4000);
  }, [handleConfirmPaymentSuccess]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!showCheckoutModal || !checkoutPlan) return null;
  const plan = PLANS_BY_ID[checkoutPlan];
  if (!plan) return null;

  const effPrice = checkoutPlan
    ? calculateEffectivePrice(checkoutPlan, user?.email, promos)
    : null;

  const displayPriceStr = effPrice?.isPromo
    ? formatRupiah(effPrice.price)
    : plan.price;

  // Layar Proteksi: Jika user mencoba membeli paket yang lebih rendah dari paket aktifnya
  if (isDowngrade) {
    const currentConfig = TIER_CONFIGS[userTier];
    const expiryFormatted = user?.subscriptionExpiry
      ? formatDateIndonesia(user.subscriptionExpiry, { dateStyle: 'long' })
      : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 text-blue-600 dark:text-blue-400">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Paket Aktif Anda Lebih Tinggi</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-left">
            Akun Anda (<span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email}</span>) saat ini memiliki paket <span className="font-bold text-slate-900 dark:text-white">{currentConfig.label}</span> yang masih aktif{expiryFormatted ? ` hingga ${expiryFormatted}` : ''}.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl text-left text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} /> Semua Fitur Sudah Termasuk
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Semua fasilitas dari paket <strong>{plan.name}</strong> sudah otomatis aktif di akun Anda dengan batas ukuran berkas hingga <strong>{currentConfig.maxFileSizeMB} MB</strong> dan antrean prioritas utama.
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1">
              Pembelian paket ini dinonaktifkan agar akun Anda tidak mengalami penurunan spesifikasi (downgrade).
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={closeCheckout}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Kembali ke Aplikasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const copyAdminEmail = () => {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Eksekusi Pembayaran Otomatis via Midtrans Snap
  const handlePayWithMidtrans = async () => {
    if (isGuest) {
      alert('Silakan Masuk dengan Google terlebih dahulu agar paket aktif tersimpan pada akun Anda.');
      await signInWithGoogle();
      return;
    }

    setIsLoadingSnap(true);
    setErrorMessage(null);

    try {
      const resp = await fetch(`${BACKEND_URL}/payment/create-snap-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: checkoutPlan,
          user_id: user?.id || 'guest',
          user_email: user?.email || 'user@pdftoolbox.app',
          user_name: user?.fullName || 'Pengguna PDF Toolbox',
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || 'Gagal menghubungi server pembayaran Midtrans.');
      }

      const data = await resp.json();

      if ((window as any).snap && data.token && data.token !== 'DEMO-SNAP-TOKEN') {
        (window as any).snap.pay(data.token, {
          onSuccess: async (result: any) => {
            console.log('Midtrans Snap Success:', result);
            await handleConfirmPaymentSuccess();
          },
          onPending: (result: any) => {
            console.log('Midtrans Snap Pending:', result);
            if (data.order_id) {
              startPollingStatus(data.order_id);
            }
          },
          onError: (result: any) => {
            console.error('Midtrans Snap Error:', result);
            setErrorMessage('Pembayaran dibatalkan atau gagal diproses. Silakan coba lagi.');
          },
          onClose: () => {
            console.log('Pengguna menutup jendela pembayaran Snap');
          },
        });
      } else if (data.redirect_url) {
        window.open(data.redirect_url, '_blank');
        if (data.order_id) startPollingStatus(data.order_id);
      } else {
        throw new Error('Sesi pembayaran tidak dapat dimuat.');
      }
    } catch (err: any) {
      console.error('Midtrans Snap error:', err);
      setErrorMessage(err.message || 'Terjadi kendala saat memuat gerbang pembayaran otomatis.');
    } finally {
      setIsLoadingSnap(false);
    }
  };

  // Layar Pembayaran Berhasil / Teraktivasi
  if (isPaid) {
    return (
      <div className="google-anno-skip fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pembayaran Berhasil!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Selamat! Akun Anda (<span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email}</span>) kini telah resmi aktif dengan paket <span className="font-bold text-slate-900 dark:text-white">{plan.name}</span>.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Paket:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Nominal:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{displayPriceStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={13} /> Aktif & Terverifikasi Instan
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Gateway:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">PT Midtrans Resmi BI</span>
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={closeCheckout} 
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              Mulai Gunakan Fitur Pro ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="google-anno-skip fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">{plan.name}</h3>
                {effPrice?.isPromo ? (
                  <div className="flex items-center gap-1.5">
                    <span className="line-through text-[11px] text-slate-400 font-normal">
                      {formatRupiah(effPrice.originalPrice)}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                      Promo {displayPriceStr} (-{effPrice.discountPercent}%)
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    {plan.price}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pembayaran Resmi Didukung Midtrans (Berizin Bank Indonesia)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
              <Timer size={13} />
              <span className="text-xs font-bold font-mono">{timerStr}</span>
            </div>
            <button 
              onClick={closeCheckout} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">

          {/* Alert Login jika pengguna masih Guest */}
          {isGuest && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">Anda Belum Masuk Akun</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400/90 leading-relaxed mb-1.5">
                  Masuk dengan Google agar status langganan otomatis aktif di akun Anda secara permanen.
                </p>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Masuk dengan Google Sekarang →
                </button>
              </div>
            </div>
          )}

          {/* Banner Perpanjangan jika memperpanjang paket yang sama */}
          {isExtension && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <Sparkles size={16} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-bold">Perpanjangan Paket (+Masa Aktif)</p>
                <p className="text-[11px] text-blue-800 dark:text-blue-400/90 leading-relaxed">
                  Durasi baru akan ditambahkan langsung dari sisa masa aktif akun Anda saat ini (Stacking).
                </p>
              </div>
            </div>
          )}

          {/* Error Message jika ada */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ringkasan Paket Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">Paket Dipilih</span>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{plan.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{plan.desc}</p>
              {effPrice?.isPromo && effPrice.bannerText && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  {effPrice.bannerText}
                </span>
              )}
            </div>
            <div className="text-right">
              {effPrice?.isPromo ? (
                <div>
                  <span className="line-through text-xs text-slate-400 block">
                    {formatRupiah(effPrice.originalPrice)}
                  </span>
                  <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{displayPriceStr}</span>
                </div>
              ) : (
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
              )}
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{plan.priceNote}</p>
            </div>
          </div>

          {/* Saluran Pembayaran Midtrans yang Didukung */}
          <div className="bg-slate-50 dark:bg-[#151820] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              <span>Metode Pembayaran Instan Midtrans:</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="text-base mb-0.5">📱</div>
                <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">QRIS Dinamis</div>
                <div className="text-[9px] text-slate-400">Semua m-Banking</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="text-base mb-0.5">💚</div>
                <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">GoPay</div>
                <div className="text-[9px] text-slate-400">Instan 1-Klik</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="text-base mb-0.5">🧡</div>
                <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">ShopeePay</div>
                <div className="text-[9px] text-slate-400">Aplikasi Shopee</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <div className="text-base mb-0.5">🏦</div>
                <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Virtual Account</div>
                <div className="text-[9px] text-slate-400">BCA, Mandiri, BRI, BNI</div>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <span>Akun langsung aktif otomatis dalam 1 detik setelah pembayaran berhasil.</span>
            </div>
          </div>

          {/* Tombol Utama Pembayaran Midtrans */}
          <button
            type="button"
            onClick={handlePayWithMidtrans}
            disabled={isLoadingSnap}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-98 flex items-center justify-center gap-2.5 text-sm disabled:opacity-60 cursor-pointer"
          >
            {isLoadingSnap ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Menghubungi Gerbang Midtrans...</span>
              </>
            ) : (
              <>
                <Zap size={18} className="text-amber-300 fill-amber-300" />
                <span>Bayar Sekarang ({displayPriceStr}) →</span>
              </>
            )}
          </button>

          {/* Trust Footer & Contact Admin */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            <p>
              Dengan membayar, Anda menyetujui{' '}
              {onSelectView ? (
                <button
                  type="button"
                  onClick={() => {
                    closeCheckout();
                    onSelectView(View.TERMS);
                  }}
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium cursor-pointer"
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
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium cursor-pointer"
                >
                  Kebijakan Privasi
                </button>
              ) : (
                <span className="underline">Kebijakan Privasi</span>
              )}
              .
            </p>
            <div className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>Bantuan aktivasi pembayaran:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{ADMIN_EMAIL}</span>
              <button
                type="button"
                onClick={copyAdminEmail}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Salin Email Admin"
              >
                {copiedEmail ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px]">
              <Shield size={12} className="text-emerald-500" />
              <span>Didukung PT Midtrans (Berizin Bank Indonesia) · Transaksi Enkripsi 256-bit</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
