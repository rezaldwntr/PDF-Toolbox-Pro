import React from 'react';
import { View } from '../types';
import { useQuota } from '../contexts/QuotaContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, ShieldCheck, X, Sun, Moon, LogOut, Crown, User } from 'lucide-react';

interface HeaderProps {
  currentView: View;
  onSelectView: (view: View) => void;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free:    { label: 'Free',        cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
  flash:   { label: '⚡ Flash',    cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' },
  monthly: { label: '🚀 Pro',      cls: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' },
  annual:  { label: '👑 Annual',   cls: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400' },
};

const Header: React.FC<HeaderProps> = ({ currentView, onSelectView }) => {
  const {
    quota,
    maxQuota,
    showLimitModal,
    setShowLimitModal,
    mode,
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

  const tierBadge = user ? TIER_BADGE[user.tier] ?? TIER_BADGE.free : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#1E222B]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectView(View.HOME_TAB)}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 dark:group-hover:bg-blue-600 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15h6"/>
                <path d="M9 11h6"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">PDF Toolbox</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">Pro</span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectView(View.HOME_TAB)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.HOME_TAB
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Beranda
            </button>
            <button
              onClick={() => onSelectView(View.TOOLS_TAB)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.TOOLS_TAB
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Semua Alat
            </button>
            <button
              onClick={() => setShowPricingModal(true)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.PRICING
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Harga
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quota / Environment Badge */}
            {isPreview ? (
              <button
                onClick={() => setShowEnvModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 shadow-xs active:scale-95"
                title="Vercel Preview — Kuota bebas tanpa batas"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600 dark:bg-purple-400"></span>
                </span>
                <span className="font-bold">🧪 Preview</span>
                <span className="px-1.5 rounded bg-purple-200/70 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 font-mono text-[11px] font-bold">∞</span>
              </button>
            ) : isPro ? (
              // Pro user: tampilkan badge tier
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${tierBadge?.cls} border-current/20`}>
                <Zap size={13} className="fill-current" />
                <span>{tierBadge?.label ?? 'Pro'}</span>
              </div>
            ) : (
              // Guest / Free: tampilkan kuota counter
              <div
                onClick={() => (quota !== null && quota <= 0) ? openPaywall('quota_exhausted') : setShowEnvModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  quota === null || quota > 1
                    ? 'bg-blue-50/80 dark:bg-[#1E293B] text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-800'
                    : quota === 1
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 animate-pulse'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                }`}
              >
                <Zap size={14} className={quota === 1 ? 'fill-amber-500 text-amber-500' : quota === 0 ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'} />
                <span>
                  {quota === null
                    ? '∞ Unlimited'
                    : quota > 1
                    ? `⚡ ${quota}/${maxQuota} Hari Ini`
                    : quota === 1
                    ? `⚡ 1/${maxQuota} Tersisa`
                    : `⚡ Kuota Habis`}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={18} className="text-slate-600 transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            {/* Auth Button / User Menu */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ) : isGuest ? (
              <button
                onClick={signInWithGoogle}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-all active:scale-95"
              >
                Masuk
              </button>
            ) : (
              // User avatar + dropdown menu
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName ?? 'User'} className="w-7 h-7 rounded-full object-cover border-2 border-blue-500/30" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {user?.fullName?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-semibold text-slate-800 dark:text-white max-w-[100px] truncate">
                    {user?.fullName?.split(' ')[0] ?? 'User'}
                  </span>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#1E222B] rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-fade-in"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                      {tierBadge && (
                        <span className={`inline-flex mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBadge.cls}`}>
                          {tierBadge.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setShowPricingModal(true); }}
                      className="w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 flex items-center gap-2.5 transition-colors"
                    >
                      <Crown size={15} className="text-amber-500" />
                      Upgrade Paket
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); onSelectView(View.PROFILE_TAB); }}
                      className="w-full px-4 py-2.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <User size={15} className="text-slate-500" />
                      Profil Saya
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => { setShowUserMenu(false); signOut(); }}
                        className="w-full px-4 py-2.5 text-sm text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors"
                      >
                        <LogOut size={15} />
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

      {/* Environment Info & Switcher Modal */}
      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1E222B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setShowEnvModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isPreview
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              }`}>
                {isPreview ? <span className="text-xl">🧪</span> : <Zap size={22} className="fill-blue-500 text-blue-500" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Status Lingkungan Aplikasi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Integrasi Vercel Deployment & Pengujian</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <div className={`p-3.5 rounded-xl border ${
                isPreview
                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50'
                  : 'bg-slate-50 dark:bg-[#161A22] border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    {isPreview ? '🧪 Vercel Preview (Aktif)' : '⚡ Vercel Production (Aktif)'}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {isPreview ? 'Bebas Kuota (∞)' : `${quota ?? '∞'}/${maxQuota ?? '∞'} Kuota`}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isPreview
                    ? 'Mode pengujian aktif. Kuota konversi tidak terbatas.'
                    : `Lingkungan resmi pengguna umum. Tier aktif: ${userTier}.`}
                </p>
                {branchName && (
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Branch: <span className="font-semibold text-slate-700 dark:text-slate-200">{branchName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => { setMode('preview'); setShowEnvModal(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isPreview
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 ring-1 ring-purple-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                  <span>🧪 Mode Preview</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Bebas kuota tanpa batas</div>
              </button>
              <button
                onClick={() => { setMode('production'); setShowEnvModal(false); }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isPreview
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                  <span>⚡ Mode Production</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Simulasi batas kuota nyata</div>
              </button>
            </div>

            {!isPreview && (
              <button
                onClick={() => { resetGuestQuota(); setShowEnvModal(false); }}
                className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors border border-blue-200/60 dark:border-blue-800/40 mb-3"
              >
                🔄 Reset Kuota ke Awal (Uji Ulang Batas)
              </button>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Pengaturan disimpan di browser ini</span>
              <button onClick={() => setShowEnvModal(false)} className="font-semibold text-slate-700 dark:text-slate-200 hover:underline">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
