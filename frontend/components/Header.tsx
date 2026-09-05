import React from 'react';
import { View } from '../types';
import { useQuota } from '../contexts/QuotaContext';
import { useTheme } from '../contexts/ThemeContext';
import { Zap, ShieldCheck, X, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentView: View;
  onSelectView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onSelectView }) => {
  const { 
    quota, 
    maxQuota, 
    guestQuota,
    showLimitModal, 
    setShowLimitModal, 
    mode, 
    isPreview, 
    branchName, 
    setMode, 
    toggleMode, 
    resetGuestQuota 
  } = useQuota();
  const { theme, toggleTheme } = useTheme();
  const [showEnvModal, setShowEnvModal] = React.useState<boolean>(false);

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
              onClick={() => onSelectView(View.ABOUT)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === View.ABOUT
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tentang
            </button>
          </nav>

          {/* Right Actions: Environment & Quota Tracker, Theme Switcher & Login Prompt */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Environment & Quota Indicator */}
            {isPreview ? (
              // Badge Khusus Mode Vercel Preview (Bebas Kuota Uji Coba)
              <button
                onClick={() => setShowEnvModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 shadow-xs active:scale-95"
                title="Vercel Preview Environment Aktif: Kuota bebas tanpa batas. Klik untuk opsi lingkungan."
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600 dark:bg-purple-400"></span>
                </span>
                <span className="font-bold">🧪 Preview</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-200/70 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 font-mono text-[11px] font-bold">
                  Bebas Kuota (∞)
                </span>
              </button>
            ) : (
              // Badge Mode Vercel Production (Kuota Tamu 3x Normal)
              <div 
                onClick={() => quota === 0 ? setShowLimitModal(true) : setShowEnvModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  quota >= 2 
                    ? 'bg-blue-50/80 dark:bg-[#1E293B] text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-800' 
                    : quota === 1
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 animate-pulse'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                }`}
                title="Kuota konversi gratis harian pengguna tamu (Klik untuk info lingkungan)"
              >
                <Zap size={14} className={quota === 1 ? 'fill-amber-500 text-amber-500' : quota === 0 ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'} />
                <span>
                  {quota > 1 
                    ? `⚡ ${quota}/${maxQuota} Kuota Hari Ini` 
                    : quota === 1 
                    ? `⚡ 1/${maxQuota} Kuota Tersisa` 
                    : `⚡ Kuota Habis (0/${maxQuota})`}
                </span>
              </div>
            )}

            {/* Theme Toggle Button (Section 6.1) */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400 transition-transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon size={18} className="text-slate-600 transition-transform rotate-0 hover:-rotate-12" />
              )}
            </button>

            <button
              onClick={() => setShowLimitModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-all active:scale-95"
            >
              Masuk
            </button>
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
                {isPreview ? (
                  <span className="text-xl">🧪</span>
                ) : (
                  <Zap size={22} className="fill-blue-500 text-blue-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Status Lingkungan Aplikasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Integrasi Vercel Deployment & Pengujian
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="space-y-3 mb-5">
              <div className={`p-3.5 rounded-xl border ${
                isPreview 
                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50' 
                  : 'bg-slate-50 dark:bg-[#161A22] border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    {isPreview ? '🧪 Lingkungan Vercel Preview (Aktif)' : '⚡ Lingkungan Vercel Production (Aktif)'}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {isPreview ? 'Bebas Kuota (∞)' : `${guestQuota}/3 Kuota Tersisa`}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isPreview 
                    ? 'Digunakan khusus untuk menguji fitur lama, update, dan fitur baru yang sedang dibuat. Kuota konversi tidak terbatas agar pengujian berjalan lancar.'
                    : 'Lingkungan resmi untuk pengguna umum dengan aturan batas kuota 3 konversi per hari bagi tamu.'}
                </p>
                {branchName && (
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Branch: <span className="font-semibold text-slate-700 dark:text-slate-200">{branchName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Switcher Options */}
            <div className="space-y-2.5 mb-5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Peralihan Cepat (Untuk Pengujian):
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMode('preview');
                    setShowEnvModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isPreview 
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 ring-1 ring-purple-500' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                    <span>🧪 Mode Preview</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bebas kuota tanpa batas
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMode('production');
                    setShowEnvModal(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    !isPreview 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                    <span>⚡ Mode Production</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Simulasi batas 3x tamu
                  </div>
                </button>
              </div>

              {!isPreview && (
                <button
                  onClick={() => {
                    resetGuestQuota();
                    setShowEnvModal(false);
                  }}
                  className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors border border-blue-200/60 dark:border-blue-800/40"
                >
                  🔄 Reset Kuota Produksi ke 3/3 (Uji Ulang Batas)
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Pengaturan disimpan di browser ini</span>
              <button
                onClick={() => setShowEnvModal(false)}
                className="font-semibold text-slate-700 dark:text-slate-200 hover:underline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Limit Modal (Section 4.3) */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1E222B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Zap size={24} className="fill-amber-500" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {quota === 0 
                ? "Batas 3 konversi gratis tercapai hari ini" 
                : "Akses Tanpa Batas dengan Akun"}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Pengguna tamu dibatasi hingga 3 kali konversi per hari. Masuk untuk menikmati konversi tanpa batas, batas ukuran berkas hingga 100 MB, dan unduhan berkecepatan tinggi.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  alert("Fitur login Google akan segera diaktifkan!");
                  setShowLimitModal(false);
                }}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[#161A22] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Masuk dengan Google
              </button>

              {/* Developer / Tester Switcher Link */}
              <div className="pt-2 text-center">
                <button
                  onClick={() => {
                    setMode('preview');
                    setShowLimitModal(false);
                  }}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  🧪 Sedang menguji fitur? Beralih ke Mode Preview (Bebas Kuota)
                </button>
              </div>

              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Nanti saja
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Privasi berkas terjamin & dihapus otomatis 60 menit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
