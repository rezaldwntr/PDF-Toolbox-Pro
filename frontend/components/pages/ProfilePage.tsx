import React from 'react';
import { View } from '../../types';
import { useAuth, TIER_CONFIGS } from '../../contexts/AuthContext';
import { useQuota } from '../../contexts/QuotaContext';
import { 
  Zap, 
  Crown, 
  ShieldCheck, 
  Clock, 
  HardDrive, 
  Layers, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  FileText
} from 'lucide-react';

interface ProfilePageProps {
  onSelectView?: (view: View) => void;
}

const TIER_BADGES: Record<string, { label: string; badgeCls: string; icon: React.ReactNode }> = {
  guest: { 
    label: 'Tamu (Tanpa Akun)', 
    badgeCls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: <HelpCircle className="w-4 h-4 text-slate-500" />
  },
  free: { 
    label: 'Akun Gratis', 
    badgeCls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: <CheckCircle2 className="w-4 h-4 text-blue-500" />
  },
  flash: { 
    label: '24-Hour Flash Pass', 
    badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: <Zap className="w-4 h-4 text-amber-500" />
  },
  monthly: { 
    label: 'Monthly Pro', 
    badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    icon: <Crown className="w-4 h-4 text-indigo-500" />
  },
  annual: { 
    label: 'Annual VIP Pass', 
    badgeCls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: <Sparkles className="w-4 h-4 text-purple-500" />
  },
};

const ProfilePage: React.FC<ProfilePageProps> = ({ onSelectView }) => {
  const { user, isGuest, isPro, userTier, signOut, signInWithGoogle } = useAuth();
  const { quota, maxQuota, quotaUsed, maxFileSizeMB, setShowPricingModal, openCheckout } = useQuota();

  const tierMeta = TIER_BADGES[userTier] || TIER_BADGES.free;
  const currentConfig = TIER_CONFIGS[userTier] || TIER_CONFIGS.free;

  // Hitung persentase kuota terpakai
  const totalQuota = maxQuota || 10;
  const used = quotaUsed || 0;
  const percentUsed = Math.min(100, Math.round((used / totalQuota) * 100));

  const handleSignOut = async () => {
    await signOut();
    if (onSelectView) {
      onSelectView(View.HOME_TAB);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full animate-fade-in pb-24">
      {/* 1. KARTU PROFIL UTAMA */}
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.fullName || 'User Avatar'} 
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md shadow-slate-200 dark:shadow-none"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md shadow-blue-500/20">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'G'}
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-[#1E222B]" title="Akun Aktif">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User Info & Tier */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.fullName || 'Pengguna Tamu'}
              </h1>
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${tierMeta.badgeCls} self-center sm:self-auto`}>
                {tierMeta.icon}
                <span>{tierMeta.label}</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {user?.email ? (
                <span className="flex items-center gap-1.5 justify-center sm:justify-start font-medium">
                  <span>{user.email}</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded font-semibold">Google Verified</span>
                </span>
              ) : (
                'Anda sedang menggunakan sesi tamu sementara.'
              )}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {isGuest ? (
                <button
                  onClick={signInWithGoogle}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-2 active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Masuk dengan Google (10 Tugas Gratis)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Crown size={14} className="text-amber-300" />
                    <span>{isPro ? 'Ganti Paket' : 'Upgrade ke Pro'}</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 transition-colors flex items-center gap-1.5"
                  >
                    <LogOut size={14} />
                    <span>Keluar dari Akun</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRID STATUS KUOTA & SPESIFIKASI PAKET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Kuota Card */}
        <div className="bg-white dark:bg-[#1E222B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kuota Harian</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Zap size={16} className="fill-blue-500" />
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {isPro ? 'Unlimited' : `${quota ?? 0}`}
              </span>
              {!isPro && (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">
                  / {maxQuota ?? 10} tersisa hari ini
                </span>
              )}
            </div>

            {!isPro && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, 100 - percentUsed)}%` }}
                />
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-2">
            <Clock size={12} />
            <span>Reset otomatis setiap jam 00:00 WIB</span>
          </p>
        </div>

        {/* Batas Ukuran File Card */}
        <div className="bg-white dark:bg-[#1E222B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Batas Ukuran File</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <HardDrive size={16} />
              </div>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {maxFileSizeMB} MB
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">per dokumen</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Maksimal ukuran file PDF yang dapat diproses dan dikonversi sekaligus.
            </p>
          </div>

          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-3">
            {isPro ? '✓ Kapasitas Tinggi Aktif' : 'Tersedia hingga 500 MB di paket Pro'}
          </span>
        </div>

        {/* Batch File Processing Card */}
        <div className="bg-white dark:bg-[#1E222B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Multi-Berkas (Batch)</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentConfig.maxBatchFiles} File
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-1">sekaligus</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Jumlah berkas dokumen yang dapat digabungkan atau dikompresi dalam 1 klik.
            </p>
          </div>

          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-3">
            {isPro ? '✓ Batch Processing Prioritas' : 'Hingga 100 file di paket Annual'}
          </span>
        </div>
      </div>

      {/* 3. PROMO PRO BANNER (Jika belum Pro) */}
      {!isPro && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-blue-500/20 mb-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm">
                <Zap size={13} className="fill-amber-300 text-amber-300" />
                <span>24-Hour Flash Pass · Hanya Rp5.000</span>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">
                Butuh Proses Banyak Dokumen Hari Ini?
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Dapatkan akses tanpa batas selama 24 jam penuh, batas berkas 100 MB, bebas iklan, dan prioritas server. Pembayaran instan via QRIS, GoPay, OVO, atau Dana.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => openCheckout('flash')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-md transition-all active:scale-95 text-center"
              >
                Beli Flash Pass Rp5.000 →
              </button>
              <button
                onClick={() => setShowPricingModal(true)}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors text-center backdrop-blur-sm"
              >
                Lihat Semua Paket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DETAIL AKUN & KEAMANAN SISTEM */}
      <div className="bg-white dark:bg-[#1E222B] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="text-emerald-500 w-5 h-5" />
          <span>Keamanan & Privasi Data Berkas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161A22] border border-slate-200/80 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Enkripsi Berkas TLS 256-bit</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Semua file yang diunggah dikirimkan melalui jalur aman terenkripsi berstandar perbankan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161A22] border border-slate-200/80 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Pembersihan Otomatis 60 Menit</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              File server-side dihapus permanen secara otomatis maksimal dalam 1 jam setelah diproses.
            </p>
          </div>
        </div>

        {onSelectView && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Jelajahi Semua Alat PDF</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
