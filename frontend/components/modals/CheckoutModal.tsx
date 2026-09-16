import React, { useState, useEffect } from 'react';
import { 
  X, QrCode, Timer, CheckCircle2, Shield, Loader2, 
  Sparkles, AlertCircle, Download, Mail, 
  Copy, Check, ArrowRight, ArrowLeft, Smartphone
} from 'lucide-react';
import { useQuota } from '../../contexts/QuotaContext';
import { useAuth, TIER_RANK, TIER_CONFIGS } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { View, UserTier } from '../../types';

interface CheckoutModalProps {
  onSelectView?: (view: View) => void;
}

const PLAN_DETAILS: Record<string, { 
  name: string; 
  price: string; 
  rawPrice: number; 
  priceNote: string; 
  desc: string; 
  qrisImage: string;
  badge: string;
  features: string[];
}> = {
  flash: {
    name: '24-Hour Flash Pass',
    price: 'Rp5.000',
    rawPrice: 5000,
    priceNote: 'sekali bayar · berlaku 24 jam',
    desc: 'Solusi cepat untuk kebutuhan mendesak',
    qrisImage: '/qris/qris-flash.jpg',
    badge: 'TERPOPULER',
    features: [
      'Akses alat standar tanpa batas (24 jam)',
      'Alat berat & OCR: Kuota 25 tugas (150 hal)',
      'Batas file s.d. 100 MB (Alat berat 35 MB)',
      'Batch hingga 10 file sekaligus',
      'Tautan unduh aktif 6 jam · Bebas iklan',
      'Antrean eksekusi Jalur Cepat'
    ],
  },
  monthly: {
    name: 'Monthly Pro',
    price: 'Rp29.000',
    rawPrice: 29000,
    priceNote: '/bulan · batalkan kapan saja',
    desc: 'Untuk produktivitas harian tanpa batas',
    qrisImage: '/qris/qris-monthly.jpg',
    badge: 'PRODUKTIF',
    features: [
      'Semua alat standar tanpa batas setiap hari',
      'Alat berat & OCR tanpa batas (FUP 100/hari)',
      'Batas file s.d. 200 MB (Alat berat 50 MB)',
      'Batch hingga 30 file sekaligus',
      'Tautan unduh aktif 24 jam · Bebas iklan',
      'Antrean eksekusi Jalur Prioritas'
    ],
  },
  annual: {
    name: 'Annual Pass',
    price: 'Rp149.000',
    rawPrice: 149000,
    priceNote: '/tahun · hemat 57% vs bulanan',
    desc: 'Nilai terbaik untuk pengguna daya tinggi',
    qrisImage: '/qris/qris-annual.jpg',
    badge: 'HEMAT 57%',
    features: [
      'Semua keunggulan paket Monthly Pro',
      'Alat berat & OCR tanpa batas (FUP 250/hari)',
      'Batas file s.d. 300 MB (Alat berat 50 MB)',
      'Batch hingga 50 file sekaligus',
      'Tautan unduh aktif 48 jam · Bebas iklan',
      'Antrean eksekusi Jalur Prioritas Utama'
    ],
  },
};

const BANK_OPTIONS = [
  'BCA Mobile / myBCA',
  'Livin by Mandiri',
  'BRImo (Bank BRI)',
  'BNI Mobile Banking',
  'GoPay / Gojek',
  'OVO',
  'DANA',
  'ShopeePay',
  'SeaBank',
  'Bank Jago / Allo Bank',
  'BSI Mobile',
  'CIMB Niaga OCTO Mobile',
  'Lainnya / E-Wallet Lain'
];

const ADMIN_EMAIL = 'rezaldewantara@gmail.com';

const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSelectView }) => {
  const { showCheckoutModal, checkoutPlan, closeCheckout } = useQuota();
  const { user, isGuest, userTier, signInWithGoogle, refreshUser } = useAuth();

  const [activeStep, setActiveStep] = useState<'scan' | 'confirm'>('scan');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 menit
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form input states
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('GoPay / Gojek');
  const [accountEmail, setAccountEmail] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Proteksi Hierarki Tier: Cek apakah paket yang dipilih lebih rendah dari paket aktif
  const currentRank = TIER_RANK[userTier] || 0;
  const targetPlanRank = checkoutPlan ? (TIER_RANK[checkoutPlan as UserTier] || 0) : 0;
  const isDowngrade = !isGuest && userTier !== 'free' && currentRank > targetPlanRank;
  const isExtension = !isGuest && user?.tier === checkoutPlan && !!user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

  // Sinkronisasi data user saat terbuka
  useEffect(() => {
    if (user) {
      setAccountEmail(user.email || '');
      setSenderName(prev => prev || user.fullName || '');
    }
  }, [user]);

  // Timer countdown 15 menit
  useEffect(() => {
    if (!showCheckoutModal) {
      setTimeLeft(15 * 60);
      setIsPaid(false);
      setActiveStep('scan');
      setErrorMessage(null);
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

  // Layar Proteksi: Jika user mencoba membeli paket yang lebih rendah dari paket aktifnya
  if (isDowngrade) {
    const currentConfig = TIER_CONFIGS[userTier];
    const expiryFormatted = user?.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toLocaleDateString('id-ID', { dateStyle: 'long' })
      : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 text-blue-600 dark:text-blue-400">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Paket Aktif Anda Lebih Tinggi</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-left">
            Akun Anda (<span className="font-semibold text-blue-600 dark:text-blue-400">{accountEmail || user?.email}</span>) saat ini memiliki paket <span className="font-bold text-slate-900 dark:text-white">{currentConfig.label}</span> yang masih aktif{expiryFormatted ? ` hingga ${expiryFormatted}` : ''}.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl text-left text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} /> Semua Fitur Sudah Termasuk
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Semua fasilitas dari paket <strong>{plan.name}</strong> sudah otomatis aktif di akun Anda dengan batas ukuran berkas hingga <strong>{currentConfig.maxFileSizeMB} MB</strong> dan antrean prioritas.
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

  // Submit konfirmasi pembayaran ke email via FormSubmit + Auto-upgrade user di Supabase
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      alert('Silakan Masuk dengan Google terlebih dahulu agar paket aktif tersimpan pada akun Anda.');
      await signInWithGoogle();
      return;
    }

    if (!accountEmail.trim()) {
      setErrorMessage('Email akun tidak boleh kosong.');
      return;
    }
    if (!senderName.trim()) {
      setErrorMessage('Silakan isi nama pengirim / pemilik rekening transfer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const now = new Date();
    const formattedDate = now.toLocaleString('id-ID', { 
      timeZone: 'Asia/Jakarta', 
      dateStyle: 'full', 
      timeStyle: 'medium' 
    }) + ' WIB';

    try {
      // 1. Kirim notifikasi konfirmasi ke email admin (rezaldewantara@gmail.com) via FormSubmit
      try {
        await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            _subject: `[Aktivasi QRIS] ${plan.name} (${plan.price}) - ${senderName}`,
            _template: 'table',
            _captcha: 'false',
            _replyto: accountEmail,
            'Paket Langganan': plan.name,
            'Nominal Pembayaran': plan.price,
            'Email Akun PDF Toolbox': accountEmail,
            'Nama Pemilik Rekening / Pengirim': senderName,
            'Bank / E-Wallet Pengirim': senderBank,
            'Nomor Referensi Transaksi': refNumber || '-',
            'Catatan Pengguna': notes || '-',
            'Waktu Transaksi': formattedDate,
            'User ID': user?.id || 'unknown',
          }),
        });
      } catch (emailErr) {
        console.warn('Pengiriman FormSubmit email mengalami kendala jaringan:', emailErr);
      }

      // 2. Aktifkan atau perpanjang paket pada profil Supabase pengguna
      if (user?.id) {
        let baseDate = now;
        // Jika memperpanjang paket yang sama dan masih aktif, tambahkan durasi dari expiry sebelumnya (Stacking)
        if (user?.subscriptionExpiry) {
          const existingExpiry = new Date(user.subscriptionExpiry);
          if (existingExpiry > now && user.tier === checkoutPlan) {
            baseDate = existingExpiry;
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
          console.warn('Update tier Supabase gagal langsung:', dbErr);
        }

        await refreshUser();
      }

      setIsPaid(true);
    } catch (err: any) {
      console.error('Konfirmasi pembayaran gagal:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat mengirim verifikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subject dan body untuk direct mailto fallback
  const mailtoSubject = encodeURIComponent(`[Konfirmasi QRIS] ${plan.name} - ${accountEmail || senderName}`);
  const mailtoBody = encodeURIComponent(
    `Halo Tim Admin PDF Toolbox Pro,\n\nSaya telah menyelesaikan pembayaran via QRIS:\n` +
    `- Paket: ${plan.name} (${plan.price})\n` +
    `- Email Akun: ${accountEmail || user?.email}\n` +
    `- Pengirim: ${senderName}\n` +
    `- Metode / Bank: ${senderBank}\n` +
    `- No. Referensi: ${refNumber || '-'}\n` +
    `- Catatan: ${notes || '-'}\n\n` +
    `Mohon konfirmasi aktivasi akun saya. Terima kasih!`
  );

  // Layar Pembayaran Berhasil / Teraktivasi
  if (isPaid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Paket Berhasil Diaktifkan!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Selamat! Akun Anda (<span className="font-semibold text-blue-600 dark:text-blue-400">{accountEmail}</span>) kini telah aktif dengan paket <span className="font-bold text-slate-900 dark:text-white">{plan.name}</span>.
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Paket:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Nominal:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{plan.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={13} /> Aktif & Terverifikasi
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Notifikasi Email:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{ADMIN_EMAIL}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden max-h-[94vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">{plan.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {plan.price}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pembayaran Instan QRIS Resmi Nasional</p>
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

        {/* Step Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveStep('scan')}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeStep === 'scan'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-[10px] flex items-center justify-center">1</span>
            <span>1. Pindai Kode QRIS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('confirm')}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeStep === 'confirm'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-[10px] flex items-center justify-center">2</span>
            <span>2. Verifikasi Email</span>
          </button>
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

          {/* TAB 1: TAMPILAN QRIS */}
          {activeStep === 'scan' && (
            <div className="space-y-4 animate-fade-in">
              {/* QRIS Card */}
              <div className="bg-slate-50 dark:bg-[#151820] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-center space-y-3">
                
                {/* QRIS Merchant Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Smartphone size={13} className="text-emerald-500" />
                  <span>PDF TOOLBOX PRO · NMID: ID1026594351755</span>
                </div>

                {/* Gambar QRIS Resmi */}
                <div className="relative mx-auto w-56 sm:w-64 max-w-full bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                  <img
                    src={plan.qrisImage}
                    alt={`QRIS ${plan.name} - ${plan.price}`}
                    className="w-full h-auto rounded-xl object-contain"
                  />
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Nominal Pas:</span>
                    <span className="text-emerald-600 font-extrabold text-sm">{plan.price}</span>
                  </div>
                </div>

                {/* Tombol Unduh QRIS */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <a
                    href={plan.qrisImage}
                    download={`QRIS-${checkoutPlan}-${plan.price}.jpg`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-800/50 transition-colors shadow-xs"
                  >
                    <Download size={14} />
                    <span>Unduh Gambar QRIS</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveStep('confirm')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Saya Sudah Bayar →</span>
                  </button>
                </div>
              </div>

              {/* Panduan 3 Langkah Cepat */}
              <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Cara Pembayaran Cepat:</span>
                </p>
                <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Buka m-Banking atau E-Wallet apa saja (BCA, Mandiri, BRI, GoPay, OVO, DANA, ShopeePay, dll).</li>
                  <li>Pindai (Scan) QRIS di atas, atau klik <strong>Unduh Gambar QRIS</strong> lalu pilih dari galeri HP Anda.</li>
                  <li>Pastikan nama penerima adalah <strong>PDF TOOLBOX PRO</strong> dengan nominal pas <strong>{plan.price}</strong>.</li>
                  <li>Setelah transfer berhasil, klik tombol <strong>"Saya Sudah Bayar"</strong> untuk mengirim verifikasi email.</li>
                </ol>
              </div>

              {/* CTA Beralih ke Konfirmasi */}
              <button
                type="button"
                onClick={() => setActiveStep('confirm')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/25 active:scale-98 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <span>Lanjut ke Verifikasi & Konfirmasi Email</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* TAB 2: FORM VERIFIKASI EMAIL */}
          {activeStep === 'confirm' && (
            <form onSubmit={handleConfirmSubmit} className="space-y-4 animate-fade-in">
              
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Mail size={14} className="text-amber-600" />
                  <span>Verifikasi Email Admin</span>
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  Konfirmasi pembayaran Anda akan dikirim ke email <strong>{ADMIN_EMAIL}</strong>. Sistem akan langsung meng-upgrade akun Anda begitu tombol konfirmasi ditekan.
                </p>
              </div>

              {/* Input Email Akun */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Email Akun PDF Toolbox Pro:</span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">Akun yang di-upgrade</span>
                </label>
                <input
                  type="email"
                  required
                  value={accountEmail}
                  onChange={e => setAccountEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition-colors"
                />
              </div>

              {/* Input Nama Pengirim */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Pemilik Rekening / Pengirim:
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Siti Rahma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition-colors"
                />
              </div>

              {/* Pilihan Bank / E-Wallet */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bank / E-Wallet yang Digunakan:
                </label>
                <select
                  value={senderBank}
                  onChange={e => setSenderBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition-colors"
                >
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Nomor Referensi / Catatan Opsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    No. Ref / Kode Transaksi: <span className="text-[10px] text-slate-400">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                    placeholder="Contoh: 20260915..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Catatan Tambahan: <span className="text-[10px] text-slate-400">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Pesan untuk admin"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Error Message jika ada */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-900/40">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/25 active:scale-98 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Memverifikasi & Mengaktifkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Kirim Konfirmasi & Aktifkan Paket ({plan.price})</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveStep('scan')}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Lihat QRIS Lagi</span>
                  </button>

                  <a
                    href={`mailto:${ADMIN_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`}
                    className="flex-1 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <Mail size={13} />
                    <span>Kirim via Email Client</span>
                  </a>
                </div>
              </div>
            </form>
          )}

          {/* Trust Footer & Contact Admin */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            <div className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>Bantuan aktivasi manual hubungi:</span>
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
              <span>Standar QRIS Nasional Bank Indonesia · Transaksi Dijamin Aman</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
