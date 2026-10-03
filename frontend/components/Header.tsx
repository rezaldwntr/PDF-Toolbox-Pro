import React from 'react';
import { View } from '../types';
import { useQuota } from '../contexts/QuotaContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Zap, 
  ShieldCheck, 
  X, 
  Sun, 
  Moon, 
  LogOut, 
  Crown, 
  User, 
  Download, 
  WifiOff, 
  Search 
} from 'lucide-react';
import { usePwa } from '../lib/pwa';
import CommandBarModal from './common/CommandBarModal';

interface HeaderProps {
  currentView: View;
  onSelectView: (view: View) => void;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free:    { label: 'FREE',        cls: 'bg-elevated text-text-secondary border-border-subtle' },
  flash:   { label: 'FLASH PASS',  cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold' },
  monthly: { label: 'PRO',         cls: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30 font-bold' },
  annual:  { label: 'ANNUAL PRO',  cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold' },
};

/** Pemetaan breadcrumb aktif sesuai Design Bible Section 2.1 */
const getViewBreadcrumb = (v: View): { group: string; name: string } => {
  switch (v) {
    case View.HOME_TAB: return { group: 'Platform', name: 'Beranda' };
    case View.TOOLS_TAB: return { group: 'Katalog', name: 'Semua Alat' };
    case View.PRICING: return { group: 'Paket', name: 'Harga' };
    case View.PROFILE_TAB: return { group: 'Akun', name: 'Profil' };
    case View.ADMIN_DASHBOARD: return { group: 'Admin', name: 'Dasbor Telemetri' };
    case View.DEVELOPER_API: return { group: 'Developer', name: 'B2B Micro-API' };
    case View.MERGE: return { group: 'Workspace', name: 'Gabungkan PDF' };
    case View.SPLIT: return { group: 'Workspace', name: 'Pisahkan PDF' };
    case View.COMPRESS: return { group: 'Workspace', name: 'Kompres PDF' };
    case View.PDF_TO_WORD: return { group: 'Workspace', name: 'PDF ke Word' };
    case View.PDF_TO_EXCEL: return { group: 'Workspace', name: 'PDF ke Excel' };
    case View.PDF_TO_PPT: return { group: 'Workspace', name: 'PDF ke PPT' };
    case View.PDF_TO_IMAGE: return { group: 'Workspace', name: 'PDF ke JPG' };
    case View.PDF_A: return { group: 'Workspace', name: 'PDF/A Converter' };
    case View.ORGANIZE: return { group: 'Workspace', name: 'Atur Halaman' };
    case View.ADD_TEXT: return { group: 'Workspace', name: 'Tambah Teks' };
    case View.EDIT_PDF: return { group: 'Workspace', name: 'Edit Teks PDF' };
    case View.ADD_SIGNATURE: return { group: 'Workspace', name: 'Tanda Tangan & e-Meterai' };
    case View.CROP_PDF: return { group: 'Workspace', name: 'Potong PDF' };
    case View.WATERMARK: return { group: 'Workspace', name: 'Cap Air' };
    case View.PROTECT_PDF: return { group: 'Workspace', name: 'Proteksi Sandi' };
    case View.UNLOCK_PDF: return { group: 'Workspace', name: 'Buka Kunci' };
    case View.OCR_PDF: return { group: 'Workspace', name: 'OCR Dokumen' };
    case View.TRANSLATE_PDF: return { group: 'Workspace', name: 'Terjemahkan Dokumen' };
    case View.BANK_STATEMENT: return { group: 'Workspace', name: 'Bank Statement Parser' };
    case View.REDACT_PDF: return { group: 'Workspace', name: 'Sensor PII (UU PDP)' };
    case View.BLOG: return { group: 'Informasi', name: 'Artikel & Panduan' };
    case View.FAQ: return { group: 'Informasi', name: 'Tanya Jawab' };
    case View.PRIVACY: return { group: 'Legal', name: 'Privasi' };
    case View.TERMS: return { group: 'Legal', name: 'Syarat & Ketentuan' };
    case View.ABOUT: return { group: 'Informasi', name: 'Tentang' };
    case View.CONTACT: return { group: 'Dukungan', name: 'Kontak' };
    default: return { group: 'Platform', name: 'Beranda' };
  }
};

const Header: React.FC<HeaderProps> = ({ currentView, onSelectView }) => {
  const {
    quota,
    maxQuota,
    isPreview,
    branchName,
    setMode,
    resetGuestQuota,
    setShowPricingModal,
    openPaywall,
  } = useQuota();
  const { user, isGuest, isPro, userTier, signInWithGoogle, signOut, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showEnvModal, setShowEnvModal] = React.useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = React.useState<boolean>(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = React.useState<boolean>(false);
  const { isOnline, isInstallable, isInstalled, promptInstall } = usePwa();

  const isAdmin = user?.email?.toLowerCase().trim() === 'rezaldewantara@gmail.com';
  const tierBadge = user ? TIER_BADGE[user.tier] ?? TIER_BADGE.free : null;
  const breadcrumb = getViewBreadcrumb(currentView);

  // Shortcut global: Cmd+K / Ctrl+K membuka dialog command bar modal (Design Bible Section 2.1 & 7.3)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandBarOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border-subtle transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          
          {/* Left Section: Logo geometris taktil 45° + Breadcrumb */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => onSelectView(View.HOME_TAB)}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              {/* Ikon dokumen lipatan 45° presisi taktil */}
              <div className="w-8 h-8 rounded-lg bg-accent-primary text-white flex items-center justify-center shadow-xs group-hover:bg-accent-hover transition-colors shrink-0">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="13" y2="17"/>
                </svg>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-text-primary">PDF Toolbox</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                  Pro
                </span>
              </div>
            </div>

            {/* Chip Breadcrumb aktif (Section 2.1) */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-text-secondary select-none pl-3 border-l border-border-subtle">
              <span className="text-text-secondary/70 font-medium">{breadcrumb.group}</span>
              <span className="text-text-secondary/40">/</span>
              <span className="px-2 py-0.5 rounded-md bg-elevated text-text-primary font-semibold text-[11px] border border-border-subtle">
                {breadcrumb.name}
              </span>
            </div>
          </div>

          {/* Center Section: Raycast Command Bar Trigger (⌘K) & Nav Links */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setIsCommandBarOpen(true)}
              className="flex items-center justify-between w-56 lg:w-68 px-3 py-1.5 rounded-lg bg-elevated border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary transition-all text-xs cursor-pointer group shadow-2xs"
              title="Cari perkakas atau ketik perintah (⌘K / Ctrl+K)"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Search size={14} className="text-text-secondary group-hover:text-accent-primary shrink-0 transition-colors" />
                <span className="truncate text-xs font-normal">Cari perkakas...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-border-subtle text-text-secondary shrink-0 font-medium">
                <span>⌘</span>K
              </kbd>
            </button>

            {/* Navigasi Utama */}
            <nav className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectView(View.HOME_TAB)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === View.HOME_TAB
                    ? 'text-accent-primary bg-accent-primary/10 font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                Beranda
              </button>
              <button
                onClick={() => onSelectView(View.TOOLS_TAB)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === View.TOOLS_TAB
                    ? 'text-accent-primary bg-accent-primary/10 font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                Semua Alat
              </button>
              <button
                onClick={() => setShowPricingModal(true)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  currentView === View.PRICING
                    ? 'text-accent-primary bg-accent-primary/10 font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                }`}
              >
                Harga
              </button>
              {isAdmin && (
                <button
                  onClick={() => onSelectView(View.ADMIN_DASHBOARD)}
                  className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                    currentView === View.ADMIN_DASHBOARD
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Actions: Quota Pill, Theme Toggle, Auth, PWA */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* PWA Install Button */}
            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={promptInstall}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/30 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
                title="Pasang aplikasi PDF Toolbox Pro di perangkat Anda"
              >
                <Download size={13} className="stroke-[2.5]" />
                <span>Pasang App</span>
              </button>
            )}

            {/* Offline Status Pill */}
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <WifiOff size={13} className="animate-pulse" />
                <span>Offline</span>
              </div>
            )}

            {/* Quota / Environment Badge */}
            {isPreview ? (
              <button
                onClick={() => setShowEnvModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20 shadow-2xs active:scale-95"
                title="Vercel Preview — Kuota bebas tanpa batas"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600 dark:bg-purple-400"></span>
                </span>
                <span className="font-bold text-[11px]">Preview</span>
                <span className="px-1 rounded bg-purple-200/70 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 font-mono text-[10px] font-bold">∞</span>
              </button>
            ) : isPro ? (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${tierBadge?.cls}`}>
                <Zap size={12} className="fill-current" />
                <span className="text-[11px] font-bold">{tierBadge?.label ?? 'PRO'}</span>
              </div>
            ) : (
              <div
                onClick={() => (quota !== null && quota <= 0) ? openPaywall('quota_exhausted') : setShowPricingModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  quota === null || quota > 1
                    ? 'bg-elevated text-text-primary border-border-subtle hover:border-border-strong'
                    : quota === 1
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
                title="Kuota harian berkas gratis"
              >
                <Zap size={12} className={quota === 1 ? 'fill-amber-500 text-amber-500' : quota === 0 ? 'text-rose-500' : 'text-accent-primary'} />
                <span className="text-[11px] font-bold">
                  {quota === null
                    ? '∞ Unlimited'
                    : quota > 1
                    ? `${quota}/${maxQuota} Gratis`
                    : quota === 1
                    ? `1/${maxQuota} Tersisa`
                    : `Kuota Habis`}
                </span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-surface border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs"
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={16} className="text-text-secondary transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            {/* Auth Button / User Menu */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-elevated animate-pulse" />
            ) : isGuest ? (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[38px] rounded-lg text-xs font-bold bg-accent-primary hover:bg-accent-hover text-white shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              >
                Masuk
              </button>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 min-h-[38px] rounded-lg bg-surface border border-border-subtle hover:border-border-strong transition-all duration-200 active:scale-98 cursor-pointer shadow-2xs"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName ?? 'User'} className="w-6 h-6 rounded-full object-cover border border-accent-primary/40" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center text-white text-[10px] font-bold">
                      {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-semibold text-text-primary max-w-[85px] truncate">
                    {user?.fullName?.split(' ')[0] ?? 'User'}
                  </span>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl shadow-xl border border-border-subtle py-2 z-50 animate-fade-in"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-border-subtle">
                      <p className="text-xs font-bold text-text-primary truncate">{user?.fullName}</p>
                      <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>
                      {tierBadge && (
                        <span className={`inline-flex mt-1.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${tierBadge.cls}`}>
                          {tierBadge.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowPricingModal(true); }}
                      className="w-full px-4 py-2 text-xs text-left text-text-primary hover:bg-elevated flex items-center gap-2 transition-colors font-medium"
                    >
                      <Crown size={14} className="text-amber-500" />
                      Upgrade Paket
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); onSelectView(View.PROFILE_TAB); }}
                      className="w-full px-4 py-2 text-xs text-left text-text-primary hover:bg-elevated flex items-center gap-2 transition-colors font-medium"
                    >
                      <User size={14} className="text-text-secondary" />
                      Profil Saya
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowUserMenu(false); onSelectView(View.ADMIN_DASHBOARD); }}
                        className="w-full px-4 py-2 text-xs text-left text-indigo-600 dark:text-indigo-400 hover:bg-elevated flex items-center gap-2 transition-colors font-bold"
                      >
                        <ShieldCheck size={14} />
                        Dasbor Admin
                      </button>
                    )}
                    <div className="border-t border-border-subtle mt-1 pt-1">
                      <button
                        onClick={() => { setShowUserMenu(false); signOut(); }}
                        className="w-full px-4 py-2 text-xs text-left text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut size={14} />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Environment Info & Switcher Modal (Hanya ada di Vercel Preview) */}
      {isPreview && showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-subtle relative">
            <button
              type="button"
              onClick={() => setShowEnvModal(false)}
              aria-label="Tutup Modal Status"
              className="absolute top-4 right-4 p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated transition-all active:scale-95"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
                🧪
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Status Lingkungan Aplikasi</h3>
                <p className="text-xs text-text-secondary">Integrasi Vercel Deployment & Pengujian</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className="p-3.5 rounded-xl border bg-elevated border-border-subtle">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    🧪 Vercel Preview (Aktif)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Bebas Kuota (∞)
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Mode pengujian aktif. Kuota konversi tidak terbatas untuk pengujian fitur baru.
                </p>
                {branchName && (
                  <div className="mt-2 text-[11px] text-text-secondary font-mono">
                    Branch: <span className="font-semibold text-text-primary">{branchName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => { setMode('preview'); setShowEnvModal(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isPreview
                    ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                    : 'border-border-subtle hover:border-border-strong'
                }`}
              >
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 mb-0.5">
                  <span>🧪 Mode Preview</span>
                </div>
                <div className="text-[11px] text-text-secondary">Bebas kuota tanpa batas</div>
              </button>
              <button
                onClick={() => { setMode('production'); setShowEnvModal(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isPreview
                    ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary'
                    : 'border-border-subtle hover:border-border-strong'
                }`}
              >
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5 mb-0.5">
                  <span>⚡ Mode Production</span>
                </div>
                <div className="text-[11px] text-text-secondary">Simulasi batas kuota nyata</div>
              </button>
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
              <span>Pengaturan disimpan di browser ini</span>
              <button onClick={() => setShowEnvModal(false)} className="font-semibold text-text-primary hover:underline">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Bar Modal (⌘K / Ctrl+K) */}
      <CommandBarModal
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
        onSelectView={onSelectView}
      />
    </>
  );
};

export default Header;
