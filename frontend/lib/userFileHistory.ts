// frontend/lib/userFileHistory.ts
import { supabase } from './supabase';
import { getOrCreateSessionId, getLastExecutionId } from './telemetry';
import { sanitizeDownloadFilename } from './download';
import type { UserTier } from '../types';

export interface UserHistoryItem {
  id: string;
  executionId?: string;
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

let lastSavedExecutionId = '';
let lastSavedSignature = '';
let lastSavedAt = 0;

/**
 * Normalisasi nama berkas untuk mendeteksi duplikasi akibat timestamp dinamis (misal merged-1791872141594.pdf)
 */
function normalizeFileKey(fileName: string): string {
  return (fileName || '')
    .toLowerCase()
    .replace(/-\d{10,15}(?=\.[a-z0-9]+$)/i, '');
}

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
    const executionId = getLastExecutionId();
    const normKey = `${normalizeFileKey(params.fileName)}_${params.outputBytes}_${params.toolName.toLowerCase()}`;

    // Cegah duplikasi jika berasal dari siklus eksekusi alat yang sama atau tanda tangan berkas identik dalam 60 detik
    if (
      (executionId && executionId === lastSavedExecutionId) ||
      (normKey === lastSavedSignature && now - lastSavedAt < 60_000)
    ) {
      return;
    }
    lastSavedExecutionId = executionId;
    lastSavedSignature = normKey;
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
    const safeFileName = sanitizeDownloadFilename(params.fileName, 'dokumen.pdf');
    const item: UserHistoryItem = {
      id: `hist_${now}_${Math.random().toString(36).substring(2, 8)}`,
      executionId,
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      userTier: effectiveTier,
      retentionHours,
      sessionId: getOrCreateSessionId(),
      fileName: safeFileName,
      toolName: params.toolName,
      inputBytes: params.inputBytes || params.blob.size,
      outputBytes: params.outputBytes || params.blob.size,
      durationMs: params.durationMs || 780,
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

    await pruneAndDeduplicateHistory(db);
    db.close();
  } catch (err) {
    console.debug('[UserFileHistory] Gagal menyimpan riwayat berkas:', err);
  }
}

/**
 * Membersihkan Blob yang sudah kedaluwarsa SERTA menghapus duplikat riwayat lokal
 * yang disebabkan oleh re-render (memiliki pemilik, toolName, inputBytes, outputBytes, dan pola nama berkas yang sama dalam rentang 5 menit).
 */
async function pruneAndDeduplicateHistory(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const now = Date.now();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        // Urutkan dari yang paling awal dibuat (ascending) agar record asli pertama (yang sesuai log Admin) dipertahankan
        const chronological: UserHistoryItem[] = (req.result || []).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const keptItems: UserHistoryItem[] = [];
        for (const entry of chronological) {
          const entryTime = new Date(entry.createdAt).getTime();
          const entryNormFile = normalizeFileKey(entry.fileName);
          const entryTool = (entry.toolName || '').toLowerCase().trim();
          const entryOwner = (entry.userId || entry.userEmail || entry.sessionId || '').toLowerCase();

          const duplicateOfExisting = keptItems.find((kept) => {
            const keptOwner = (kept.userId || kept.userEmail || kept.sessionId || '').toLowerCase();
            if (entryOwner !== keptOwner) return false;
            if (entry.executionId && kept.executionId && entry.executionId === kept.executionId) {
              return true;
            }
            const keptTime = new Date(kept.createdAt).getTime();
            const sameTool = (kept.toolName || '').toLowerCase().trim() === entryTool;
            const sameSize =
              kept.inputBytes === entry.inputBytes && kept.outputBytes === entry.outputBytes;
            const sameBaseFile = normalizeFileKey(kept.fileName) === entryNormFile;
            const withinWindow = Math.abs(entryTime - keptTime) < 5 * 60 * 1000; // 5 menit
            return sameTool && sameSize && sameBaseFile && withinWindow;
          });

          if (duplicateOfExisting) {
            // Jika entry duplikat memiliki blob yang masih valid sedangkan yang lama tidak, pindahkan blob-nya lalu hapus duplikatnya
            if (entry.blob && !duplicateOfExisting.blob) {
              duplicateOfExisting.blob = entry.blob;
              duplicateOfExisting.hasBlobAvailable = true;
              store.put(duplicateOfExisting);
            }
            store.delete(entry.id);
          } else {
            keptItems.push(entry);
          }
        }

        // Urutkan dari terbaru ke terlama untuk pengecekan batas jumlah blob & kedaluwarsa
        const newestFirst = keptItems.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        newestFirst.forEach((entry, idx) => {
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
 * (gabungan yang disinkronkan 1:1 antara riwayat Supabase/Admin dan Blob lokal di IndexedDB).
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
    await pruneAndDeduplicateHistory(db);

    const rawItems: UserHistoryItem[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    db.close();

    const isAuthenticatedUser = Boolean(userId || userEmail);
    for (const item of rawItems) {
      const itemBelongsToSomeoneElse =
        (item.userId && userId && item.userId !== userId) ||
        (item.userEmail && userEmail && item.userEmail.toLowerCase() !== userEmail.toLowerCase()) ||
        (!isAuthenticatedUser && Boolean(item.userId || item.userEmail));

      const matchesUser =
        !itemBelongsToSomeoneElse &&
        (isAuthenticatedUser
          ? (Boolean(userId && item.userId === userId) ||
              Boolean(userEmail && item.userEmail?.toLowerCase() === userEmail.toLowerCase()) ||
              (!item.userId && !item.userEmail && item.sessionId === sessionId))
          : !item.userId && !item.userEmail && item.sessionId === sessionId);

      if (matchesUser) {
        const createdMs = new Date(item.createdAt).getTime();
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
          fileName: sanitizeDownloadFilename(item.fileName, 'dokumen.pdf'),
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

  // Sinkronkan dengan riwayat tabel tool_usages di Supabase (sumber kebenaran yang sama dengan Admin Dashboard)
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
          const durMs = Number(meta?.duration_ms || row.duration_ms || 780);
          const fName = meta?.file_name || `${row.tool_name || 'dokumen'}.pdf`;

          // Cari apakah sudah ada item lokal yang cocok dengan eksekusi ini
          const matchingLocal = localItems.find(
            (loc) =>
              Math.abs(new Date(loc.createdAt).getTime() - rowTime) < 120_000 &&
              (loc.inputBytes === inBytes || normalizeFileKey(loc.fileName) === normalizeFileKey(fName))
          );

          if (matchingLocal) {
            // Selaraskan nama berkas dan durasi proses dengan yang tercatat di Admin Telemetry
            matchingLocal.fileName = fName || matchingLocal.fileName;
            matchingLocal.durationMs = durMs || matchingLocal.durationMs;
            continue;
          }

          localItems.push({
            id: `remote-${row.id}`,
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
