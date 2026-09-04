import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ 
  icon, 
  title, 
  description, 
  active = true, 
  onClick 
}) => {
  const { addToast } = useToast();

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
        className="group relative flex flex-col justify-between p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-100/75 dark:bg-[#161A22] opacity-75 dark:opacity-60 cursor-not-allowed select-none transition-all h-full"
      >
        <div>
          <div className="w-11 h-11 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-slate-400 dark:text-slate-500 mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-medium">
          <span>Segera hadir</span>
          <Lock size={13} className="text-slate-400 dark:text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col justify-between p-5 rounded-xl border border-slate-200 dark:border-[#2D3748] bg-white dark:bg-[#1E222B] hover:border-blue-500 dark:hover:border-blue-500/60 hover:shadow-card-hover dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 cursor-pointer select-none transition-all duration-200 h-full"
    >
      <div>
        {/* Dark Icon inside blue-50 (light) / slate-800 (dark) container */}
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        <span>Proses sekarang</span>
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default ToolCard;