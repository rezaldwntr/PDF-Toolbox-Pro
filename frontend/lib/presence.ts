// frontend/lib/presence.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getOrCreateSessionId } from './telemetry';
import type { UserProfile, UserTier } from '../types';

export interface PresenceState {
  onlineCount: number;
  activeUsers: Array<{
    id: string;
    isGuest: boolean;
    email?: string;
    tier?: string;
    onlineAt: string;
  }>;
}

/**
 * Hook Realtime Presence via Supabase Websocket.
 * Secara otomatis menghitung berapa pengguna yang sedang membuka aplikasi detik ini secara global.
 */
export const useOnlinePresence = (user: UserProfile | null, userTier: UserTier): PresenceState => {
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [activeUsers, setActiveUsers] = useState<PresenceState['activeUsers']>([]);

  useEffect(() => {
    if (!supabase) return;

    const sessionId = getOrCreateSessionId();
    const presenceKey = user?.id || sessionId;

    const channel = supabase.channel('online-presence', {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      const users: PresenceState['activeUsers'] = [];

      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            users.push({
              id: p.id || 'anonymous',
              isGuest: p.isGuest ?? true,
              email: p.email,
              tier: p.tier || 'guest',
              onlineAt: p.onlineAt || new Date().toISOString(),
            });
          });
        }
      });

      // Hilangkan duplikasi berdasarkan ID
      const uniqueUsersMap = new Map<string, (typeof users)[0]>();
      users.forEach((u) => uniqueUsersMap.set(u.id, u));
      const uniqueList = Array.from(uniqueUsersMap.values());

      const count = Math.max(1, uniqueList.length);
      setOnlineCount(count);
      setActiveUsers(uniqueList);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'join' }, () => {
        updatePresenceState();
      })
      .on('presence', { event: 'leave' }, () => {
        updatePresenceState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: presenceKey,
            isGuest: !user,
            email: user?.email,
            tier: userTier,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, user?.email, userTier]);

  return { onlineCount, activeUsers };
};
