import React, { useState, useRef } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import { useToast } from '../../contexts/ToastContext';
import { useQuota } from '../../contexts/QuotaContext';
import { BACKEND_URL } from '../../config';
import {
  Unlock,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  X
} from 'lucide-react';

declare const pdfjsLib: any;

const UnlockPdf: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);

  // Form State
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [legalAccepted, setLegalAccepted] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Processing & Result State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // 1. Tangani pemilihan file PDF & deteksi status enkripsi
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
    setErrorMessage(null);
    setIsEncrypted(null);
    setPageCount(0);

    // Deteksi client-side dengan pdfjsLib
    try {
      const buffer = await selected.arrayBuffer();
      if (typeof pdfjsLib !== 'undefined') {
        let passwordNeeded = false;
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        
        loadingTask.onPassword = (_callback: any, _reason: any) => {
          passwordNeeded = true;
          setIsEncrypted(true);
        };

        try {
          const loadedDoc = await loadingTask.promise;
          setPageCount(loadedDoc.numPages);
          if (!passwordNeeded) {
            setIsEncrypted(false);
          }
        } catch (innerErr: any) {
          if (innerErr?.name === 'PasswordException' || passwordNeeded) {
            setIsEncrypted(true);
            setTimeout(() => passwordInputRef.current?.focus(), 200);
          } else {
            // Asumsikan dokumen mungkin terenkripsi atau butuh pengujian server
            setIsEncrypted(true);
          }
        }
      } else {
        // Fallback jika pdfjsLib belum siap
        setIsEncrypted(true);
      }
    } catch (e) {
      console.warn('Deteksi enkripsi:', e);
      setIsEncrypted(true);
    }
  };

  // 2. Eksekusi Pembukaan Kunci (POST /tools/unlock-pdf)
  const handleUnlockPdf = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;

    if (!checkQuotaBeforeAction()) return;

    if (!legalAccepted) {
      addToast('Harap centang persetujuan hak akses kepemilikan dokumen.', 'warning');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (password.trim()) {
      formData.append('password', password.trim());
    }

    try {
      const response = await fetch(`${BACKEND_URL}/tools/unlock-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errDetail = 'Gagal membuka kunci PDF';
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {
          // Gagal parse json
        }

        if (response.status === 401) {
          setErrorMessage(errDetail || 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.');
          addToast('Kata sandi salah!', 'error');
          passwordInputRef.current?.focus();
        } else {
          setErrorMessage(errDetail);
          addToast(errDetail, 'error');
        }
        setIsProcessing(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);

      // Pengurangan kuota
      consumeQuota();

      addToast('Dokumen berhasil dibuka kuncinya!', 'success');
    } catch (error: any) {
      console.error('Error unlock PDF:', error);
      const msg = error.message || 'Terjadi kesalahan jaringan saat membuka kunci dokumen.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Unduh berkas hasil pembukaan kunci
  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    let base = file.name.replace(/\.pdf$/i, '');
    if (base.toLowerCase().startsWith('protected-')) {
      base = base.substring('protected-'.length);
    }
    link.download = `unlocked-${base}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Reset untuk membuka kunci berkas lain
  const handleReset = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setPassword('');
    setErrorMessage(null);
    setIsEncrypted(null);
    setPageCount(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <ToolContainer
      title="Buka Kunci PDF"
      description="Hapus kata sandi dan seluruh batasan proteksi dari dokumen PDF Anda secara instan dan aman."
      onBack={onBack}
    >
      {/* =================================================================== */}
      {/* LANGKAH 1: UNGGAH DOKUMEN                                          */}
      {/* =================================================================== */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handleFileSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF Terproteksi"
            subtitle="Seret berkas PDF dengan kata sandi ke sini, atau klik untuk memilih dari perangkat"
          />

          {/* Fitur Keunggulan / Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Dekripsi Instan</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pemrosesan super cepat di memori</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Standar ISO & AES</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Dukungan AES-256 & 128 bit</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Privasi Terjamin</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Sandi tidak pernah disimpan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* KONDISI KHUSUS: DOKUMEN TERNYATA TIDAK TERPROTEKSI                 */}
      {/* =================================================================== */}
      {file && !resultUrl && isEncrypted === false && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Dokumen Tidak Terproteksi
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Berkas <span className="font-semibold text-slate-800 dark:text-slate-200">"{file.name}"</span> tidak dilindungi kata sandi pembuka. Dokumen ini dapat langsung dibuka dan diedit di aplikasi pembaca PDF mana pun.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-medium truncate">{file.name}</span>
            </div>
            <span className="shrink-0 font-mono text-slate-400">{formatFileSize(file.size)}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Pilih Berkas Lain
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 2: FORM INPUT KATA SANDI & BUKA KUNCI                      */}
      {/* =================================================================== */}
      {file && !resultUrl && isEncrypted !== false && (
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
          {/* Kartu Ringkasan Dokumen */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3.5 truncate">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/60">
                <Lock className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {file.name}
                </h4>
                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                    <Lock className="w-3 h-3" /> Terproteksi Sandi
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleReset}
              title="Ganti berkas"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Pembukaan Kunci Dokumen */}
          <form onSubmit={handleUnlockPdf} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-7 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-blue-500" />
                  Kata Sandi Dokumen
                </label>
                <span className="text-[11px] text-slate-400">Diperlukan untuk dekripsi</span>
              </div>
              
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan kata sandi pembuka PDF"
                  autoFocus
                  className={`w-full pl-3.5 pr-10 py-3 bg-slate-50/50 dark:bg-slate-900/50 border rounded-xl text-sm transition-all outline-none ${
                    errorMessage
                      ? 'border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200'
                      : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Tampilan Pesan Error Inline */}
              {errorMessage && (
                <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Checkbox Pernyataan Hak Akses & Legalitas (Standar Smallpdf & iLovePDF) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={e => setLegalAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">
                  Saya menyatakan bahwa saya memiliki izin dan hak yang sah untuk membuka kunci serta menghapus proteksi pada dokumen PDF ini.
                </span>
              </label>
            </div>

            {/* Tombol Aksi Buka Kunci */}
            <button
              type="submit"
              disabled={isProcessing || !password.trim() || !legalAccepted}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 ${
                isProcessing || !password.trim() || !legalAccepted
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-md active:scale-[0.99]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mendekripsi & Membuka Kunci...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Buka Kunci PDF</span>
                </>
              )}
            </button>
          </form>

          {/* Privacy & Zero Disk I/O Notice */}
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3 text-xs text-blue-800 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-semibold">Jaminan Privasi:</strong> Berkas Anda diproses secara instan di memori sementara (Zero Disk I/O). Kata sandi Anda diverifikasi tanpa pernah disimpan atau dicatat di server kami.
            </p>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LANGKAH 3: UNDUH BERKAS YANG TELAH TERBUKA                         */}
      {/* =================================================================== */}
      {resultUrl && file && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-fade-in">
          {/* Ikon Sukses Terbuka */}
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200 dark:border-emerald-800">
            <Unlock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Berhasil Dibuka Kuncinya
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Proteksi Dokumen Telah Dihapus
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Semua proteksi kata sandi dan pembatasan izin telah dihilangkan. Berkas PDF ini sekarang dapat dibuka, dicetak, dan disunting secara bebas.
            </p>
          </div>

          {/* Kartu Ringkasan Hasil */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Nama Berkas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                unlocked-{file.name.replace(/^protected-/i, '')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Ukuran Berkas:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {resultSize ? formatFileSize(resultSize) : formatFileSize(file.size)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Status Keamanan:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Bebas Kata Sandi
              </span>
            </div>
          </div>

          {/* Tombol Unduh & Reset */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-emerald-500/25 shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh PDF Terbuka</span>
            </button>

            <button
              onClick={handleReset}
              className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Buka Kunci Berkas Lain</span>
            </button>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default UnlockPdf;
