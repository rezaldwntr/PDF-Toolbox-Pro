import React from 'react';
import { Layers } from 'lucide-react';
import { formatFileSize, formatDateTimeIndonesia } from '../../../lib/formatters';

interface LogsTabProps {
  toolLogs: any[];
  logToolFilter: string;
  setLogToolFilter: (val: string) => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  toolLogs,
  logToolFilter,
  setLogToolFilter,
}) => {
  const filteredLogs = toolLogs.filter((log) => {
    if (logToolFilter === 'all') return true;
    return (log.tool_name || '').toLowerCase().includes(logToolFilter.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Riwayat Eksekusi Alat PDF (Realtime Telemetry)
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter Alat:</span>
          <select
            value={logToolFilter}
            onChange={(e) => setLogToolFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Alat</option>
            <option value="merge">Gabungkan (Merge)</option>
            <option value="split">Pisahkan (Split)</option>
            <option value="compress">Kompres</option>
            <option value="word">PDF ke Word</option>
            <option value="ocr">OCR PDF</option>
            <option value="watermark">Watermark</option>
            <option value="translate">Terjemahkan</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Waktu</th>
              <th className="px-5 py-3.5">Nama Alat</th>
              <th className="px-5 py-3.5">Tipe Pengguna</th>
              <th className="px-5 py-3.5">Ukuran Berkas</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="px-5 py-3.5 font-mono text-slate-500">
                    {formatDateTimeIndonesia(log.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white capitalize">
                    {log.tool_name}
                  </td>
                  <td className="px-5 py-3.5">
                    {log.is_guest ? (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                        Tamu (Guest / Tanpa Login)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                        {log.user_email || 'Member Login'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                    {formatFileSize(log.file_size_bytes)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                        (log.status || '').toLowerCase() === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Belum ada rekaman eksekusi alat di tabel tool_usages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
