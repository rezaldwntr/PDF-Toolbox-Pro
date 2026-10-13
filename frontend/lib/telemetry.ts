// frontend/lib/telemetry.ts
import { supabase } from './supabase';

const SESSION_STORAGE_KEY = 'pdf_toolbox_session_id';

/** Mengambil atau membuat unique anonymous session ID untuk pelacakan tamu */
export const getOrCreateSessionId = (): string => {
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && crypto.randomUUID
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
  outputSizeBytes?: number;
  durationMs?: number;
  pageCount?: number;
  isSuccess?: boolean;
  errorMessage?: string;
  userId?: string | null;
  userEmail?: string | null;
}

// State pelacakan siklus hidup eksekusi alat aktif
let activeInputSizeBytes = 0;
let activeOutputSizeBytes = 0;
let activeProcessStartMs = 0;
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUsageRecord: RecordUsageParams | null = null;

/** Menyimpan ukuran berkas masuk (input) saat pengguna memilih berkas di FileUploader */
export const setTelemetryInputSize = (bytes: number): void => {
  if (bytes > 0) {
    activeInputSizeBytes = Math.round(bytes);
    activeOutputSizeBytes = 0;
  }
};

/** Mengambil ukuran berkas masuk (input) terakhir yang tercatat */
export const getTelemetryInputSize = (): number => activeInputSizeBytes;

/** Menandai waktu mulai pemrosesan dokumen (saat tombol proses diklik / stepper muncul) */
export const markTelemetryProcessStart = (): void => {
  activeProcessStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  activeOutputSizeBytes = 0;
};

/** Menandai waktu mulai hanya jika belum diset pada siklus saat ini */
export const markTelemetryProcessStartIfUnset = (): void => {
  if (!activeProcessStartMs) {
    markTelemetryProcessStart();
  }
};

/** Mengambil durasi pemrosesan dalam milidetik sejak proses dimulai */
export const getTelemetryDurationMs = (): number => {
  if (!activeProcessStartMs) return 0;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return Math.max(50, Math.round(now - activeProcessStartMs));
};

/**
 * Menyimpan ukuran berkas hasil (output) saat DownloadResultCard dimuat.
 * Jika ada antrean log telemetri yang sedang menunggu ukuran output, langsung kirim sekarang.
 */
export const setTelemetryOutputSize = (bytes: number): void => {
  if (bytes > 0) {
    activeOutputSizeBytes = Math.round(bytes);
    if (pendingUsageRecord) {
      pendingUsageRecord.outputSizeBytes = activeOutputSizeBytes;
      if (!pendingUsageRecord.fileSizeBytes && activeInputSizeBytes > 0) {
        pendingUsageRecord.fileSizeBytes = activeInputSizeBytes;
      }
      flushPendingToolUsage();
    }
  }
};

/** Mengirim log telemetri yang sedang mengantre secara instan */
export const flushPendingToolUsage = (): void => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  if (pendingUsageRecord) {
    const recordToSend = { ...pendingUsageRecord };
    pendingUsageRecord = null;
    void recordToolUsage(recordToSend);
  }
};

/**
 * Menjadwalkan pengiriman log telemetri dengan jeda singkat (350ms) agar
 * komponen DownloadResultCard sempat melaporkan ukuran berkas hasil (outputSizeBytes).
 */
export const scheduleToolUsageLog = (params: RecordUsageParams): void => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  const capturedDuration = params.durationMs || getTelemetryDurationMs() || 850;
  activeProcessStartMs = 0;

  pendingUsageRecord = {
    ...params,
    fileSizeBytes: params.fileSizeBytes || activeInputSizeBytes || 0,
    outputSizeBytes: params.outputSizeBytes || activeOutputSizeBytes || 0,
    durationMs: capturedDuration,
  };

  pendingFlushTimer = setTimeout(() => {
    flushPendingToolUsage();
  }, 350);
};

/**
 * Merekam telemetri penggunaan alat PDF ke backend Cloud Run / Supabase.
 * Berjalan sepenuhnya di background (fire-and-forget) agar tidak memperlambat UX pengguna.
 */
export const recordToolUsage = async ({
  toolName,
  fileSizeBytes = 0,
  outputSizeBytes = 0,
  durationMs = 0,
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
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

    const finalInputBytes = fileSizeBytes || activeInputSizeBytes || outputSizeBytes || 0;
    const finalOutputBytes = outputSizeBytes || activeOutputSizeBytes || finalInputBytes || 0;
    const finalDurationMs = durationMs || getTelemetryDurationMs() || 850;

    // Simpan metadata ukuran masuk, ukuran hasil, dan waktu proses di error_message (saat sukses)
    // agar kompatibel 100% dengan skema tabel Supabase tool_usages tanpa perlu migrasi DDL manual.
    const metaPayload = isSuccess
      ? JSON.stringify({
          input_bytes: finalInputBytes,
          output_bytes: finalOutputBytes,
          duration_ms: finalDurationMs,
        })
      : errorMessage || null;

    const backendPayload = {
      tool_name: toolName.toLowerCase().trim(),
      is_guest: isGuest,
      user_id: effectiveUserId || null,
      user_email: effectiveUserEmail || null,
      session_id: sessionId,
      file_size_bytes: finalInputBytes,
      output_size_bytes: finalOutputBytes,
      duration_ms: finalDurationMs,
      page_count: pageCount,
      status: isSuccess ? 'success' : 'failed',
      error_message: metaPayload,
    };

    const supabasePayload = {
      tool_name: toolName.toLowerCase().trim(),
      is_guest: isGuest,
      user_id: effectiveUserId || null,
      user_email: effectiveUserEmail || null,
      session_id: sessionId,
      file_size_bytes: finalInputBytes,
      page_count: pageCount,
      status: isSuccess ? 'success' : 'failed',
      error_message: metaPayload,
    };

    const backendUrl =
      (import.meta as any).env?.VITE_BACKEND_URL ||
      'https://pdf-toolbox-pro-100471936008.asia-southeast2.run.app';
    const endpoint = `${backendUrl.replace(/\/$/, '')}/telemetry/log-usage`;

    // Kirim secara asinkron menggunakan fetch keepalive
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
      keepalive: true,
    }).catch(() => {
      // Fallback: Jika backend Cloud Run offline/cold start, simpan via Supabase anon client
      if (supabase) {
        supabase
          .from('tool_usages')
          .insert([supabasePayload])
          .then(
            () => {},
            () => {}
          );
      }
    });
  } catch (err) {
    // Silent fail agar tidak pernah mengganggu alur kerja konversi dokumen user
    console.debug('[Telemetry] Gagal merekam telemetri:', err);
  }
};

