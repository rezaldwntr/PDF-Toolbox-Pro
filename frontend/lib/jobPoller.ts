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
  let notFoundRetries = 0;
  const MAX_NOT_FOUND_RETRIES = 60;

  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
    }

    if (Date.now() - startTime > maxTimeoutMs) {
      throw new Error('Batas waktu pengerjaan tugas terlampaui. Silakan coba kembali.');
    }

    const cacheBuster = `${Date.now()}-${notFoundRetries}`;
    const statusRes = await fetch(`${backendUrl}/jobs/${jobId}?_t=${cacheBuster}`, {
      signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!statusRes.ok) {
      if ((statusRes.status === 404 || statusRes.status === 502 || statusRes.status === 503) && notFoundRetries < MAX_NOT_FOUND_RETRIES) {
        notFoundRetries++;
        // Jeda singkat teracak (450-700ms) agar cepat berpindah ke worker Uvicorn yang memegang job_id
        const retryDelay = Math.round(450 + Math.random() * 250);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }
      const errJson = await statusRes.json().catch(() => ({}));
      throw new Error(errJson.detail || `Gagal memeriksa status tugas (${statusRes.status})`);
    }

    // Reset notFoundRetries jika berhasil mendapat respon 200 OK
    notFoundRetries = 0;

    const jobData = await statusRes.json();
    const { status, progress, message, filename, sample, error } = jobData;

    if (onProgress) {
      onProgress(progress || 0, message || 'Sedang memproses dokumen...');
    }

    if (status === 'error') {
      throw new Error(error || message || 'Gagal memproses dokumen pada server.');
    }

    if (status === 'done') {
      // Unduh biner file hasil dengan mekanisme retry multi-worker (antisipasi 404 saat request mengenai worker lain)
      let dlRes: Response | null = null;
      const MAX_DOWNLOAD_RETRIES = 35;

      for (let dlAttempt = 0; dlAttempt < MAX_DOWNLOAD_RETRIES; dlAttempt++) {
        if (signal?.aborted) {
          throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
        }
        const dlCacheBuster = `${Date.now()}-${dlAttempt}`;
        const candidateRes = await fetch(`${backendUrl}/jobs/${jobId}/download?_t=${dlCacheBuster}`, {
          signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (candidateRes.ok) {
          dlRes = candidateRes;
          break;
        }

        // Jika 404 (worker lain) atau 409 (status transisi) atau 502/503, tunggu sejenak lalu ulangi
        if (
          candidateRes.status === 404 ||
          candidateRes.status === 409 ||
          candidateRes.status === 502 ||
          candidateRes.status === 503
        ) {
          const dlRetryDelay = Math.round(350 + Math.random() * 250);
          await new Promise((resolve) => setTimeout(resolve, dlRetryDelay));
          continue;
        }

        const dlErr = await candidateRes.json().catch(() => ({}));
        throw new Error(dlErr.detail || 'Gagal mengunduh file hasil konversi dari server.');
      }

      if (!dlRes || !dlRes.ok) {
        throw new Error('Gagal mengunduh file hasil konversi dari server setelah beberapa percobaan.');
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
