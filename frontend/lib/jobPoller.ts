// frontend/lib/jobPoller.ts
/**
 * Utility untuk menangani Async Jobs pada PDF Toolbox Pro.
 * Mendukung polling otomatis status pekerjaan di backend,
 * pelacakan progres realtime (persentase & pesan status),
 * pembatalan (AbortSignal), serta penanganan respons sinkronus fallback.
 */

export interface JobProgressCallback {
  (progress: number, message: string): void;
}

export interface JobResult {
  blob: Blob;
  filename: string;
  sample?: string;
}

export interface PollJobOptions {
  jobId: string;
  backendUrl: string;
  onProgress?: JobProgressCallback;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxTimeoutMs?: number;
}

/**
 * Melakukan polling ke endpoint /jobs/{jobId} hingga status berubah menjadi 'done' atau 'error'.
 * Setelah 'done', otomatis mengunduh hasil melalui /jobs/{jobId}/download.
 */
export async function pollJobUntilDone(options: PollJobOptions): Promise<JobResult> {
  const {
    jobId,
    backendUrl,
    onProgress,
    signal,
    pollIntervalMs = 1500,
    maxTimeoutMs = 600000, // 10 menit
  } = options;

  const startTime = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
    }

    if (Date.now() - startTime > maxTimeoutMs) {
      throw new Error('Batas waktu pengerjaan tugas terlampaui. Silakan coba kembali.');
    }

    const statusRes = await fetch(`${backendUrl}/jobs/${jobId}`, { signal });
    if (!statusRes.ok) {
      const errJson = await statusRes.json().catch(() => ({}));
      throw new Error(errJson.detail || `Gagal memeriksa status tugas (${statusRes.status})`);
    }

    const jobData = await statusRes.json();
    const { status, progress, message, filename, sample, error } = jobData;

    if (onProgress) {
      onProgress(progress || 0, message || 'Sedang memproses dokumen...');
    }

    if (status === 'error') {
      throw new Error(error || message || 'Gagal memproses dokumen pada server.');
    }

    if (status === 'done') {
      // Unduh biner file hasil
      const dlRes = await fetch(`${backendUrl}/jobs/${jobId}/download`, { signal });
      if (!dlRes.ok) {
        throw new Error('Gagal mengunduh file hasil konversi dari server.');
      }

      const blob = await dlRes.blob();
      const contentDisp = dlRes.headers.get('content-disposition') || '';
      const sampleHeader = dlRes.headers.get('X-Extracted-Text-Sample') || sample;

      let finalFilename = filename || 'hasil-dokumen';
      const match = contentDisp.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        finalFilename = match[1];
      }

      return {
        blob,
        filename: finalFilename,
        sample: sampleHeader,
      };
    }

    // Tunggu sebelum polling berikutnya
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/**
 * Helper serbaguna: Memeriksa apakah response HTTP berupa Job Asinkronus (202 Accepted)
 * atau respons berkas langsung (200 OK).
 */
export async function handleJobOrDirectResponse(
  response: Response,
  backendUrl: string,
  onProgress?: JobProgressCallback,
  signal?: AbortSignal
): Promise<JobResult> {
  const contentType = response.headers.get('content-type') || '';

  // Jika response berupa JSON (baik HTTP 202 atau 200 dengan payload job_id)
  if (response.status === 202 || contentType.includes('application/json')) {
    const data = await response.json();
    if (data.job_id) {
      if (onProgress && data.message) {
        onProgress(5, data.message);
      }
      return await pollJobUntilDone({
        jobId: data.job_id,
        backendUrl,
        onProgress,
        signal,
      });
    }
  }

  // Jika gagal non-200
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.detail || errJson.error || `Gagal memproses dokumen (Status: ${response.status})`);
  }

  // Fallback respons biner langsung (200 OK)
  const blob = await response.blob();
  const contentDisp = response.headers.get('content-disposition') || '';
  const sampleHeader = response.headers.get('X-Extracted-Text-Sample') || undefined;

  let finalFilename = 'dokumen';
  const match = contentDisp.match(/filename="?([^";]+)"?/);
  if (match && match[1]) {
    finalFilename = match[1];
  }

  return {
    blob,
    filename: finalFilename,
    sample: sampleHeader,
  };
}
