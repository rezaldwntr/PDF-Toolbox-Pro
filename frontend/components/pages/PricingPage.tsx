import React, { useState, useEffect } from "react";
import { View, UserTier, PromoSetting } from "../../types";
import { useQuota } from "../../contexts/QuotaContext";
import { useAuth, TIER_RANK } from "../../contexts/AuthContext";
import { Check, ArrowLeft, Zap, Star, Crown, Gift } from "lucide-react";
import { fetchPromoSettings, calculateEffectivePrice } from "../../lib/promo";

interface PricingPageProps {
  onSelectView: (view: View) => void;
}

import { PLANS, COMPARE_ROWS } from "../../lib/plans";
import { formatRupiah } from "../../lib/formatters";

const renderPlanIcon = (iconName: string) => {
  switch (iconName) {
    case "Zap": return <Zap className="w-6 h-6" />;
    case "Star": return <Star className="w-6 h-6" />;
    case "Crown": return <Crown className="w-6 h-6" />;
    case "Gift":
    default:
      return <Gift className="w-6 h-6" />;
  }
};


const PricingPage: React.FC<PricingPageProps> = ({ onSelectView }) => {
  const { openCheckout, setShowPricingModal } = useQuota();
  const { user, isGuest, signInWithGoogle, userTier } = useAuth();
  const [promos, setPromos] = useState<PromoSetting[]>([]);
  const currentRank = TIER_RANK[userTier] || 0;

  useEffect(() => {
    fetchPromoSettings().then(setPromos);
  }, []);

  const handleCTA = async (planId: string) => {
    if (planId === "free") {
      if (isGuest) await signInWithGoogle();
    } else {
      openCheckout(planId as any);
    }
  };

  return (
    <div className="animate-fade-in py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Back button */}
      <button
        onClick={() => onSelectView(View.HOME_TAB)}
        className="group inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#1E222B] border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
      >
        <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
        Kembali ke Beranda
      </button>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
          Pilih Paket yang <span className="text-blue-600">Tepat</span> untuk Kamu
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Mulai gratis, bayar hanya saat butuh. Tidak ada langganan paksa, tidak ada biaya tersembunyi.
          Kompetitor global seperti iLovePDF dan Smallpdf mematok Rp110.000–Rp140.000/bulan — kami tawarkan fungsi serupa dengan harga 75% lebih terjangkau.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {PLANS.map(plan => {
          const planRank = TIER_RANK[plan.id as UserTier] || 0;
          const isActive = plan.id === userTier || (plan.id === "free" && userTier === "guest");
          const isLower = currentRank > planRank && !isGuest && userTier !== "free";
          const isUpgrade = planRank > currentRank && currentRank > 1;

          const eff = plan.id === "free"
            ? { price: 0, originalPrice: 0, isPromo: false, discountPercent: 0, bannerText: "" }
            : calculateEffectivePrice(plan.id, user?.email, promos);

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 flex flex-col border transition-all ${
                plan.highlight && !isLower
                  ? "bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-transparent shadow-2xl shadow-blue-500/30 scale-[1.02]"
                  : "bg-white dark:bg-[#1E222B] border-slate-200 dark:border-slate-700 shadow-sm"
              } ${isActive ? "ring-2 ring-emerald-500" : ""} ${isLower ? "opacity-80" : ""}`}
            >
              {plan.badge && !isLower && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs ${
                  plan.id === "flash" ? "bg-amber-400 text-amber-900" : "bg-purple-500 text-white"
                }`}>
                  {plan.badge}
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3.5 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Aktif
                </div>
              )}
              {isLower && (
                <div className="absolute -top-3.5 right-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Sudah Termasuk
                </div>
              )}

              {/* Icon + Name */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                plan.highlight && !isLower ? "bg-white/20 text-white" : plan.iconBg
              }`}>
                {renderPlanIcon(plan.iconName)}
              </div>
              <h3 className={`font-bold text-base mb-1 ${plan.highlight && !isLower ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {plan.name}
              </h3>

              {/* Dynamic Promo Pricing */}
              <div className="mb-0.5">
                {eff.isPromo ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`line-through text-sm font-semibold ${plan.highlight && !isLower ? "text-blue-200" : "text-slate-400"}`}>
                        {formatRupiah(eff.originalPrice)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white uppercase tracking-wider">
                        Promo -{eff.discountPercent}%
                      </span>
                    </div>
                    <p className={`text-3xl font-extrabold ${plan.highlight && !isLower ? "text-white" : "text-slate-900 dark:text-white"}`}>
                      {formatRupiah(eff.price)}
                    </p>
                  </div>
                ) : (
                  <p className={`text-3xl font-extrabold ${plan.highlight && !isLower ? "text-white" : "text-slate-900 dark:text-white"}`}>
                    {plan.price}
                  </p>
                )}
              </div>

              <p className={`text-xs mb-3 ${plan.highlight && !isLower ? "text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>
                {plan.priceNote}
              </p>
              {eff.isPromo && eff.bannerText && (
                <div className="mb-4 px-2.5 py-1.5 rounded-xl bg-amber-400/20 text-amber-200 text-xs font-bold text-center">
                  {eff.bannerText}
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${plan.highlight && !isLower ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}`}>
                    <Check size={14} className={`mt-0.5 shrink-0 ${plan.highlight && !isLower ? "text-blue-300" : "text-emerald-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCTA(plan.id)}
                disabled={isLower || (isActive && plan.id !== "free") || (isActive && plan.id === "free" && !isGuest)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-98 ${
                  isLower
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                    : isActive && plan.id !== "free"
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default"
                    : isActive && plan.id === "free" && !isGuest
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-default"
                    : plan.highlight
                    ? "bg-white text-blue-700 hover:bg-blue-50"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isLower
                  ? "Sudah Termasuk ✓"
                  : isActive && plan.id !== "free"
                  ? "✓ Paket Aktif"
                  : isActive && plan.id === "free" && !isGuest
                  ? "✓ Paket Saat Ini"
                  : isUpgrade
                  ? `Upgrade ke ${plan.name} →`
                  : plan.cta}
              </button>
              <p className={`text-[11px] text-center mt-2 ${plan.highlight && !isLower ? "text-blue-300" : "text-slate-400 dark:text-slate-500"}`}>
                {isLower ? "Fasilitas sudah aktif di akun Anda" : plan.note}
              </p>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-[#1E222B] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-12">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Perbandingan Lengkap Paket</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-1/3">Fitur</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Gratis</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Flash Pass</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Monthly Pro</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {COMPARE_ROWS.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{row.free}</td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">{row.flash}</td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-600 dark:text-blue-400">{row.monthly}</td>
                  <td className="px-4 py-3 text-center font-semibold text-purple-600 dark:text-purple-400">{row.annual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footnote Ukuran File */}
        <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30">
          <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
            <span className="font-bold">✓ Kapasitas Cloud Storage Aktif:</span>{" "}
            Didukung arsitektur Google Cloud Storage (GCS) Direct Upload, pengguna Monthly Pro kini dapat memproses berkas hingga <strong>250 MB</strong> dan Annual Pass hingga <strong>500 MB</strong> tanpa batasan gateway HTTP.
          </p>
        </div>
      </div>


      {/* FAQ Bottom */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <p>Semua pembayaran aman via QRIS / GoPay / OVO / Dana &nbsp;·&nbsp; Tidak ada auto-renew &nbsp;·&nbsp; Data berkas dihapus otomatis</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Dengan membeli, Anda menyetujui{' '}
          <button
            type="button"
            onClick={() => onSelectView(View.TERMS)}
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium"
          >
            Syarat & Ketentuan
          </button>{' '}
          serta{' '}
          <button
            type="button"
            onClick={() => onSelectView(View.PRIVACY)}
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 font-medium"
          >
            Kebijakan Privasi
          </button>
          .
        </p>
      </div>
    </div>
  );
};

export default PricingPage;
