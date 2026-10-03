import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Check, Loader2 } from 'lucide-react';

interface ProcessingStepperProps {
  toolName?: string;
  isLocalRam?: boolean;
  onCancel?: () => void;
}

const ProcessingStepper: React.FC<ProcessingStepperProps> = ({ 
  toolName = 'Dokumen',
  isLocalRam = false,
  onCancel 
}) => {
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Simulasi tahapan progres mikro-interaksi taktil sesuai Section 7.1
    const t1 = setTimeout(() => {
      setCurrentStage(2);
      setProgress(55);
    }, 900);

    const t2 = setTimeout(() => {
      setCurrentStage(3);
      setProgress(90);
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const stages = [
    {
      step: 1,
      title: isLocalRam ? 'Memuat Berkas ke RAM Browser' : 'Mengunggah & Memeriksa Enkripsi',
      desc: isLocalRam ? 'In-memory buffer (Zero server upload)' : 'TLS 1.3 enkripsi bank-grade',
    },
    {
      step: 2,
      title: isLocalRam ? 'Menjalankan WebAssembly Engine' : `Menjalankan ${toolName} Engine`,
      desc: isLocalRam ? 'Komputasi lokal di thread browser' : 'Akselerasi server cepat PyMuPDF',
    },
    {
      step: 3,
      title: 'Memverifikasi Integritas & Menyiapkan Output',
      desc: 'Validasi biner PDF & enkripsi hasil',
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-surface rounded-2xl border border-border-subtle shadow-card animate-fade-in text-center select-none">
      
      {/* Icon & Tool Name */}
      <div className="w-12 h-12 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center mx-auto mb-3.5">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>

      <h3 className="text-base font-bold text-text-primary tracking-tight mb-1">
        Memproses {toolName}...
      </h3>
      <p className="text-xs text-text-secondary mb-5">
        {isLocalRam 
          ? 'Pemrosesan aman 100% di memori browser Anda.' 
          : 'Data terlindungi enkripsi TLS 1.3 dan auto-wipe 60 menit.'}
      </p>

      {/* Progress Bar Persentase */}
      <div className="w-full bg-elevated rounded-full h-2 mb-6 overflow-hidden border border-border-subtle p-0.5">
        <div 
          className="bg-accent-primary h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 3 Tahap Eksekusi (Section 7.1) */}
      <div className="space-y-3.5 text-left mb-6">
        {stages.map((st) => {
          const isDone = currentStage > st.step;
          const isActive = currentStage === st.step;

          return (
            <div 
              key={st.step}
              className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                isActive
                  ? 'border-accent-primary/50 bg-accent-primary/5 shadow-2xs'
                  : isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border-subtle bg-surface/50 opacity-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-accent-primary text-white flex items-center justify-center">
                    <Loader2 size={12} className="animate-spin" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-elevated border border-border-subtle text-text-secondary flex items-center justify-center text-[10px] font-bold">
                    {st.step}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-accent-primary' : isDone ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {st.title}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                  {st.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Guarantee Pill */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-secondary font-medium pt-3 border-t border-border-subtle">
        {isLocalRam ? (
          <>
            <Cpu size={12} className="text-emerald-500" />
            <span>RAM Lokal WebAssembly • Zero Log Guarantee</span>
          </>
        ) : (
          <>
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Kepatuhan UU PDP No. 27/2022 • TLS 1.3 Active</span>
          </>
        )}
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-xs text-text-secondary hover:text-status-error font-medium transition-colors cursor-pointer"
        >
          Batalkan Proses
        </button>
      )}
    </div>
  );
};

export default ProcessingStepper;
