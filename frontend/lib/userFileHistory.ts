// frontend/lib/userFileHistory.ts
import { supabase } from './supabase';
import { getOrCreateSessionId } from './telemetry';
import type { UserTier } from '../types';

export interface UserHistoryItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userTier?: UserTier;
  retentionHours?: number;
  sessionId: string;
  fileName: string;
  toolName: string;
  inputBytes: number;
  outputBytes: number;
  durationMs: number;
  createdAt: string; // ISO string
  expiresAt: number; // epoch ms (createdAt + retention sesuai paket)
  hasBlobAvailable?: boolean;
  blob?: Blob | null;
}

const DB_NAME = 'pdf_toolbox_user_files_db';
const DB_VERSION = 1;
const STORE_NAME = 'recent_files';
const MAX_STORED_BLOBS = 25;

let lastSavedSignature = '';
let lastSavedAt = 0;

/**
 * Mengembalikan durasi aktif tautan unduh (dalam jam) sesuai paket (tier) pengguna:
 * - guest / free : 0 jam (Langsung dihapus setelah sesi alat selesai)
 * - flash        : 6 jam (24-Hour Flash Pass)
 * - monthly      : 24 jam (Monthly Pro)
 * - annual       : 48 jam (Annual VIP Pass)
 */
export function getRetentionHoursForTier(tier?: UserTier | string | null): number {
  switch (tier) {
    case 'annual':
      return 48;
    case 'monthly':
      return 24;
    case 'flash':
      return 6;
    case 'free':
    case 'guest':
    default:
      return 0;
  }
}

export function getRetentionMsForTier(tier?: UserTier | string | null): number {
  return getRetentionHoursForTier(tier) * 60 * 60 * 1000;
}

export function formatRemainingRetention(remainingMs: number): string {
  if (remainingMs <= 0) return '0 mnt';
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} mnt`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}j ${mins}m` : `${hours} jam`;
}

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB tidak tersedia'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Menyimpan hasil eksekusi alat beserta Blob berkasnya ke IndexedDB lokal pengguna
 * dengan masa aktif tautan unduh yang menyesuaikan paket aktif pengguna:
 * - Gratis / Tamu : 0 jam (Langsung dihapus, hanya menyimpan log riwayat tanpa file biner)
 * - Flash Pass    : 6 jam
 * - Monthly Pro   : 24 jam
 * - Annual Pass   : 48 jam
 */
export async function saveUserFileHistory(params: {
  fileName: string;
  toolName: string;
  inputBytes: number;
  outputBytes: number;
  durationMs: number;
  blob: Blob;
  userId?: string | null;
  userEmail?: string | null;
  userTier?: UserTier | null;
}): Promise<void> {
  try {
    const now = Date.now();
    const sig = `${params.fileName}_${params.outputBytes}_${params.toolName}`;
    if (sig === lastSavedSignature && now - lastSavedAt < 5000) {
      return; // Cegah duplikasi penyimpanan saat re-render
    }
    lastSavedSignature = sig;
    lastSavedAt = now;

    let effectiveUserId = params.userId || null;
    let effectiveUserEmail = params.userEmail || null;
    let effectiveTier: UserTier = params.userTier || 'guest';

    if (supabase) {
      try {
        if (!effectiveUserId) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            effectiveUserId = data.session.user.id;
            effectiveUserEmail = data.session.user.email || null;
          }
        }
        if (effectiveUserId && !params.userTier) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('tier, subscription_expiry')
            .eq('id', effectiveUserId)
            .single();
          if (profile?.tier) {
            let dbTier = profile.tier as UserTier;
            if (
              ['flash', 'monthly', 'annual'].includes(dbTier) &&
              profile.subscription_expiry &&
              new Date(profile.subscription_expiry) < new Date()
            ) {
              dbTier = 'free';
            }
            effectiveTier = dbTier;
          } else {
            effectiveTier = 'free';
          }
        }
      } catch {
        // ignore
      }
    }

    const retentionHours = getRetentionHoursForTier(effectiveTier);
    const retentionMs = retentionHours * 60 * 60 * 1000;
    const canRetainBlob = retentionMs > 0;

    const db = await openHistoryDb();
    const item: UserHistoryItem = {
      id: `hist_${now}_${Math.random().toString(36).substring(2, 8)}`,
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      userTier: effectiveTier,
      retentionHours,
      sessionId: getOrCreateSessionId(),
      fileName: params.fileName,
      toolName: params.toolName,
      inputBytes: params.inputBytes || params.blob.size,
      outputBytes: params.outputBytes || params.blob.size,
      durationMs: params.durationMs || 850,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + retentionMs,
      hasBlobAvailable: canRetainBlob,
      blob: canRetainBlob ? params.blob : null,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    await pruneExpiredBlobs(db);
    db.close();
  } catch (err) {
    console.debug('[UserFileHistory] Gagal menyimpan riwayat berkas:', err);
  }
}

/**
 * Menghapus Blob dari item yang sudah melewati batas waktu retensi paketnya,
 * namun tetap mempertahankan metadata riwayatnya.
 */
async function pruneExpiredBlobs(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const now = Date.now();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: UserHistoryItem[] = (req.result || []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        all.forEach((entry, idx) => {
          const isExpired = now > entry.expiresAt || idx >= MAX_STORED_BLOBS;
          if (isExpired && entry.blob) {
            store.put({
              ...entry,
              blob: null,
              hasBlobAvailable: false,
            });
          }
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Mengambil daftar riwayat pemrosesan dokumen milik pengguna saat ini
 * (gabungan dari IndexedDB lokal yang memiliki link unduhan aktif sesuai paket + riwayat Supabase).
 */
export async function getUserFileHistory(
  userId?: string | null,
  userEmail?: string | null,
  currentTier?: UserTier | null
): Promise<UserHistoryItem[]> {
  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const localItems: UserHistoryItem[] = [];
  const tierRetentionHours = getRetentionHoursForTier(currentTier);
  const tierRetentionMs = tierRetentionHours * 60 * 60 * 1000;

  try {
    const db = await openHistoryDb();
    await pruneExpiredBlobs(db);

    const rawItems: UserHistoryItem[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    db.close();

    for (const item of rawItems) {
      const matchesUser =
        (userId && item.userId === userId) ||
        (userEmail && item.userEmail?.toLowerCase() === userEmail.toLowerCase()) ||
        item.sessionId === sessionId;

      if (matchesUser) {
        const createdMs = new Date(item.createdAt).getTime();
        // Sesuaikan batas waktu kedaluwarsa dengan paket aktif pengguna saat ini
        const effectiveRetentionMs =
          currentTier !== undefined && currentTier !== null
            ? tierRetentionMs
            : item.retentionHours !== undefined
            ? item.retentionHours * 60 * 60 * 1000
            : Math.max(0, item.expiresAt - createdMs);

        const effectiveExpiresAt = createdMs + effectiveRetentionMs;
        const stillValid = Boolean(item.blob && effectiveRetentionMs > 0 && now <= effectiveExpiresAt);

        localItems.push({
          ...item,
          userTier: currentTier || item.userTier || 'free',
          retentionHours:
            currentTier !== undefined && currentTier !== null
              ? tierRetentionHours
              : item.retentionHours ?? 0,
          expiresAt: effectiveExpiresAt,
          hasBlobAvailable: stillValid,
          blob: stillValid ? item.blob : null,
        });
      }
    }
  } catch {
    // Abaikan jika IndexedDB tidak dapat diakses
  }

  // Ambil juga riwayat dari tabel tool_usages di Supabase jika user login
  if (supabase && (userId || userEmail)) {
    try {
      let query = supabase
        .from('tool_usages')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(25);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (userEmail) {
        query = query.eq('user_email', userEmail);
      }

      const { data } = await query;
      if (data && Array.isArray(data)) {
        for (const row of data) {
          const rowTime = new Date(row.created_at).getTime();
          // Cek apakah sudah ada di localItems (toleransi waktu 15 detik)
          const alreadyInLocal = localItems.some(
            (loc) => Math.abs(new Date(loc.createdAt).getTime() - rowTime) < 15000
          );
          if (alreadyInLocal) continue;

          let meta: any = null;
          if (typeof row.error_message === 'string' && row.error_message.trim().startsWith('{')) {
            try {
              meta = JSON.parse(row.error_message);
            } catch {
              meta = null;
            }
          }

          const inBytes = Number(meta?.input_bytes || row.file_size_bytes || 0);
          const outBytes = Number(meta?.output_bytes || row.output_size_bytes || inBytes || 0);
          const durMs = Number(meta?.duration_ms || row.duration_ms || 850);
          const fName = meta?.file_name || `${row.tool_name || 'dokumen'}.pdf`;

          localItems.push({
            id: String(row.id),
            userId: row.user_id || userId || null,
            userEmail: row.user_email || userEmail || null,
            userTier: currentTier || 'free',
            retentionHours: tierRetentionHours,
            sessionId: row.session_id || sessionId,
            fileName: fName,
            toolName: row.tool_name || 'Alat PDF',
            inputBytes: inBytes,
            outputBytes: outBytes,
            durationMs: durMs,
            createdAt: row.created_at,
            expiresAt: rowTime + tierRetentionMs,
            hasBlobAvailable: false,
            blob: null,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return localItems.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Menghapus satu item berkas dari penyimpanan lokal IndexedDB pengguna.
 */
export async function deleteUserHistoryItem(id: string): Promise<void> {
  try {
    const db = await openHistoryDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // ignore
  }
}
