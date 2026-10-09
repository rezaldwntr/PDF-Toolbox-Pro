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
    cls: 'bg-[#314028]/10 text-[#314028] dark:text-emerald-400 border-[#314028]/25',
  },
  fast: {
    label: 'Server Fast',
    cls: 'bg-[#9B4819]/10 text-[#9B4819] dark:text-amber-400 border-[#9B4819]/25',
  },
  cloud: {
    label: 'Heavy Cloud',
    cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
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
        className="group relative flex flex-col justify-between p-5 rounded-t-[28px] rounded-b-2xl border border-dashed border-border-subtle bg-elevated/50 opacity-60 cursor-not-allowed select-none transition-all h-full"
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border-subtle text-text-secondary flex items-center justify-center shrink-0">
              {icon}
            </div>
            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-border-subtle text-text-secondary">
              Segera Hadir
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-text-secondary mb-1">
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
      className="group relative flex flex-col justify-between p-5.5 rounded-t-[28px] rounded-b-2xl border border-border-subtle bg-surface hover:border-[#9B4819]/40 hover:shadow-paper hover:-translate-y-1 cursor-pointer select-none transition-all duration-300 h-full shadow-2xs"
    >
      <div>
        {/* Header Kartu: Segel Ikon Kriya di kiri & Badge Mesin di kanan */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="w-10 h-10 rounded-full bg-elevated border border-border-subtle group-hover:border-[#9B4819]/40 group-hover:bg-[#9B4819] group-hover:text-white text-text-primary flex items-center justify-center shrink-0 transition-all duration-300 shadow-2xs">
            {icon}
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9B4819]/10 text-[#9B4819] border border-[#9B4819]/25">
                {badge}
              </span>
            )}
            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${engine.cls} tracking-tight`}>
              {engine.label}
            </span>
          </div>
        </div>

        <h3 className="font-serif font-bold text-base sm:text-[17px] text-text-primary group-hover:text-[#9B4819] transition-colors mb-1.5 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs font-medium text-text-secondary group-hover:text-[#9B4819] transition-colors">
        <span>Buka Perkakas</span>
        <ArrowRight size={14} className="transform group-hover:translate-x-1.5 transition-transform" />
      </div>
    </div>
  );
};

export default ToolCard;