import React, { useState, useRef, useEffect } from 'react';
import ToolContainer from '../common/ToolContainer';
import FileUploader from '../common/FileUploader';
import ProcessingStepper from '../common/ProcessingStepper';
import DownloadResultCard from '../common/DownloadResultCard';
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
  Printer,
  Copy,
  Edit3,
  FileSignature,
  MessageSquare,
  FileText,
  Trash2,
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

  // Keyboard shortcut Enter: eksekusi jika berkas dan sandi siap (Design Bible Section 4.2 & 5.15)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && file && isPasswordValid && !isProcessing && !resultUrl) {
        e.preventDefault();
        handleProtectPdf();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, isPasswordValid, isProcessing, resultUrl, handleProtectPdf]);

  if (isProcessing) {
    return (
      <ToolContainer title="Memproses Proteksi PDF" onBack={onBack} currentStep={2}>
        <ProcessingStepper toolName="Proteksi Sandi PDF" isLocalRam={false} />
      </ToolContainer>
    );
  }

  if (resultUrl) {
    return (
      <ToolContainer title="PDF Berhasil Diproteksi!" onBack={onBack} currentStep={3}>
        <DownloadResultCard
          fileName={`protected-${file?.name || 'document.pdf'}`}
          downloadUrl={resultUrl}
          originalSize={file?.size}
          resultSize={resultSize ?? undefined}
          onReset={() => {
            setResultUrl(null);
            setResultSize(null);
            setPassword('');
            setConfirmPassword('');
          }}
          resetLabel="Proteksi Berkas Lain"
          customSuccessMessage="Dokumen Anda kini terlindungi dengan enkripsi militer AES-256 bit."
          isLocalRam={false}
        />
      </ToolContainer>
    );
  }

  // KANVAS: Lembaran Kertas Realistis & Dokumen Terproteksi (Section 5.15)
  const canvasSlot = file && (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface p-6 rounded-2xl border border-border-subtle shadow-paper text-center relative group">
        <button
          type="button"
          onClick={() => { setFile(null); setPassword(''); setConfirmPassword(''); }}
          title="Hapus dan pilih berkas lain"
          className="absolute top-3 right-3 p-1.5 rounded-full text-status-error bg-surface hover:bg-status-error/10 border border-border-subtle cursor-pointer"
        >
          <Trash2 size={14} />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock size={30} />
        </div>

        <h4 className="font-bold text-sm text-text-primary truncate px-2 mb-1" title={file.name}>
          {file.name}
        </h4>
        <p className="text-xs text-text-secondary font-mono mb-4">
          {(file.size / 1024).toFixed(0)} KB {pageCount > 0 ? `• ${pageCount} Halaman` : ''}
        </p>

        <div className="p-3 rounded-xl bg-elevated border border-border-subtle space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-accent-primary">
            <ShieldCheck size={14} />
            <span>Target Enkripsi AES-256 Bit</span>
          </div>
          <p className="text-[11px] text-text-secondary">
            {isPasswordValid ? 'Kata sandi siap diterapkan.' : 'Tentukan kata sandi pada panel inspektor di samping.'}
          </p>
        </div>
      </div>
    </div>
  );

  // PANEL INSPEKTOR: Konfigurasi Sandi, Meteran, & Izin Dokumen (Section 5.15)
  const inspectorSlot = file && (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <h3 className="font-bold text-sm text-text-primary">Pengaturan Sandi</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
          AES-256
        </span>
      </div>

      {/* Tab Switcher: Dasar vs Lanjutan */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-elevated rounded-xl border border-border-subtle">
        <button
          type="button"
          onClick={() => setTab('basic')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === 'basic' ? 'bg-surface text-accent-primary shadow-2xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Mode Cepat
        </button>
        <button
          type="button"
          onClick={() => setTab('advanced')}
          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            tab === 'advanced' ? 'bg-surface text-accent-primary shadow-2xs border border-border-subtle' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Izin Akses
        </button>
      </div>

      {/* Password Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-text-primary mb-1">Kata Sandi Dokumen *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimal 4 karakter"
              className="w-full pl-3 pr-9 py-2 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent-primary font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-2.5 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Strength Meter */}
        {password && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-text-secondary">Kekuatan Sandi</span>
              <span className="font-bold text-text-primary">{strength.label}</span>
            </div>
            <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden flex gap-1">
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  className={`h-full flex-1 rounded-full transition-all ${
                    step <= strength.score ? strength.color : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-text-primary mb-1">Konfirmasi Sandi *</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi"
              className={`w-full pl-3 pr-9 py-2 bg-surface border rounded-lg text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent-primary font-mono ${
                confirmPassword && !isMatch ? 'border-status-error' : 'border-border-subtle'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2.5 top-2.5 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {confirmPassword && !isMatch && (
            <p className="text-[10px] text-status-error mt-1">Kata sandi tidak cocok</p>
          )}
        </div>
      </div>

      {/* Advanced Tab: Permissions & Owner Password */}
      {tab === 'advanced' && (
        <div className="space-y-3 pt-2 border-t border-border-subtle">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Kata Sandi Pemilik (Opsional)</label>
            <input
              type="password"
              value={ownerPassword}
              onChange={e => setOwnerPassword(e.target.value)}
              placeholder="Untuk izin editing master"
              className="w-full px-3 py-2 bg-surface border border-border-subtle rounded-lg text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Batasan Izin</label>
            {[
              { id: 'allowPrint', label: 'Izinkan Cetak Dokumen', checked: permissions.allowPrint },
              { id: 'allowCopy', label: 'Izinkan Salin Teks/Objek', checked: permissions.allowCopy },
              { id: 'allowModify', label: 'Izinkan Modifikasi Isi', checked: permissions.allowModify },
              { id: 'allowAnnotate', label: 'Izinkan Catatan & Anotasi', checked: permissions.allowAnnotate },
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-elevated cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => setPermissions(prev => ({ ...prev, [item.id]: e.target.checked }))}
                  className="rounded text-accent-primary focus:ring-accent-primary cursor-pointer"
                />
                <span className="text-text-primary">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Security Assurance */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-border-subtle text-[11px] text-text-secondary">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>Kata sandi tidak pernah disimpan di server kami (Zero-Retention).</span>
      </div>

      {/* Primary Action Button (CTA) */}
      <button
        type="button"
        onClick={handleProtectPdf}
        disabled={!isPasswordValid || isProcessing}
        className="w-full bg-accent-primary hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs sm:text-sm mt-3"
      >
        <Lock size={15} />
        <span>Kunci & Enkripsi PDF (↵)</span>
      </button>
    </div>
  );

  return (
    <ToolContainer 
      title="Proteksi PDF" 
      description="Kunci dokumen PDF Anda dengan kata sandi kuat dan enkripsi berstandar internasional AES-256."
      onBack={onBack} 
      maxWidth="max-w-5xl"
      currentStep={!file ? 1 : 2}
      canvasSlot={file ? canvasSlot : undefined}
      inspectorSlot={file ? inspectorSlot : undefined}
      fileInfo={file ? { originalSize: file.size, estimatedSize: file.size, isLocalRam: false } : undefined}
    >
      {!file && (
        <FileUploader 
          onFileSelect={handleFileSelect} 
          accept=".pdf"
          label="Pilih Berkas PDF yang Ingin Dikunci"
          description="Enkripsi aman langsung di memori server tanpa jejak berkas di disk"
        />
      )}
    </ToolContainer>
  );
};

export default ProtectPdf;
