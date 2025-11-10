
import React from 'react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-start"
    >
      <div className="bg-slate-700 p-3 rounded-lg text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm flex-grow">{description}</p>
    </div>
  );
};

export default ToolCard;
