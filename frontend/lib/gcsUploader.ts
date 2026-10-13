import { BACKEND_URL } from '../config';
import { supabase } from '../lib/supabase';
import { pollJobUntilDone, handleJobOrDirectResponse, JobResult, JobProgressCallback } from './jobPoller';

export interface SmartUploadOptions {
  file: File;
  action: 'word' | 'excel' | 'ppt' | 'image' | 'ocr' | 'translate';
  directEndpoint: string;
  formData: FormData;
  actionOptions?: Record<string, any>;
  userTier?: string;
  onProgress?: JobProgressCallback;
  signal?: AbortSignal;
}

/**
 * Smart Upload Handler (Tier 3 Architecture):
 * 1. Jika ukuran file > 25 MB (atau jika tier pro / monthly / annual):
 *    - Meminta Signed URL dari backend via POST /storage/presigned-upload
 *    - Jika backend memberikan signed URL, file diunggah langsung ke Google Cloud Storage via PUT
 *      dengan pemantauan progres upload (0-30%).
 *    - Setelah sukses, memicu POST /storage/process-job dan melakukan polling hingga selesai (30-100%).
 * 2. Jika berkas kecil (< 25 MB) atau GCS tidak tersedia:
 *    - Otomatis fallback ke endpoint direct multipart standar, diproses mulus oleh handleJobOrDirectResponse().
 */
export async function smartUploadAndProcess(options: SmartUploadOptions): Promise<JobResult> {
  const {
    file,
    action,
    directEndpoint,
    formData,
    actionOptions = {},
    userTier = 'free',
    onProgress,
    signal,
  } = options;

  const fileSize = file.size;
  const isLargeFile = fileSize > 25 * 1024 * 1024; // > 25 MB

  // Gunakan GCS Presigned Upload hanya untuk berkas berukuran besar (> 25 MB)
  // agar berkas reguler (< 25 MB) diproses secara instan tanpa overhead roundtrip tambahan
  if (isLargeFile) {
    try {
      if (onProgress) onProgress(2, 'Menghubungkan ke Google Cloud Storage...');

      const sessionRes = supabase ? await supabase.auth.getSession().catch(() => null) : null;
      const accessToken = sessionRes?.data?.session?.access_token;

      const presignRes = await fetch(`${BACKEND_URL}/storage/presigned-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Tier': userTier,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          file_size: fileSize,
          content_type: file.type || 'application/pdf',
          tier: userTier,
        }),
        signal,
      });

      if (presignRes.ok) {
        const presignData = await presignRes.json();

        if (presignData.use_gcs && presignData.upload_url) {
          // Upload langsung ke GCS via PUT XMLHttpRequest (untuk progress)
          if (onProgress) onProgress(5, `Mengunggah berkas (${(fileSize / (1024 * 1024)).toFixed(1)} MB) ke Cloud Storage...`);

          await uploadDirectToGCS(presignData.upload_url, file, file.type || 'application/pdf', (uploadPct) => {
            if (onProgress) {
              const overallPct = Math.round(5 + (uploadPct / 100) * 25); // 5% sampai 30%
              onProgress(overallPct, `Mengunggah ke Cloud Storage (${uploadPct}%)...`);
            }
          }, signal);

          if (onProgress) onProgress(32, 'Memulai pemrosesan asinkronus di server...');

          // Panggil process-job
          const processRes = await fetch(`${BACKEND_URL}/storage/process-job`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              blob_name: presignData.blob_name,
              action,
              options: actionOptions,
            }),
            signal,
          });

          if (!processRes.ok) {
            const errData = await processRes.json().catch(() => ({}));
            throw new Error(errData.detail || 'Gagal memulai pemrosesan berkas di server.');
          }

          const jobJson = await processRes.json();
          if (jobJson.job_id) {
            return await pollJobUntilDone({
              jobId: jobJson.job_id,
              backendUrl: BACKEND_URL,
              onProgress: (progress, message) => {
                // Skala progres dari 30% hingga 100%
                const scaled = Math.round(30 + (progress / 100) * 70);
                if (onProgress) onProgress(scaled, message);
              },
              signal,
            });
          }
        }
      }
    } catch (gcsErr: any) {
      if (gcsErr.name === 'AbortError') throw gcsErr;
      console.warn('[GCS Uploader] GCS upload tidak dapat dilanjutkan, mencoba direct fallback:', gcsErr);
      if (gcsErr.message && gcsErr.message.includes('melebihi batas')) {
        throw gcsErr;
      }
    }
  }

  // Direct Multipart Upload (dengan 1x auto-retry jika terjadi gangguan koneksi/worker transien)
  const directUrl = directEndpoint.startsWith('http') ? directEndpoint : `${BACKEND_URL}${directEndpoint}`;
  let lastError: any = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Proses dibatalkan oleh pengguna.', 'AbortError');
    }
    try {
      if (onProgress) {
        onProgress(
          attempt === 0 ? 5 : 10,
          attempt === 0 ? 'Mengirim berkas ke server pemroses...' : 'Menghubungkan ulang ke worker pemroses...'
        );
      }
      const response = await fetch(directUrl, {
        method: 'POST',
        body: formData,
        signal,
        cache: 'no-store',
      });

      return await handleJobOrDirectResponse(response, BACKEND_URL, onProgress, signal);
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      lastError = err;
      // Jangan retry jika error validasi ukuran/halaman dokumen
      if (
        err?.message &&
        (err.message.includes('melebihi batas') ||
          err.message.includes('Batas maksimal') ||
          err.message.includes('Tidak ada gambar'))
      ) {
        throw err;
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  throw lastError || new Error('Gagal memproses berkas di server.');
}

/**
 * Mengunggah biner file langsung ke GCS menggunakan Signed URL metode PUT dengan pelacak progres.
 */
function uploadDirectToGCS(
  signedUrl: string,
  file: File,
  contentType: string,
  onUploadProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload dibatalkan pengguna.', 'AbortError'));
      });
    }

    if (xhr.upload && onUploadProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onUploadProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`GCS Upload gagal (Status ${xhr.status}): ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus saat mengunggah ke Cloud Storage.'));
    };

    xhr.send(file);
  });
}
