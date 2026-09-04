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
        className="group relative flex flex-col justify-between p-5 rounded-xl border border-dashed border-slate-200 bg-slate-100/75 opacity-75 cursor-not-allowed select-none transition-all h-full"
      >
        <div>
          <div className="w-11 h-11 rounded-xl bg-slate-200/70 text-slate-400 flex items-center justify-center mb-3">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-slate-400 mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Segera hadir</span>
          <Lock size={13} className="text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col justify-between p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer select-none transition-all duration-200 h-full"
    >
      <div>
        {/* Dark Icon inside blue-50 container */}
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
        <span>Proses sekarang</span>
        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

export default ToolCard;