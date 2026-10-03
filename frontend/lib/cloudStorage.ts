// frontend/lib/cloudStorage.ts
/**
 * Modul Integrasi Cloud Storage (Google Drive & Dropbox) Client-Side In-Memory (Fase 4).
 * Sesuai UU PDP No. 27/2022: File dan token tidak pernah singgah di server backend.
 * Mengikuti Ponytail Rules: Prosedural datar, fungsi <= 50 baris, file <= 300 baris.
 */

// Konfigurasi Kredensial Lingkungan (Opsional)
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';
const DROPBOX_APP_KEY = (import.meta as any).env?.VITE_DROPBOX_APP_KEY || '';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
    Dropbox?: any;
  }
}

/** Helper untuk memuat skrip eksternal pihak ketiga secara dinamis & lazy */
export function loadExternalScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return resolve();
    if (document.getElementById(id)) return resolve();

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
    document.body.appendChild(script);
  });
}

/** Mengambil data berkas dari URL publik / Google Drive menjadi objek File standar */
export async function fetchUrlToFile(url: string, fileName: string, mimeType = 'application/pdf'): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal mengunduh berkas dari awan (Status ${res.status}).`);
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Membuka Google Picker API untuk memilih berkas PDF dari Google Drive.
 * Jika kredensial belum ada, mengembalikan berkas demo ramah pengujian.
 */
export async function pickFileFromGoogleDrive(): Promise<File> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
    throw new Error('Google Drive belum terhubung: Kredensial VITE_GOOGLE_CLIENT_ID dan VITE_GOOGLE_API_KEY belum dikonfigurasi di Environment Variables.');
  }

  // 1. Muat Google API dan GIS
  await loadExternalScript('https://apis.google.com/js/api.js', 'gapi-client-script');
  await loadExternalScript('https://accounts.google.com/gsi/client', 'gis-client-script');

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (response.error) return reject(new Error(response.error));

          window.gapi.load('picker', () => {
            const picker = new (window as any).google.picker.PickerBuilder()
              .addView((window as any).google.picker.ViewId.DOCS)
              .setOAuthToken(response.access_token)
              .setDeveloperKey(GOOGLE_API_KEY)
              .setMimeTypes('application/pdf')
              .setCallback(async (data: any) => {
                if (data.action === (window as any).google.picker.Action.PICKED) {
                  const doc = data.docs[0];
                  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`;
                  const fileRes = await fetch(downloadUrl, {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  });
                  const blob = await fileRes.blob();
                  resolve(new File([blob], doc.name, { type: 'application/pdf' }));
                } else if (data.action === (window as any).google.picker.Action.CANCEL) {
                  reject(new Error('Pemilihan berkas Google Drive dibatalkan.'));
                }
              })
              .build();
            picker.setVisible(true);
          });
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Membuka Dropbox Chooser Drop-in untuk memilih berkas dari Dropbox.
 */
export async function pickFileFromDropbox(): Promise<File> {
  if (!DROPBOX_APP_KEY) {
    throw new Error('Dropbox belum terhubung: Kredensial VITE_DROPBOX_APP_KEY belum dikonfigurasi di Environment Variables.');
  }

  await loadExternalScript('https://www.dropbox.com/static/api/2/dropins.js', 'dropboxjs');

  return new Promise((resolve, reject) => {
    if (!window.Dropbox) return reject(new Error('Dropbox SDK tidak tersedia.'));

    window.Dropbox.appKey = DROPBOX_APP_KEY;
    window.Dropbox.choose({
      success: async (files: any[]) => {
        if (!files || files.length === 0) return reject(new Error('Tidak ada berkas yang dipilih.'));
        try {
          const fileInfo = files[0];
          const file = await fetchUrlToFile(fileInfo.link, fileInfo.name);
          resolve(file);
        } catch (e) {
          reject(e);
        }
      },
      cancel: () => reject(new Error('Pemilihan berkas Dropbox dibatalkan.')),
      linkType: 'direct',
      multiselect: false,
      extensions: ['.pdf'],
    });
  });
}

/**
 * Menyimpan berkas Blob ke Google Drive pengguna secara langsung.
 */
export async function saveFileToGoogleDrive(
  blob: Blob,
  fileName: string
): Promise<{ success: boolean; message: string; viewUrl?: string }> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Drive belum terhubung: Kredensial VITE_GOOGLE_CLIENT_ID belum dikonfigurasi di Environment Variables.');
  }

  await loadExternalScript('https://accounts.google.com/gsi/client', 'gis-client-script');

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (resp: any) => {
        if (resp.error) return reject(new Error(resp.error));

        try {
          const metadata = { name: fileName, mimeType: 'application/pdf' };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', blob);

          const uploadRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${resp.access_token}` },
              body: form,
            }
          );

          if (!uploadRes.ok) throw new Error('Gagal mengunggah berkas ke Google Drive.');
          const data = await uploadRes.json();
          resolve({
            success: true,
            message: `Berkas ${fileName} berhasil disimpan ke Google Drive!`,
            viewUrl: data.webViewLink,
          });
        } catch (err: any) {
          reject(err);
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Menyimpan berkas ke Dropbox menggunakan Dropbox Saver Drop-in.
 */
export async function saveFileToDropbox(
  fileUrl: string,
  fileName: string
): Promise<{ success: boolean; message: string }> {
  if (!DROPBOX_APP_KEY) {
    throw new Error('Dropbox belum terhubung: Kredensial VITE_DROPBOX_APP_KEY belum dikonfigurasi di Environment Variables.');
  }

  await loadExternalScript('https://www.dropbox.com/static/api/2/dropins.js', 'dropboxjs');

  return new Promise((resolve, reject) => {
    if (!window.Dropbox) return reject(new Error('Dropbox SDK tidak tersedia.'));
    window.Dropbox.appKey = DROPBOX_APP_KEY;
    window.Dropbox.save({
      files: [{ url: fileUrl, filename: fileName }],
      success: () => resolve({ success: true, message: `Berkas ${fileName} berhasil disimpan ke Dropbox!` }),
      cancel: () => reject(new Error('Penyimpanan ke Dropbox dibatalkan.')),
      error: (errorMessage: string) => reject(new Error(errorMessage)),
    });
  });
}
