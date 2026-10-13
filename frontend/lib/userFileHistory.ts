// frontend/lib/userFileHistory.ts
import { supabase } from './supabase';
import { getOrCreateSessionId } from './telemetry';

export interface UserHistoryItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  sessionId: string;
  fileName: string;
  toolName: string;
  inputBytes: number;
  outputBytes: number;
  durationMs: number;
  createdAt: string; // ISO string
  expiresAt: number; // epoch ms (createdAt + 60 minutes)
  hasBlobAvailable?: boolean;
  blob?: Blob | null;
}

const DB_NAME = 'pdf_toolbox_user_files_db';
const DB_VERSION = 1;
const STORE_NAME = 'recent_files';
const RETENTION_MS = 60 * 60 * 1000; // 60 menit sesuai kebijakan privasi
const MAX_STORED_BLOBS = 15;

let lastSavedSignature = '';
let lastSavedAt = 0;

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
 * agar tetap dapat diunduh ulang dari halaman Profil selama masa retensi 60 menit.
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

    if (!effectiveUserId && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          effectiveUserId = data.session.user.id;
          effectiveUserEmail = data.session.user.email || null;
        }
      } catch {
        // ignore
      }
    }

    const db = await openHistoryDb();
    const item: UserHistoryItem = {
      id: `hist_${now}_${Math.random().toString(36).substring(2, 8)}`,
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      sessionId: getOrCreateSessionId(),
      fileName: params.fileName,
      toolName: params.toolName,
      inputBytes: params.inputBytes || params.blob.size,
      outputBytes: params.outputBytes || params.blob.size,
      durationMs: params.durationMs || 850,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + RETENTION_MS,
      hasBlobAvailable: true,
      blob: params.blob,
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
 * Menghapus Blob dari item yang sudah melewati batas waktu 60 menit,
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
 * (gabungan dari IndexedDB lokal yang memiliki link unduhan aktif + riwayat Supabase).
 */
export async function getUserFileHistory(
  userId?: string | null,
  userEmail?: string | null
): Promise<UserHistoryItem[]> {
  const sessionId = getOrCreateSessionId();
  const now = Date.now();
  const localItems: UserHistoryItem[] = [];

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
        const stillValid = Boolean(item.blob && now <= item.expiresAt);
        localItems.push({
          ...item,
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
            sessionId: row.session_id || sessionId,
            fileName: fName,
            toolName: row.tool_name || 'Alat PDF',
            inputBytes: inBytes,
            outputBytes: outBytes,
            durationMs: durMs,
            createdAt: row.created_at,
            expiresAt: rowTime + RETENTION_MS,
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
