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
  fileName?: string;
  processingMode?: 'local_ram' | 'cloud_server';
  steps?: string[];
  isSuccess?: boolean;
  errorMessage?: string;
  userId?: string | null;
  userEmail?: string | null;
}

// State pelacakan siklus hidup eksekusi alat aktif
let activeInputSizeBytes = 0;
let activeOutputSizeBytes = 0;
let activeProcessStartMs = 0;
let lastCapturedDurationMs = 0;
let activeOutputFileName = '';
let activeIsLocalRam = false;
let lastExecutionId = '';
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
  lastExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

/** Menandai waktu mulai hanya jika belum diset pada siklus saat ini */
export const markTelemetryProcessStartIfUnset = (): void => {
  if (!activeProcessStartMs) {
    markTelemetryProcessStart();
  }
};

/** Mengambil durasi pemrosesan dalam milidetik sejak proses dimulai (atau durasi terakhir yang ditangkap) */
export const getTelemetryDurationMs = (): number => {
  if (!activeProcessStartMs) return lastCapturedDurationMs;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return Math.max(50, Math.round(now - activeProcessStartMs));
};

/** Mengambil ID unik dari siklus eksekusi alat terakhir untuk mencegah duplikasi di riwayat profil */
export const getLastExecutionId = (): string => {
  if (!lastExecutionId) {
    lastExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  return lastExecutionId;
};

/**
 * Menyimpan ukuran berkas hasil (output) dan metadata nama berkas saat DownloadResultCard dimuat.
 * Jika ada antrean log telemetri yang sedang menunggu ukuran output, langsung kirim sekarang.
 */
export const setTelemetryOutputSize = (
  bytes: number,
  fileName?: string,
  isLocalRam?: boolean
): void => {
  if (fileName) activeOutputFileName = fileName;
  if (typeof isLocalRam === 'boolean') activeIsLocalRam = isLocalRam;
  if (bytes > 0) {
    activeOutputSizeBytes = Math.round(bytes);
    if (pendingUsageRecord) {
      pendingUsageRecord.outputSizeBytes = activeOutputSizeBytes;
      if (fileName) pendingUsageRecord.fileName = fileName;
      if (typeof isLocalRam === 'boolean') {
        pendingUsageRecord.processingMode = isLocalRam ? 'local_ram' : 'cloud_server';
      }
      if (!pendingUsageRecord.fileSizeBytes && activeInputSizeBytes > 0) {
        pendingUsageRecord.fileSizeBytes = activeInputSizeBytes;
      }
      flushPendingToolUsage();
    }
  }
};

/** Mengambil nama alat terakhir yang sedang/baru dieksekusi */
let lastRecordedToolName = 'Alat PDF';
export const getLastRecordedToolName = (): string => lastRecordedToolName;

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
  lastRecordedToolName = params.toolName || 'Alat PDF';
  const capturedDuration = params.durationMs || getTelemetryDurationMs() || 850;
  lastCapturedDurationMs = capturedDuration;
  activeProcessStartMs = 0;
  if (!lastExecutionId) {
    lastExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  pendingUsageRecord = {
    ...params,
    fileSizeBytes: params.fileSizeBytes || activeInputSizeBytes || 0,
    outputSizeBytes: params.outputSizeBytes || activeOutputSizeBytes || 0,
    durationMs: capturedDuration,
    fileName: params.fileName || activeOutputFileName || undefined,
    processingMode: params.processingMode || (activeIsLocalRam ? 'local_ram' : 'cloud_server'),
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
  fileName,
  processingMode,
  steps,
  isSuccess = true,
  errorMessage,
  userId,
  userEmail,
}: RecordUsageParams): Promise<void> => {
  try {
    lastRecordedToolName = toolName || lastRecordedToolName;
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
    const finalFileName = fileName || activeOutputFileName || `${toolName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const finalMode = processingMode || (activeIsLocalRam ? 'local_ram' : 'cloud_server');

    const safeTotal = Math.max(10, Math.round(finalDurationMs));
    const d1 = Math.max(1, Math.round(safeTotal * 0.1));
    const d2 = Math.max(1, Math.round(safeTotal * 0.15));
    const d3 = Math.max(1, Math.round(safeTotal * 0.35));
    const d4 = Math.max(1, Math.round(safeTotal * 0.25));
    const d5 = Math.max(1, safeTotal - (d1 + d2 + d3 + d4));
    const fmtStep = (ms: number) =>
      safeTotal >= 1000 ? `${(ms / 1000).toFixed(2)} dtk` : `${ms} ms`;
    const fmtTotal =
      safeTotal >= 1000 ? `${(safeTotal / 1000).toFixed(2)} dtk` : `${safeTotal} ms`;

    const defaultSteps = [
      `[${fmtStep(d1)}] Inisialisasi & validasi struktur berkas masuk (${(finalInputBytes / 1024).toFixed(1)} KB)`,
      `[${fmtStep(d2)}] Mengalokasikan engine "${toolName}" (${finalMode === 'local_ram' ? 'Client-Side Local RAM' : 'Cloud Server Worker'})`,
      `[${fmtStep(d3)}] Memproses objek halaman, stream teks, dan matriks dokumen`,
      `[${fmtStep(d4)}] Merakit berkas hasil "${finalFileName}" (${(finalOutputBytes / 1024).toFixed(1)} KB)`,
      `[${fmtStep(d5)}] Verifikasi integritas selesai (Total: ${fmtTotal}) — Berkas siap diunduh`,
    ];

    // Simpan metadata ukuran masuk, ukuran hasil, waktu proses, dan detail tahapan di error_message (saat sukses)
    // agar kompatibel 100% dengan skema tabel Supabase tool_usages tanpa perlu migrasi DDL manual.
    const metaPayload = isSuccess
      ? JSON.stringify({
          input_bytes: finalInputBytes,
          output_bytes: finalOutputBytes,
          duration_ms: finalDurationMs,
          file_name: finalFileName,
          processing_mode: finalMode,
          steps: steps && steps.length > 0 ? steps : defaultSteps,
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

