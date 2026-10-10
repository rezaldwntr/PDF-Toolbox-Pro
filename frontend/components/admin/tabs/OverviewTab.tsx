import React from 'react';
import { TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface OverviewTabProps {
  stats: any;
  formatIDR: (val: number) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, formatIDR }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Visualisasi Peringkat Alat Paling Sering Dipakai (2 Kolom) */}
      <div className="lg:col-span-2 bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#9B4819]" />
              Peringkat Alat PDF Terpopuler
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Frekuensi pemrosesan berkas oleh pengguna tamu maupun terdaftar.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-elevated border border-border-subtle text-text-secondary font-medium">
            Top 10 Alat
          </span>
        </div>

        {stats?.usages?.top_tools && stats.usages.top_tools.length > 0 ? (
          <div className="space-y-4">
            {stats.usages.top_tools.map((item: any, idx: number) => {
              const maxCount = stats.usages.top_tools[0]?.count || 1;
              const barWidth = Math.max(8, (item.count / maxCount) * 100);

              return (
                <div key={item.tool_name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary flex items-center gap-2 capitalize">
                      <span className="w-5 h-5 rounded-md bg-elevated border border-border-subtle text-text-secondary flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {item.tool_name.replace(/-/g, ' ')}
                    </span>
                    <span className="text-text-secondary font-medium">
                      {item.count} file ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-elevated overflow-hidden border border-border-subtle/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9B4819] via-[#C85A17] to-[#D97706] transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-text-secondary text-sm">
            Belum ada rekaman eksekusi alat di database. Log akan muncul otomatis saat ada pengunjung yang menggunakan alat PDF.
          </div>
        )}
      </div>

      {/* Rekomendasi Pengembangan Bisnis & Konversi (1 Kolom) */}
      <div className="space-y-6">
        <div className="bg-[#9B4819]/10 dark:bg-[#251812] border border-[#9B4819]/25 p-6 rounded-2xl shadow-paper relative overflow-hidden">
          <div className="flex items-center gap-2 text-[#9B4819] dark:text-[#E06D3B] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wawasan Pengembangan Produk</span>
          </div>
          <h4 className="font-serif text-lg font-bold text-text-primary mt-2">
            Optimasi Monetisasi & Server
          </h4>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            Dari total <strong className="text-text-primary font-bold">{stats?.usages?.total_operations ?? 0}</strong> operasi berkas, sebanyak <strong className="text-text-primary font-bold">{stats?.usages?.guest_percentage ?? 0}%</strong> dilakukan oleh pengguna tamu.
          </p>
          <div className="mt-4 pt-4 border-t border-[#9B4819]/20 space-y-2.5 text-xs text-text-secondary">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#9B4819] shrink-0 mt-0.5" />
              <span>Tampilkan penawaran Flash Pass Rp5.000 saat kuota tamu habis untuk konversi instan.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#9B4819] shrink-0 mt-0.5" />
              <span>Alat teratas layak ditempatkan di bagian paling atas beranda (Hero / Featured).</span>
            </div>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper">
          <h4 className="font-serif text-sm font-bold text-text-primary mb-3.5">
            Distribusi Omset Berdasarkan Paket
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="font-semibold text-amber-800 dark:text-amber-300">24-Hour Flash Pass (Rp5.000)</span>
              <span className="font-serif font-bold text-text-primary">
                {formatIDR(stats?.revenue?.by_plan?.flash ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#9B4819]/10 border border-[#9B4819]/20">
              <span className="font-semibold text-[#9B4819] dark:text-[#E06D3B]">Monthly Pro (Rp29.000)</span>
              <span className="font-serif font-bold text-text-primary">
                {formatIDR(stats?.revenue?.by_plan?.monthly ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#9B4819]/15 border border-[#9B4819]/30">
              <span className="font-bold text-[#7E3812] dark:text-[#F29F67]">Annual Pass (Rp149.000)</span>
              <span className="font-serif font-bold text-text-primary">
                {formatIDR(stats?.revenue?.by_plan?.annual ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
