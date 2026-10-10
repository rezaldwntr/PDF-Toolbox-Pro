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
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-paper overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-3">
        <h3 className="font-serif text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#9B4819]" />
          Riwayat Eksekusi Alat PDF (Realtime Telemetry)
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Filter Alat:</span>
          <select
            value={logToolFilter}
            onChange={(e) => setLogToolFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-elevated border border-border-subtle text-xs text-text-primary focus:outline-none cursor-pointer"
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
        <table className="w-full text-left text-xs text-text-primary">
          <thead className="bg-elevated text-text-secondary font-semibold border-b border-border-subtle">
            <tr>
              <th className="px-5 py-3.5">Waktu</th>
              <th className="px-5 py-3.5">Nama Alat</th>
              <th className="px-5 py-3.5">Tipe Pengguna</th>
              <th className="px-5 py-3.5">Ukuran Berkas</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-elevated/40 transition">
                  <td className="px-5 py-3.5 font-mono text-text-secondary text-[11px]">
                    {formatDateTimeIndonesia(log.created_at)}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-text-primary capitalize">
                    {log.tool_name}
                  </td>
                  <td className="px-5 py-3.5">
                    {log.is_guest ? (
                      <span className="px-2 py-0.5 rounded-full bg-elevated border border-border-subtle text-text-secondary font-medium text-[10px]">
                        Tamu (Guest / Tanpa Login)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#9B4819]/10 border border-[#9B4819]/25 text-[#9B4819] dark:text-[#E06D3B] font-mono text-[10px] font-semibold">
                        {log.user_email || 'Member Login'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-text-secondary">
                    {formatFileSize(log.file_size_bytes)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                        (log.status || '').toLowerCase() === 'success'
                          ? 'bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-text-secondary">
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
