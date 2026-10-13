# Mandatory Pre-Commit Quality & Security Protocol (PDFindo / PDF Toolbox Pro)

Setiap kali melakukan pembaruan, penambahan fitur, atau perbaikan bug pada repositori ini, agen **WAJIB** menjalankan daftar periksa (**Checklist**) dari dua standar berikut **SEBELUM** melakukan `git commit` dan `git push`:

1. **Open Code Review (`alibaba/open-code-review`)** — Detail lengkap di [`.agents/skills/open-code-review/SKILL.md`](.agents/skills/open-code-review/SKILL.md)
2. **Security Audit Skill (`cloudflare/security-audit-skill`)** — Detail lengkap di [`.agents/skills/security-audit/SKILL.md`](.agents/skills/security-audit/SKILL.md)

---

## 1. Checklist Wajib `open-code-review` (Git Diff, State & Runtime Safety)
Sebelum commit, periksa seluruh perubahan (`git diff`) terhadap poin-poin berikut:
- **Uji `git diff` Baris demi Baris**: Pastikan tidak ada regresi logika, perubahan kontrak antar-komponen yang terlewat, atau penghapusan kode/komentar penting secara tidak sengaja.
- **React State & Re-render Safety**:
  - **DILARANG** mengirimkan nilai non-deterministik secara *inline* pada render prop (seperti `Date.now()`, `Math.random()`, `new Date()`, atau objek/fungsi baru tanpa *memoization*) ke komponen anak yang menggunakannya di dalam dependency `useEffect` (misal: `DownloadResultCard`). Simpan nilai tersebut di `useState` saat proses selesai.
  - **Idempotency pada `useEffect`**: Setiap efek samping yang menyimpan data ke `IndexedDB`, `localStorage`, atau *telemetry* wajib memiliki *idempotency lock* (`useRef` / kunci dedup) agar *re-render* induk atau *React StrictMode* tidak menggandakan riwayat/log.
- **Null, Undefined & Numeric Safety**:
  - Gunakan *optional chaining* dan nilai *fallback* aman pada setiap akses properti/array.
  - Cegah pembagian dengan nol (`NaN`/`Infinity`) dan pastikan perhitungan metrik/waktu langkah (*step duration*) selalu akurat dan bernilai positif.
- **Resource & Memory Cleanup**:
  - Pastikan `URL.createObjectURL` dibersihkan (`URL.revokeObjectURL`) sesuai siklus hidup komponen/retensi, serta *timer* (`setInterval`/`setTimeout`) dan *event listener* dibersihkan pada *cleanup* `useEffect`.
- **Verifikasi Statis & Build**:
  - Wajib menjalankan `npm.cmd run type-check` (`0 error`) dan `npm.cmd run build` (`0 error`).

---

## 2. Checklist Wajib `security-audit-skill` (Input/Output, Auth & Data Isolation)
Sebelum commit, pastikan perubahan lolos audit keamanan defensif berikut:
- **Keamanan Input & Output (Anti-XSS, Anti-XML Injection, Anti-Path Traversal)**:
  - **Sanitasi XML/OpenXML**: Semua teks dinamis yang dimasukkan ke dalam generator `.xlsx` atau `.docx` wajib melalui fungsi `escapeXml()` dan pembersihan karakter kontrol XML ilegal.
  - **Sanitasi DOM & URL**: Jangan gunakan `dangerouslySetInnerHTML` tanpa sanitasi ketat. Validasi skema URL (`blob:`, `https:`) dan sanitasi nama file unduhan.
- **Keamanan Autentikasi, Otorisasi & Penegakan Paket (Tier Enforcement)**:
  - Pastikan batasan kuota dan masa aktif tautan unduh mengikuti paket aktif pengguna secara ketat (`Gratis/Tamu`: `0 jam` / langsung dihapus dari server; `Flash Pass`: `6 jam`; `Monthly Pro`: `24 jam`; `Annual Pass`: `48 jam`).
  - Pastikan tidak ada *hardcoded secret*, *token*, atau kredensial di dalam `git diff`.
- **Isolasi Data & Kepatuhan Privasi (UU PDP No. 27 Tahun 2022)**:
  - Pastikan riwayat berkas dan *Blob* diisolasi per `userId` (`email`) dan berkas yang telah kedaluwarsa (`expiresAt <= Date.now()`) otomatis dihapus serta tidak dapat diunduh kembali.

---

## 3. Alur Git & Sinkronisasi Branch
Setelah lolos kedua checklist di atas serta `type-check` dan `build`:
1. Commit perubahan pada branch kerja (`plan_pdf_feature_roadmap`).
2. Push ke `origin/plan_pdf_feature_roadmap`, `origin/preview`, dan `origin/main`.
3. Sinkronkan (*pull*) perubahan terbaru ke worktree lokal sekunder (`G:\My Drive\Dev APPS\PDF Toolbox Pro`).
