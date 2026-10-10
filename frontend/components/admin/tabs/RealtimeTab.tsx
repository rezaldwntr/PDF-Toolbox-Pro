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
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-paper p-6 animate-fade-in">
      <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#314028] dark:text-[#34D399]" />
            Pengunjung Aktif Detik Ini (Realtime WebSocket)
          </h3>
          <p className="text-xs text-text-secondary mt-1">
            Sinkronisasi langsung via saluran WebSocket Supabase Presence tanpa beban database.
          </p>
        </div>
        <div className="px-3.5 py-1 rounded-full bg-[#314028]/10 border border-[#314028]/25 text-[#314028] dark:text-[#34D399] font-bold text-xs">
          {presence.onlineCount} Tab / Sesi Terhubung
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {presence.activeUsers.map((u, i) => (
          <div
            key={`${u.id}-${i}`}
            className="p-3.5 rounded-xl bg-elevated border border-border-subtle flex items-center gap-3 transition-all hover:border-[#9B4819]/30"
          >
            <div className="w-9 h-9 rounded-full bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/20 flex items-center justify-center font-bold text-xs shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs text-text-primary truncate">
                {u.isGuest ? 'Pengunjung Tamu' : u.email || 'Pengguna Login'}
              </div>
              <div className="text-[10px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                <span className="capitalize font-semibold text-[#9B4819] dark:text-[#E06D3B]">{u.tier}</span>
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
