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
      <div className="bg-surface rounded-2xl border border-border-subtle p-6 shadow-paper flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#9B4819]" />
            Manajemen Harga Promo & Penawaran Khusus
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Atur potongan harga diskon untuk semua pengguna (Global) atau berikan harga promo khusus ke email pelanggan tertentu.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPromos}
            disabled={isLoadingPromos}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-elevated hover:bg-surface border border-border-subtle text-text-primary text-xs font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px] cursor-pointer shadow-2xs"
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
            <Sparkles className="w-5 h-5 text-[#9B4819]" />
          ) : (
            <Crown className="w-5 h-5 text-[#7E3812] dark:text-[#F29F67]" />
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
              className={`bg-surface rounded-2xl border ${
                promo.is_active
                  ? 'border-[#9B4819]/40 shadow-paper ring-1 ring-[#9B4819]/20'
                  : 'border-border-subtle shadow-sm opacity-90'
              } p-6 flex flex-col justify-between transition-all`}
            >
              <div>
                {/* Top Plan Info & Active Toggle */}
                <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-elevated border border-border-subtle">{icon}</div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-text-primary capitalize">
                        Paket {promo.plan_id || 'Promo'}
                      </h4>
                      <span className="text-[11px] text-text-secondary">Harga Normal: {formatIDR(basePrice)}</span>
                    </div>
                  </div>

                  {/* Switch Active */}
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${promo.is_active ? 'text-[#314028] dark:text-[#34D399]' : 'text-text-secondary'}`}>
                      {promo.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={promo.is_active}
                      onClick={() => handleTogglePromoActive(promo)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        promo.is_active ? 'bg-emerald-600' : 'bg-elevated border border-border-subtle'
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
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-elevated border border-border-subtle text-xs font-semibold text-text-primary focus:outline-none focus:border-[#9B4819]"
                    />
                  </div>

                  {/* Harga Promo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Harga Diskon (Rp)
                      </label>
                      {discountPercent > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                          Hemat {discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={promo.discount_price ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, discount_price: val } : p)));
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-elevated border border-border-subtle text-xs font-serif font-bold text-text-primary focus:outline-none focus:border-[#9B4819]"
                      />
                    </div>
                  </div>

                  {/* Banner Promo Text */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-[#9B4819]"
                    />
                  </div>

                  {/* Target Pengguna (Emails) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                        Target Akun Penerima
                      </label>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isTargeted
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                            : 'bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25'
                        }`}
                      >
                        {isTargeted ? `🎯 ${targetEmails.length} Email Khusus` : '🌐 Global (Semua User)'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-elevated border border-border-subtle space-y-2.5">
                      {/* Tombol Utama Buka Modal & Reset */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTargetModalPromo(promo)}
                          className="flex-1 py-2 px-3 rounded-xl bg-surface hover:bg-elevated text-text-primary border border-border-subtle hover:border-[#9B4819]/30 text-xs font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs min-h-[36px] cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-[#9B4819]" />
                          <span>{isTargeted ? `Ubah / Filter Target (${targetEmails.length})` : 'Pilih Target Pengguna...'}</span>
                        </button>

                        {isTargeted && (
                          <button
                            type="button"
                            onClick={() => {
                              setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: [] } : p)));
                            }}
                            title="Reset ke mode Global (Semua Pengunjung & User)"
                            className="p-2 rounded-xl bg-surface hover:bg-rose-500/10 hover:text-rose-600 text-text-secondary border border-border-subtle text-xs transition-all duration-200 active:scale-[0.95] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer shadow-2xs"
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface text-text-primary text-[10px] font-mono border border-border-subtle shadow-2xs"
                              >
                                <span className="truncate max-w-[120px]">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = targetEmails.filter((e: string) => e.toLowerCase() !== email.toLowerCase());
                                    setPromos((prev) => prev.map((p) => (p.plan_id === promo.plan_id ? { ...p, target_emails: updated } : p)));
                                  }}
                                  className="text-text-secondary hover:text-rose-500 transition-colors font-bold text-xs cursor-pointer"
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
                                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#9B4819]/10 text-[#9B4819] text-[10px] font-bold hover:underline cursor-pointer"
                              >
                                +{targetEmails.length - 5} lainnya...
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1.5 flex items-center gap-1">
                            <span>🎯</span>
                            <span>Promo HANYA berlaku untuk {targetEmails.length} akun terpilih di atas.</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#314028] dark:text-[#34D399] flex items-center gap-1">
                          <span>🌐</span>
                          <span>Promo berlaku untuk <strong>SEMUA</strong> pengunjung dan pengguna.</span>
                        </p>
                      )}

                      {/* Opsi Accordion Manual */}
                      <details className="text-[10px] text-text-secondary group pt-1 border-t border-border-subtle">
                        <summary className="cursor-pointer hover:text-text-primary select-none font-medium">
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
                            className="w-full p-2 rounded-lg bg-surface border border-border-subtle text-[10px] font-mono text-text-primary focus:outline-none focus:border-[#9B4819] leading-relaxed resize-none"
                          />
                          <span className="text-[9px] text-text-secondary">
                            Anda dapat menempelkan banyak email sekaligus dipisahkan koma di sini.
                          </span>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Simpan Promo */}
              <div className="pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => handleSavePromo(promo)}
                  disabled={savingPromoPlan === promo.plan_id}
                  className="w-full py-2.5 rounded-xl bg-[#9B4819] hover:bg-[#7E3812] text-white font-bold text-xs shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer"
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
      <div className="bg-[#9B4819]/5 border border-[#9B4819]/20 rounded-2xl p-5 text-xs space-y-2">
        <h5 className="font-serif font-bold text-text-primary flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4 text-[#9B4819]" />
          <span>Cara Kerja Promo & Penawaran Diskon</span>
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-text-secondary pt-1">
          <div className="p-3 bg-surface rounded-xl border border-border-subtle">
            <div className="font-bold text-[#9B4819] mb-1">1. Promo Global vs Tertarget</div>
            <p className="text-[11px] leading-relaxed">
              Jika kolom <em>Target Akun</em> dikosongkan, promo langsung aktif untuk semua pengunjung. Jika diisi email tertentu, harga diskon hanya muncul untuk pemilik email tersebut.
            </p>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-border-subtle">
            <div className="font-bold text-[#9B4819] mb-1">2. Sinkronisasi Midtrans Otomatis</div>
            <p className="text-[11px] leading-relaxed">
              Harga promo otomatis diterapkan pada pembuatan tagihan Midtrans Snap saat checkout, sehingga pengguna membayar sesuai nominal diskon yang Anda tetapkan.
            </p>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-border-subtle">
            <div className="font-bold text-[#9B4819] mb-1">3. Integrasi Penawaran Email</div>
            <p className="text-[11px] leading-relaxed">
              Gunakan tombol <em>"Salin Email"</em> atau <em>"Kirim Promo"</em> di tab Daftar Pengguna untuk mengabarkan diskon kepada pelanggan terdaftar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
