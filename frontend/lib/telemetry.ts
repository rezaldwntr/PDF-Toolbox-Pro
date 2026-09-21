// frontend/lib/telemetry.ts
import { supabase } from './supabase';

const SESSION_STORAGE_KEY = 'pdf_toolbox_session_id';

/** Mengambil atau membuat unique anonymous session ID untuk pelacakan tamu */
export const getOrCreateSessionId = (): string => {
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return 'unknown_session';
  }
};

export interface RecordUsageParams {
  toolName: string;
  fileSizeBytes?: number;
  pageCount?: number;
  isSuccess?: boolean;
  errorMessage?: string;
  userId?: string | null;
  userEmail?: string | null;
}

/**
 * Merekam telemetri penggunaan alat PDF ke backend Cloud Run / Supabase.
 * Berjalan sepenuhnya di background (fire-and-forget) agar tidak memperlambat UX pengguna.
 */
export const recordToolUsage = async ({
  toolName,
  fileSizeBytes = 0,
  pageCount = 1,
  isSuccess = true,
  errorMessage,
  userId,
  userEmail,
}: RecordUsageParams): Promise<void> => {
  try {
    let effectiveUserId = userId;
    let effectiveUserEmail = userEmail;

    // Jika user credentials tidak di-pass langsung, coba intip sesi aktif Supabase
    if (!effectiveUserId && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          effectiveUserId = session.user.id;
          effectiveUserEmail = session.user.email || null;
        }
      } catch {
        // Abaikan jika auth belum siap
      }
    }

    const isGuest = !effectiveUserId;
    const sessionId = getOrCreateSessionId();

    const payload = {
      tool_name: toolName.toLowerCase().trim(),
      is_guest: isGuest,
      user_id: effectiveUserId || null,
      user_email: effectiveUserEmail || null,
      session_id: sessionId,
      file_size_bytes: fileSizeBytes,
      page_count: pageCount,
      status: isSuccess ? 'success' : 'failed',
      error_message: errorMessage || null,
    };

    const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app';
    const endpoint = `${backendUrl.replace(/\/$/, '')}/telemetry/log-usage`;

    // Kirim secara asinkron menggunakan fetch keepalive
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Fallback: Jika backend Cloud Run offline/cold start, coba simpan via Supabase anon client jika RLS mengizinkan
      if (supabase) {
        supabase.from('tool_usages').insert([payload]).then(() => {}).catch(() => {});
      }
    });
  } catch (err) {
    // Silent fail agar tidak pernah mengganggu alur kerja konversi dokumen user
    console.debug('[Telemetry] Gagal merekam telemetri:', err);
  }
};
