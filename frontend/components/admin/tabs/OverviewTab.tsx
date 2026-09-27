import React from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

interface OverviewTabProps {
  stats: any;
  formatIDR: (val: number) => string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ stats, formatIDR }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visualisasi Peringkat Alat Paling Sering Dipakai (2 Kolom) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Peringkat Alat PDF Terpopuler
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Frekuensi pemrosesan berkas oleh pengguna tamu maupun terdaftar
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            Top 10 Alat
          </span>
        </div>

        {stats?.usages?.top_tools && stats.usages.top_tools.length > 0 ? (
          <div className="space-y-3.5">
            {stats.usages.top_tools.map((item: any, idx: number) => {
              const maxCount = stats.usages.top_tools[0]?.count || 1;
              const barWidth = Math.max(8, (item.count / maxCount) * 100);

              return (
                <div key={item.tool_name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 capitalize">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {item.tool_name.replace(/-/g, ' ')}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {item.count} file ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            Belum ada rekaman eksekusi alat di database. Log akan muncul otomatis saat ada pengunjung yang menggunakan alat PDF.
          </div>
        )}
      </div>

      {/* Rekomendasi Pengembangan Bisnis & Konversi (1 Kolom) */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-700/30">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Wawasan Pengembangan Produk
          </div>
          <h4 className="text-lg font-bold mt-2">
            Optimasi Monetisasi & Server
          </h4>
          <p className="text-xs text-indigo-100/80 mt-2 leading-relaxed">
            Dari total <strong>{stats?.usages?.total_operations ?? 0}</strong> operasi berkas, sebanyak <strong>{stats?.usages?.guest_percentage ?? 0}%</strong> dilakukan oleh pengguna tamu.
          </p>
          <div className="mt-4 pt-4 border-t border-indigo-700/50 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-indigo-400">✓</span>
              <span>Tampilkan penawaran Flash Pass Rp5.000 saat kuota tamu habis untuk konversi instan.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-400">✓</span>
              <span>Alat teratas layak ditempatkan di bagian paling atas beranda (Hero/Featured).</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Distribusi Omset Berdasarkan Paket
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <span className="font-semibold text-amber-700 dark:text-amber-300">24-Hour Flash Pass (Rp5.000)</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {formatIDR(stats?.revenue?.by_plan?.flash ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <span className="font-semibold text-blue-700 dark:text-blue-300">Monthly Pro (Rp29.000)</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {formatIDR(stats?.revenue?.by_plan?.monthly ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/5 border border-purple-500/15">
              <span className="font-semibold text-purple-700 dark:text-purple-300">Annual Pass (Rp149.000)</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {formatIDR(stats?.revenue?.by_plan?.annual ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
