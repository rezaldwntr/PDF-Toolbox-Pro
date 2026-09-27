import React from 'react';
import { Activity, Laptop } from 'lucide-react';

interface RealtimeTabProps {
  presence: {
    onlineCount: number;
    activeUsers: Array<{
      id: string;
      email?: string;
      isGuest?: boolean;
      tier?: string;
      onlineAt: string;
    }>;
  };
}

export const RealtimeTab: React.FC<RealtimeTabProps> = ({ presence }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Pengunjung Aktif Detik Ini (Realtime WebSocket)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sinkronisasi langsung via saluran WebSocket Supabase Presence tanpa beban database
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
          {presence.onlineCount} Tab / Sesi Terhubung
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {presence.activeUsers.map((u, i) => (
          <div
            key={`${u.id}-${i}`}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                {u.isGuest ? 'Pengunjung Tamu' : u.email || 'Pengguna Login'}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="capitalize font-medium text-indigo-500">{u.tier}</span>
                <span>•</span>
                <span>Online sejak {new Date(u.onlineAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
