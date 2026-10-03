import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export type EngineType = 'client' | 'fast' | 'cloud';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  engineType?: EngineType;
  badge?: string;
  onClick: () => void;
}

const ENGINE_BADGES: Record<EngineType, { label: string; cls: string }> = {
  client: {
    label: 'RAM Lokal',
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  fast: {
    label: 'Server Fast',
    cls: 'bg-accent-primary/10 text-accent-primary border-accent-primary/30',
  },
  cloud: {
    label: 'Heavy Cloud',
    cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
};

const ToolCard: React.FC<ToolCardProps> = ({ 
  icon, 
  title, 
  description, 
  active = true, 
  engineType = 'fast',
  badge,
  onClick 
}) => {
  const { addToast } = useToast();
  const engine = ENGINE_BADGES[engineType] || ENGINE_BADGES.fast;

  const handleClick = (e: React.MouseEvent) => {
    if (!active) {
      e.preventDefault();
      addToast('Fitur ini sedang dalam tahap pengembangan.', 'info');
      return;
    }
    onClick();
  };

  if (!active) {
    return (
      <div
        onClick={handleClick}
        title="Fitur ini sedang dalam tahap pengembangan."
        className="group relative flex flex-col justify-between p-5 rounded-xl border border-dashed border-border-subtle bg-elevated/60 opacity-60 cursor-not-allowed select-none transition-all h-full"
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-surface border border-border-subtle text-text-secondary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-border-subtle text-text-secondary">
              Segera Hadir
            </span>
          </div>
          <h3 className="text-sm font-semibold text-text-secondary mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-text-secondary/80 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary font-medium">
          <span>Dalam Pengembangan</span>
          <Lock size={12} className="text-text-secondary" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col justify-between p-5 rounded-xl border border-border-subtle bg-surface hover:border-border-strong hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer select-none transition-all duration-200 h-full shadow-2xs"
    >
      <div>
        {/* Header Kartu: Ikon 20x20 di kiri & Badge Mesin di kanan (Section 3.3) */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-elevated border border-border-subtle group-hover:border-accent-primary/40 group-hover:bg-accent-primary group-hover:text-white text-text-primary flex items-center justify-center shrink-0 transition-all duration-200">
            {icon}
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                {badge}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${engine.cls} tracking-tight`}>
              {engine.label}
            </span>
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-text-primary group-hover:text-accent-primary transition-colors mb-1.5 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-semibold text-text-secondary group-hover:text-accent-primary transition-colors">
        <span>Buka Perkakas</span>
        <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default ToolCard;