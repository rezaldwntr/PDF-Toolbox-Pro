import React from 'react';
import {
  Tag,
  RefreshCw,
  Zap,
  Sparkles,
  Crown,
  UserCheck,
  RotateCcw,
  Check,
} from 'lucide-react';
import { PromoSetting } from '../../../types';

interface PromosTabProps {
  promos: PromoSetting[];
  setPromos: React.Dispatch<React.SetStateAction<PromoSetting[]>>;
  isLoadingPromos: boolean;
  savingPromoPlan: string | null;
  loadPromos: () => Promise<void>;
  handleSavePromo: (promo: PromoSetting) => Promise<void>;
  handleTogglePromoActive: (promo: PromoSetting) => Promise<void>;
  setTargetModalPromo: (promo: PromoSetting | null) => void;
  formatIDR: (val: number) => string;
  defaultBasePrices: Record<string, number>;
}

export const PromosTab: React.FC<PromosTabProps> = ({
  promos,
  setPromos,
  isLoadingPromos,
  savingPromoPlan,
  loadPromos,
  handleSavePromo,
  handleTogglePromoActive,
  setTargetModalPromo,
  formatIDR,
  defaultBasePrices,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Tab Promo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            Manajemen Harga Promo & Penawaran Khusus
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Atur potongan harga diskon untuk semua pengguna (Global) atau berikan harga promo khusus ke email pelanggan tertentu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPromos}
            disabled={isLoadingPromos}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPromos ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Promo</span>
          </button>
        </div>
      </div>

      {/* Grid 3 Kartu Promo: Flash, Monthly, Annual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(promos || []).map((promo) => {
          const planId = (promo?.plan_id || 'monthly').toLowerCase();
          const basePrice = defaultBasePrices[planId] || 29000;
          const isFlash = planId === 'flash';
          const isMonthly = planId === 'monthly';

          const icon = isFlash ? (
            <Zap className="w-5 h-5 text-amber-500" />
          ) : isMonthly ? (
            <Sparkles className="w-5 h-5 text-blue-500" />
          ) : (
            <Crown className="w-5 h-5 text-purple-500" />
          );

          const originalPrice = Number(promo?.original_price) || basePrice;
          const discountPrice = Number(promo?.discount_price) || 0;
          const discountPercent =
            originalPrice > 0 && discountPrice < originalPrice
              ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
              : 0;

          const targetEmails = Array.isArray(promo?.target_emails)
            ? promo.target_emails
            : typeof promo?.target_emails === 'string'
            ? (promo.target_emails as string)
                .replace(/[{}"']/g, '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

          const isTargeted = targetEmails.length > 0;

          return (
            <div
              key={promo.plan_id || promo.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                promo.is_active
                  ? 'border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm opacity-90'
              } p-6 flex flex-col justify-between transition-all`}
            >
              <div>
                {/* Top Plan Info & Active Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{icon}</div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                        Paket {promo.plan_id || 'Promo'}
                      </h4>
                      <span className="text-[11px] text-slate-400">Harga Normal: {formatIDR(basePrice)}</span>
                    </div>
                  </div>

                  {/* Switch Active */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${promo.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {promo.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={promo.is_active}
                      onClick={() => handleTogglePromoActive(promo)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        promo.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          promo.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Promo Form Fields */}
                <div className="space-y-4 py-4">
                  {/* Judul Promo */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Judul / Label Promo
                    </label>
                    <input
                      type="text"
                      value={promo.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, title: val } : p)));
                      }}
                      placeholder="Contoh: Promo Kilat Spesial"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Harga Promo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Harga Diskon (Rp)
                      </label>
                      {discountPercent > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Hemat {discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={promo.discount_price ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, discount_price: val } : p)));
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Banner Promo Text */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Teks Banner (Ditampilkan di Checkout & Modal)
                    </label>
                    <input
                      type="text"
                      value={promo.banner_text || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, banner_text: val } : p)));
                      }}
                      placeholder="Contoh: ⚡ Diskon Spesial 40% Terbatas!"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Target Pengguna (Emails) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Target Akun Penerima
                      </label>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isTargeted
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {isTargeted ? `🎯 ${targetEmails.length} Email Khusus` : '🌐 Global (Semua User)'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      {/* Tombol Utama Buka Modal & Reset */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTargetModalPromo(promo)}
                          className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs min-h-[38px] cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{isTargeted ? `Ubah / Filter Target (${targetEmails.length})` : 'Pilih Target Pengguna...'}</span>
                        </button>

                        {isTargeted && (
                          <button
                            type="button"
                            onClick={() => {
                              setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: [] } : p)));
                            }}
                            title="Reset ke mode Global (Semua Pengunjung & User)"
                            className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 text-xs transition-all duration-200 active:scale-[0.95] min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Preview Chips Tag Email */}
                      {isTargeted ? (
                        <div>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
                            {targetEmails.slice(0, 5).map((email: string) => (
                              <span
                                key={email}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px] font-mono border border-slate-200 dark:border-slate-700 shadow-2xs"
                              >
                                <span className="truncate max-w-[120px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = targetEmails.filter((e: string) => e.toLowerCase() !== email.toLowerCase());
                                    setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: updated } : p)));
                                  }}
                                  className="text-slate-400 hover:text-rose-500 transition-colors font-bold text-xs cursor-pointer"
                                  title="Hapus email ini dari target"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                            {targetEmails.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setTargetModalPromo(promo)}
                                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold hover:underline cursor-pointer"
                              >
                                +{targetEmails.length - 5} lainnya...
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            <span>🎯</span>
                            <span>Promo HANYA terlihat & berlaku untuk {targetEmails.length} akun terpilih di atas.</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>🌐</span>
                          <span>Promo berlaku untuk <strong>SEMUA</strong> pengunjung dan pengguna.</span>
                        </p>
                      )}

                      {/* Opsi Accordion Manual */}
                      <details className="text-[10px] text-slate-400 group pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <summary className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                          ✏️ Edit Manual / Salin Daftar Teks
                        </summary>
                        <div className="mt-2 space-y-1">
                          <textarea
                            rows={2}
                            value={targetEmails.join(', ')}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const parsed = raw.split(',').map((x: string) => x.trim()).filter(Boolean);
                              setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: parsed } : p)));
                            }}
                            placeholder="Pisahkan dengan koma (misal: user1@gmail.com, user2@gmail.com)"
                            className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                          />
                          <span className="text-[9px] text-slate-400">
                            Anda dapat menempelkan banyak email sekaligus dipisahkan koma di sini.
                          </span>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan Promo */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSavePromo(promo)}
                  disabled={savingPromoPlan === promo.plan_id}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                >
                  {savingPromoPlan === promo.plan_id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Pengaturan {(promo.plan_id || 'PROMO').toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panduan & Info Cara Kerja Promo */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/40 dark:to-indigo-950/20 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Cara Kerja Promo & Penawaran Diskon:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300 pt-1">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-indigo-600 mb-1">1. Promo Global vs Tertarget</div>
            <p className="text-[11px] leading-relaxed">
              Jika kolom <em>Target Akun</em> dikosongkan, promo langsung aktif untuk semua pengunjung. Jika diisi email tertentu, harga diskon hanya muncul untuk pemilik email tersebut.
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-indigo-600 mb-1">2. Sinkronisasi Midtrans Otomatis</div>
            <p className="text-[11px] leading-relaxed">
              Harga promo otomatis diterapkan pada pembuatan tagihan Midtrans Snap saat checkout, sehingga pengguna membayar sesuai nominal diskon yang Anda tetapkan.
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="font-bold text-indigo-600 mb-1">3. Integrasi Penawaran Email</div>
            <p className="text-[11px] leading-relaxed">
              Gunakan tombol <em>"Salin Email Promo"</em> atau <em>"Kirim Promo"</em> di tab Daftar Pengguna untuk mengabarkan kode atau diskon kepada pengguna yang bersedia menerima email penawaran.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
