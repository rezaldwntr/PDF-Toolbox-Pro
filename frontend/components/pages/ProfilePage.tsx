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
  FileText,
  Mail,
  Bell,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

interface ProfilePageProps {
  onSelectView?: (view: View) => void;
}

const TIER_BADGES: Record<string, { label: string; badgeCls: string; icon: React.ReactNode }> = {
  guest: { 
    label: 'Tamu (Tanpa Akun)', 
    badgeCls: 'bg-elevated text-text-secondary border-border-subtle',
    icon: <HelpCircle className="w-3.5 h-3.5 text-text-secondary" />
  },
  free: { 
    label: 'Akun Gratis', 
    badgeCls: 'bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] border-[#9B4819]/25 font-semibold',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#9B4819]" />
  },
  flash: { 
    label: '24-Hour Flash Pass', 
    badgeCls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold',
    icon: <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-current" />
  },
  monthly: { 
    label: 'Monthly Pro', 
    badgeCls: 'bg-[#9B4819]/15 text-[#9B4819] dark:text-[#E06D3B] border-[#9B4819]/30 font-bold',
    icon: <Crown className="w-3.5 h-3.5 text-[#9B4819]" />
  },
  annual: { 
    label: 'Annual VIP Pass', 
    badgeCls: 'bg-[#9B4819]/20 text-[#7E3812] dark:text-[#F29F67] border-[#9B4819]/40 font-bold',
    icon: <Sparkles className="w-3.5 h-3.5 text-[#9B4819]" />
  },
};

const ProfilePage: React.FC<ProfilePageProps> = ({ onSelectView }) => {
  const { user, isGuest, isPro, userTier, signOut, signInWithGoogle } = useAuth();
  const { quota, maxQuota, quotaUsed, maxFileSizeMB, setShowPricingModal, openCheckout } = useQuota();
  const { addToast } = useToast();

  const [acceptsMarketing, setAcceptsMarketing] = React.useState<boolean>(user?.acceptsMarketingEmails ?? true);
  const [isUpdatingMarketing, setIsUpdatingMarketing] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (user?.acceptsMarketingEmails !== undefined) {
      setAcceptsMarketing(user.acceptsMarketingEmails);
    }
  }, [user?.acceptsMarketingEmails]);

  const handleToggleMarketing = async (newVal: boolean) => {
    if (!user || isGuest) return;
    setAcceptsMarketing(newVal);
    setIsUpdatingMarketing(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ accepts_marketing_emails: newVal })
        .eq('id', user.id);

      if (error) {
        console.warn('Gagal update preferensi marketing:', error);
      }
      addToast(
        newVal 
          ? 'Anda akan menerima penawaran promo & diskon eksklusif via email.' 
          : 'Preferensi disimpan: Anda tidak akan menerima email promo.',
        'info'
      );
    } catch (err) {
      console.error('Error toggling marketing:', err);
    } finally {
      setIsUpdatingMarketing(false);
    }
  };

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
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-paper transition-all mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.fullName || 'User Avatar'} 
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-[#9B4819]/20 shadow-paper"
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#9B4819] to-[#7E3812] flex items-center justify-center text-white text-3xl font-serif font-bold shadow-paper"
                style={{ backgroundColor: '#9B4819' }}
              >
                {user?.fullName ? user.fullName[0].toUpperCase() : 'G'}
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 bg-[#314028] text-white p-1 rounded-full border-2 border-surface shadow-xs" title="Akun Aktif">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User Info & Tier */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-1.5 justify-center sm:justify-start">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                {user?.fullName || 'Pengguna Tamu'}
              </h1>
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${tierMeta.badgeCls} self-center sm:self-auto shadow-2xs`}>
                {tierMeta.icon}
                <span>{tierMeta.label}</span>
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              {user?.email ? (
                <span className="flex items-center gap-2 justify-center sm:justify-start font-medium">
                  <span>{user.email}</span>
                  <span className="text-xs text-[#314028] dark:text-emerald-400 bg-[#314028]/10 border border-[#314028]/25 px-2.5 py-0.5 rounded-full font-semibold">
                    Google Verified
                  </span>
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
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
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
                    className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper hover:shadow-paper-float transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Crown size={14} className="text-amber-200 fill-amber-200" />
                    <span>{isPro ? 'Ganti Paket' : 'Upgrade ke Pro'}</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-300 dark:border-rose-900/40 transition-colors flex items-center gap-1.5 cursor-pointer"
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
        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper flex flex-col justify-between hover:shadow-paper-float transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Kuota Harian</span>
              <div className="w-9 h-9 rounded-xl bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center">
                <Zap size={16} className="fill-[#9B4819]" />
              </div>
            </div>
            
            <div className="mb-2">
              <span className="font-sans font-extrabold text-3xl tabular-nums text-text-primary tracking-tight">
                {isPro ? 'Unlimited' : `${quota ?? 0}`}
              </span>
              {!isPro && (
                <span className="text-xs text-text-secondary font-medium ml-1">
                  / {maxQuota ?? 10} tersisa hari ini
                </span>
              )}
            </div>

            {!isPro && (
              <div className="w-full bg-elevated h-2 rounded-full overflow-hidden mb-2 border border-border-subtle/40">
                <div 
                  className="bg-[#9B4819] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, 100 - percentUsed)}%` }}
                />
              </div>
            )}
          </div>

          <p className="text-[11px] text-text-secondary flex items-center gap-1 mt-2">
            <Clock size={12} />
            <span>Reset otomatis setiap jam 00:00 WIB</span>
          </p>
        </div>

        {/* Batas Ukuran File Card */}
        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper flex flex-col justify-between hover:shadow-paper-float transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Batas Ukuran File</span>
              <div className="w-9 h-9 rounded-xl bg-[#314028]/10 text-[#314028] dark:text-emerald-400 flex items-center justify-center">
                <HardDrive size={16} />
              </div>
            </div>

            <div className="mb-1">
              <span className="font-sans font-extrabold text-3xl tabular-nums text-text-primary tracking-tight">
                {maxFileSizeMB} MB
              </span>
              <span className="text-xs text-text-secondary font-medium ml-1">per dokumen</span>
            </div>

            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Maksimal ukuran file PDF yang dapat diproses dan dikonversi sekaligus.
            </p>
          </div>

          <span className="text-[11px] text-[#314028] dark:text-emerald-400 font-semibold mt-3">
            {isPro ? '✓ Kapasitas Tinggi Aktif' : 'Tersedia hingga 500 MB di paket Pro'}
          </span>
        </div>

        {/* Batch File Processing Card */}
        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper flex flex-col justify-between hover:shadow-paper-float transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Multi-Berkas (Batch)</span>
              <div className="w-9 h-9 rounded-xl bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>

            <div className="mb-1">
              <span className="font-sans font-extrabold text-3xl tabular-nums text-text-primary tracking-tight">
                {currentConfig.maxBatchFiles} File
              </span>
              <span className="text-xs text-text-secondary font-medium ml-1">sekaligus</span>
            </div>

            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Jumlah berkas dokumen yang dapat digabungkan atau dikompresi dalam 1 klik.
            </p>
          </div>

          <span className="text-[11px] text-[#9B4819] dark:text-[#E06D3B] font-semibold mt-3">
            {isPro ? '✓ Batch Processing Prioritas' : 'Hingga 100 file di paket Annual'}
          </span>
        </div>
      </div>

      {/* 3. PROMO PRO BANNER (Jika belum Pro) */}
      {!isPro && (
        <div 
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#9B4819] via-[#853C14] to-[#5F280A] dark:from-[#2c170d] dark:via-[#21120a] dark:to-[#170c07] p-6 sm:p-8 text-white border-2 border-[#9B4819]/40 shadow-paper-float mb-8"
          style={{ backgroundColor: '#9B4819', backgroundImage: 'linear-gradient(135deg, #9B4819 0%, #853C14 50%, #5F280A 100%)' }}
        >
          {/* Subtle Decorative Glow */}
          <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-white/5 pointer-events-none blur-2xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs border border-white/20">
                <Zap size={13} className="fill-amber-300 text-amber-300" />
                <span>24-Hour Flash Pass · Hanya Rp5.000</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F1E8]">
                Butuh Proses Banyak Dokumen Hari Ini?
              </h3>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Dapatkan akses tanpa batas selama 24 jam penuh, batas berkas 100 MB, bebas iklan, dan prioritas server. Pembayaran instan via QRIS, GoPay, OVO, atau ShopeePay.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => openCheckout('flash')}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#F4F1E8] hover:bg-white text-[#9B4819] font-bold text-sm shadow-paper hover:shadow-paper-float transition-all active:scale-95 text-center cursor-pointer"
              >
                Beli Flash Pass Rp5.000 →
              </button>
              <button
                onClick={() => setShowPricingModal(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/25 transition-all text-center backdrop-blur-xs cursor-pointer"
              >
                Lihat Semua Paket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.5 PREFERENSI PENAWARAN EMAIL */}
      {!isGuest && (
        <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-paper mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#9B4819]/10 text-[#9B4819] flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-text-primary flex items-center gap-2">
                  <span>Preferensi Penawaran & Promo Khusus</span>
                  {acceptsMarketing && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border border-[#314028]/25">
                      Aktif
                    </span>
                  )}
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-xl leading-relaxed">
                  Dapatkan kode voucher diskon rahasia, promo harga khusus langganan, dan pengumuman fitur baru langsung ke <strong className="text-text-primary">{user?.email}</strong>. Anda bebas menonaktifkannya kapan saja.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={acceptsMarketing}
                disabled={isUpdatingMarketing}
                onClick={() => handleToggleMarketing(!acceptsMarketing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#9B4819]/30 ${
                  acceptsMarketing ? 'bg-[#9B4819]' : 'bg-elevated border border-border-subtle'
                } ${isUpdatingMarketing ? 'opacity-50 cursor-wait' : ''}`}
                title="Aktifkan / Nonaktifkan Penawaran Email"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    acceptsMarketing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DETAIL AKUN & KEAMANAN SISTEM */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-paper">
        <h3 className="font-serif text-lg font-bold text-text-primary mb-6 flex items-center gap-2.5">
          <ShieldCheck className="text-[#314028] dark:text-emerald-400 w-5 h-5" />
          <span>Keamanan & Privasi Data Berkas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-elevated/60 dark:bg-[#252525] border border-border-subtle">
            <h4 className="font-serif text-sm font-bold text-text-primary mb-1">Enkripsi Berkas TLS 256-bit</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Semua file yang diunggah dikirimkan melalui jalur aman terenkripsi berstandar perbankan.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-elevated/60 dark:bg-[#252525] border border-border-subtle">
            <h4 className="font-serif text-sm font-bold text-text-primary mb-1">Pembersihan Otomatis 60 Menit</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              File server-side dihapus permanen secara otomatis maksimal dalam 1 jam setelah diproses.
            </p>
          </div>
        </div>

        {onSelectView && (
          <div className="mt-8 pt-6 border-t border-border-subtle flex justify-end">
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9B4819] dark:text-[#E06D3B] hover:text-[#7E3812] hover:underline cursor-pointer group"
            >
              <span>Jelajahi Semua Alat PDF</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
