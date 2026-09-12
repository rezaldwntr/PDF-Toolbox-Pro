import React, { useState, useRef } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  Sliders,
  CheckCircle2,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  Printer,
  Copy,
  Edit3,
  FileSignature,
  MessageSquare,
  X
} from 'lucide-react';

declare const pdfjsLib: any;

type ProtectTab = 'basic' | 'advanced';

interface PermissionConfig {
  allowPrint: boolean;
  allowCopy: boolean;
  allowModify: boolean;
  allowAnnotate: boolean;
  allowFillForms: boolean;
}

const ProtectPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [tab, setTab] = useState<ProtectTab>('basic');

  // State Kata Sandi
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);

  // State Izin Dokumen (Tab Lanjutan ala iLovePDF)
  const [permissions, setPermissions] = useState<PermissionConfig>({
    allowPrint: true,
    allowCopy: true,
    allowModify: false,
    allowAnnotate: true,
    allowFillForms: true,
  });

  // State Proses & Hasil
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();

  // 1. Tangani pemilihan file PDF
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      addToast('Harap pilih berkas dengan format .PDF', 'error');
      return;
    }

    setFile(selected);
    setResultUrl(null);
    setResultSize(null);
    setPassword('');
    setConfirmPassword('');
    setOwnerPassword('');

    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        const loadedDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPageCount(loadedDoc.numPages);
      }
    } catch (e) {
      console.warn('Gagal membaca info halaman:', e);
    }
  };

  // 2. Evaluasi kekuatan kata sandi
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: 'Kosong', color: 'bg-slate-200 dark:bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Lemah', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Sedang', color: 'bg-amber-500' };
    return { score: 3, label: 'Kuat', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);
  const isMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = password.length >= 4 && isMatch;

  // 3. Eksekusi Proteksi Dokumen
  const handleProtectPdf = async () => {
    if (!file) return;

    if (!password.trim() || password.length < 4) {
      addToast('Kata sandi harus minimal 4 karakter.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Konfirmasi kata sandi tidak cocok.', 'warning');
      return;
    }

    if (!checkQuotaBeforeAction()) {
      return;
    }

    setIsProcessing(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 menit timeout

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', password);
      if (ownerPassword.trim()) {
        formData.append('owner_password', ownerPassword.trim());
      }
      formData.append('allow_print', permissions.allowPrint ? 'true' : 'false');
      formData.append('allow_copy', permissions.allowCopy ? 'true' : 'false');
      formData.append('allow_modify', permissions.allowModify ? 'true' : 'false');
      formData.append('allow_annotate', permissions.allowAnnotate ? 'true' : 'false');
      formData.append('allow_fill_forms', permissions.allowFillForms ? 'true' : 'false');

      const response = await fetch(`${BACKEND_URL}/tools/protect-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || err.error || 'Gagal memproteksi PDF.');
      }

      const blob = await response.blob();
      setResultSize(blob.size);
      setResultUrl(URL.createObjectURL(blob));
      consumeQuota();
      addToast('PDF berhasil dienkripsi dan diproteksi!', 'success');
    } catch (err: any) {
      clearTimeout(timeoutId);
      addToast(err.name === 'AbortError' ? 'Waktu habis.' : err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // LANGKAH 3: TAMPILAN SUKSES & UNDUH
  // =========================================================================
  if (resultUrl) {
    const origKb = file ? (file.size / 1024).toFixed(1) : '0';
    const newKb = resultSize ? (resultSize / 1024).toFixed(1) : '0';

    return (
      <ToolContainer title="PDF Berhasil Diproteksi!" onBack={onBack} currentStep={3}>
        <div className="text-center flex flex-col items-center gap-6 animate-fade-in py-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Dokumen Anda Telah Dikunci & Dienkripsi
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Dokumen kini dilindungi dengan enkripsi militer <strong>AES-256 Bit</strong>. Siapa pun yang membuka berkas harus memasukkan kata sandi yang Anda tentukan.
            </p>
          </div>

          {/* Ringkasan Berkas */}
          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-around shadow-xs">
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Ukuran Berkas</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{newKb} KB</span>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Standar</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">AES-256</span>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
            <div className="text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Halaman</span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{pageCount || 1}</span>
            </div>
          </div>

          {/* Tombol Unduh */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
            <a
              href={resultUrl}
              download={`protected-${file?.name || 'dokumen.pdf'}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-5 h-5" />
              <span>Unduh PDF Terproteksi</span>
            </a>
            <button
              onClick={() => {
                setFile(null);
                setResultUrl(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Proteksi Berkas Lain</span>
            </button>
          </div>
        </div>
      </ToolContainer>
    );
  }

  // =========================================================================
  // LANGKAH 1: UNGGAH BERKAS
  // =========================================================================
  if (!file) {
    return (
      <ToolContainer
        title="Proteksi PDF"
        description="Kunci dokumen PDF Anda dengan kata sandi kuat dan enkripsi berstandar internasional AES-256."
        onBack={onBack}
        currentStep={1}
      >
        <FileUploader
          onFileSelect={handleFileSelect}
          accept=".pdf"
          label="Pilih Berkas PDF yang Ingin Dikunci"
          description="Enkripsi aman langsung di memori server tanpa jejak berkas di disk"
        />
      </ToolContainer>
    );
  }

  // =========================================================================
  // LANGKAH 2: WORKSPACE KONFIGURASI SANDI & IZIN AKSES
  // =========================================================================
  return (
    <ToolContainer
      title="Atur Proteksi Kata Sandi"
      description="Tentukan kata sandi pembuka serta pengaturan izin dokumen sesuai standar keamanan internasional."
      onBack={onBack}
      maxWidth="max-w-2xl"
      currentStep={2}
    >
      <div className="space-y-6">
        {/* Info Berkas yang Dipilih */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1 max-w-[240px] sm:max-w-xs">
                {file.name}
              </h4>
              <p className="text-xs text-slate-400">
                {(file.size / 1024).toFixed(0)} KB {pageCount > 0 ? `• ${pageCount} halaman` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFile(null);
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" /> Ganti Berkas
          </button>
        </div>

        {/* Tab Switcher: Dasar vs Lanjutan (Benchmark iLovePDF) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTab('basic')}
            className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'basic'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Mode Dasar (Cepat)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('advanced')}
            className={`py-2 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'advanced'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Mode Lanjutan (Izin Akses)</span>
          </button>
        </div>

        {/* =============================================================== */}
        {/* TAB 1: MODE DASAR                                              */}
        {/* =============================================================== */}
        {tab === 'basic' && (
          <div className="space-y-4 animate-fade-in">
            {/* Input Kata Sandi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi untuk Membuka Dokumen *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi (minimal 4 karakter)"
                  className="w-full pl-3.5 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1.5 h-1.5">
                    <div className={`flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Kekuatan kata sandi:</span>
                    <span className={`font-semibold ${
                      strength.score === 1 ? 'text-rose-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Konfirmasi Kata Sandi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ulangi Kata Sandi *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi di atas"
                  className={`w-full pl-3.5 pr-10 py-3 bg-white dark:bg-slate-900 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white font-medium ${
                    confirmPassword.length > 0 && !isMatch
                      ? 'border-rose-300 dark:border-rose-800'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Status Kesesuaian */}
              {confirmPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  {isMatch ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      ✓ Kata sandi cocok
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      ⚠️ Kata sandi belum cocok
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 2: MODE LANJUTAN (OWNER PASSWORD & PERMISSIONS)            */}
        {/* =============================================================== */}
        {tab === 'advanced' && (
          <div className="space-y-5 animate-fade-in">
            {/* Kata Sandi Buka (Sinkron) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi Buka Dokumen (User Password) *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Kata sandi untuk membuka berkas"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Kata Sandi Pemilik / Master (Opsional) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kata Sandi Pemilik / Master (Opsional)
                </label>
                <span className="text-[10px] text-slate-400">Hak kelola izin penuh</span>
              </div>
              <div className="relative">
                <input
                  type={showOwnerPassword ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={e => setOwnerPassword(e.target.value)}
                  placeholder="Kosongkan jika ingin disamakan dengan kata sandi pembuka"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Kata sandi master memungkinkan Anda mengubah izin di aplikasi seperti Adobe Acrobat tanpa dibatasi.
              </p>
            </div>

            {/* Checklist Izin Akses (Permissions) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wider">
                Izin Akses Dokumen (Permissions)
              </label>
              <div className="space-y-2.5">
                {[
                  {
                    id: 'allowPrint',
                    label: 'Izinkan Mencetak Dokumen (Printing)',
                    desc: 'Pengguna dapat mencetak berkas ke printer fisik maupun virtual',
                    icon: <Printer className="w-4 h-4 text-blue-500" />,
                    checked: permissions.allowPrint,
                  },
                  {
                    id: 'allowCopy',
                    label: 'Izinkan Salin Teks & Media (Copying)',
                    desc: 'Pengguna dapat menyalin teks dan gambar dari dalam PDF',
                    icon: <Copy className="w-4 h-4 text-purple-500" />,
                    checked: permissions.allowCopy,
                  },
                  {
                    id: 'allowModify',
                    label: 'Izinkan Modifikasi Isi Dokumen',
                    desc: 'Pengguna dapat menyunting atau mengubah struktur halaman',
                    icon: <Edit3 className="w-4 h-4 text-amber-500" />,
                    checked: permissions.allowModify,
                  },
                  {
                    id: 'allowFillForms',
                    label: 'Izinkan Mengisi Formulir PDF',
                    desc: 'Pengguna dapat mengisi bidang formulir interaktif',
                    icon: <FileSignature className="w-4 h-4 text-emerald-500" />,
                    checked: permissions.allowFillForms,
                  },
                  {
                    id: 'allowAnnotate',
                    label: 'Izinkan Menambahkan Catatan & Anotasi',
                    desc: 'Pengguna dapat menandai (highlight) dan memberi komentar',
                    icon: <MessageSquare className="w-4 h-4 text-cyan-500" />,
                    checked: permissions.allowAnnotate,
                  },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={e =>
                        setPermissions(prev => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security & Standard Notice Box (Smallpdf & iLovePDF benchmark) */}
        <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Standar Keamanan Internasional AES-256 Bit (ISO 32000)</span>
          </div>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
            Kata sandi Anda <strong>tidak disimpan di server kami</strong> demi privasi dan kerahasiaan Anda. Harap simpan atau catat kata sandi ini dengan baik, karena berkas yang terenkripsi tidak dapat dibuka kembali jika kata sandi hilang.
          </p>
        </div>

        {/* Tombol Eksekusi Proteksi */}
        <button
          onClick={handleProtectPdf}
          disabled={!isPasswordValid || isProcessing}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Mengenkripsi Dokumen...</span>
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              <span>Kunci & Proteksi PDF Sekarang</span>
            </>
          )}
        </button>
      </div>
    </ToolContainer>
  );
};

export default ProtectPdf;
