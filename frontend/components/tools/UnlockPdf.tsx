import React, { useState, useRef, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
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
  FileText,
  AlertTriangle,
  ShieldAlert,
  FileCheck,
  FileSignature,
  FileKey,
  RotateCcw,
} from 'lucide-react';
import { formatFileSize } from '../../lib/formatters';
import { triggerFileDownload } from '../../lib/download';
import { ensurePdfjsReady } from '../../lib/pdfWorker';

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
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const { addToast } = useToast();
  const { consumeQuota, checkQuotaBeforeAction } = useQuota();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Enter to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && !isProcessing && !resultUrl && password.trim() && legalAccepted) {
        e.preventDefault();
        handleUnlockPdf();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isProcessing, resultUrl, password, legalAccepted]);

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

    try {
      const buffer = await selected.arrayBuffer();
      const pdfjs = await ensurePdfjsReady();
      let passwordNeeded = false;
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });

      loadingTask.onPassword = () => {
        passwordNeeded = true;
        setIsEncrypted(true);
      };

      try {
        const loadedDoc = await loadingTask.promise;
        setPageCount(loadedDoc.numPages);
        if (!passwordNeeded) setIsEncrypted(false);
      } catch (innerErr: any) {
        setIsEncrypted(true);
        setTimeout(() => passwordInputRef.current?.focus(), 200);
      }
    } catch {
      setIsEncrypted(true);
    }
  };

  const handleUnlockPdf = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file || !checkQuotaBeforeAction()) return;

    if (!legalAccepted) {
      addToast('Harap centang persetujuan hak akses kepemilikan dokumen.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (password.trim()) formData.append('password', password.trim());

    try {
      setProcessingStep(2);
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
          // ignore json parse error
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

      setProcessingStep(3);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultSize(blob.size);
      consumeQuota();
      addToast('Dokumen berhasil didekripsi & dibuka kuncinya!', 'success');
    } catch (error: any) {
      const msg = error.message || 'Terjadi kesalahan jaringan saat membuka kunci dokumen.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl || !file) return;
    const base = file.name.replace(/\.pdf$/i, '').replace(/^protected-/i, '');
    triggerFileDownload(resultUrl, `unlocked-${base}.pdf`);
  };

  const handleReset = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setPassword('');
    setErrorMessage(null);
    setIsEncrypted(null);
    setPageCount(0);
  };

  return (
    <ToolContainer
      title="Buka Kunci PDF"
      description="Hapus proteksi kata sandi dan batasan keamanan dari dokumen PDF Anda secara instan dan aman."
      onBack={onBack}
      canvasSlot={
        file ? (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-canvas">
            {/* Visual Canvas Paper Preview */}
            <div className="w-full max-w-lg bg-surface rounded-2xl border border-border-subtle p-8 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
              
              <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto mb-5 shadow-xs">
                {isEncrypted === false ? (
                  <FileCheck className="w-10 h-10 text-emerald-500" />
                ) : (
                  <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                )}
              </div>

              <h3 className="text-base font-bold text-text-primary mb-1 truncate px-4" title={file.name}>
                {file.name}
              </h3>
              <p className="text-xs text-text-secondary mb-6">
                {formatFileSize(file.size)} • {pageCount > 0 ? `${pageCount} Halaman • ` : ''}
                {isEncrypted === false ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Bebas Sandi (Tidak Terkunci)</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Terkunci (Memerlukan Sandi)</span>
                )}
              </p>

              {/* Security Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-semibold text-text-primary">Zero Disk I/O</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Dekripsi instan di RAM tanpa jejak penyimpanan server.</p>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSignature className="w-4 h-4 text-indigo-500" />
                    <span className="text-[11px] font-semibold text-text-primary">Standard ISO</span>
                  </div>
                  <p className="text-[10px] text-text-secondary">Mendukung enkripsi RC4, AES-128, dan AES-256 bit.</p>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border-subtle flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Ganti Berkas PDF
                </button>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Keamanan Terverifikasi
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
      inspectorSlot={
        file ? (
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">
                Kunci Dokumen
              </h3>
              <p className="text-xs text-text-secondary">
                {isEncrypted === false
                  ? 'Dokumen ini tidak memiliki proteksi sandi pembuka.'
                  : 'Masukkan kata sandi pemilik atau pengguna untuk membuka enkripsi.'}
              </p>
            </div>

            {isEncrypted === false ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <FileCheck className="w-4 h-4" /> Dokumen Sudah Terbuka
                </div>
                <p className="text-xs text-text-secondary">
                  Dokumen ini tidak terenkripsi. Anda dapat mengunduh atau menyunting dokumen ini secara langsung tanpa perlu proses pembukaan kunci.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                    Kata Sandi PDF
                  </label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Masukkan kata sandi..."
                      className={`w-full pl-3.5 pr-10 py-2.5 bg-canvas border rounded-xl text-sm text-text-primary outline-none transition-all ${
                        errorMessage
                          ? 'border-rose-400 ring-2 ring-rose-500/20'
                          : 'border-border-subtle focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errorMessage && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-canvas border border-border-subtle space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={legalAccepted}
                      onChange={(e) => setLegalAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-[11px] text-text-secondary leading-snug">
                      Saya menyatakan memiliki wewenang atau hak sah untuk membuka dokumen ini.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : undefined
      }
      floatingBarSlot={
        file ? (
          <div className="p-4 bg-surface border-t border-border-subtle flex items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
              <KeyRound className="w-4 h-4 text-accent-primary" />
              <span>{password.trim() ? 'Sandi siap diuji' : 'Masukkan sandi untuk melanjutkan'}</span>
            </div>
            <button
              onClick={() => handleUnlockPdf()}
              disabled={isProcessing || !password.trim() || !legalAccepted || isEncrypted === false}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-accent-primary hover:bg-accent-hover disabled:bg-canvas disabled:text-text-muted text-accent-contrast font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Kunci PDF</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-accent-contrast/20 rounded text-[10px]">↵</kbd>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Upload Phase */}
      {!file && (
        <div className="max-w-2xl mx-auto space-y-6">
          <FileUploader
            onFileSelect={handleFileSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            title="Pilih Berkas PDF Terproteksi"
            subtitle="Seret berkas PDF dengan kata sandi ke sini, atau klik untuk memilih dari perangkat"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Dekripsi Instan</h4>
                <p className="text-[11px] text-text-muted">Proses cepat di memori</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Standar ISO & AES</h4>
                <p className="text-[11px] text-text-muted">AES-256 & 128 bit</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-text-primary">Privasi Terjamin</h4>
                <p className="text-[11px] text-text-muted">Sandi tidak disimpan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="max-w-md mx-auto py-12">
          <ProcessingStepper
            currentStep={processingStep}
            steps={[
              { label: 'Memverifikasi Berkas & Algoritma Enkripsi' },
              { label: 'Mendekripsi Data Stream & Menghapus Hak Akses' },
              { label: 'Memvalidasi Integritas Struktur PDF' },
            ]}
          />
        </div>
      )}

      {/* Result State */}
      {resultUrl && file && (
        <div className="max-w-lg mx-auto py-8">
          <DownloadResultCard
            fileName={`unlocked-${file.name.replace(/^protected-/i, '')}`}
            originalSize={file.size}
            resultSize={resultSize || file.size}
            onDownload={handleDownload}
            onReset={handleReset}
            resetLabel="Buka Kunci Berkas Lain"
            successTitle="Proteksi Dokumen Dihapus!"
            successDescription="Kata sandi pembuka dan semua pembatasan hak akses berhasil dihilangkan dari dokumen."
            resultUrl={resultUrl}
          />
        </div>
      )}
    </ToolContainer>
  );
};

export default UnlockPdf;
