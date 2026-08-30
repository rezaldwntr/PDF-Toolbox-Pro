import React from 'react';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

// Komponen kartu yang digunakan untuk menampilkan daftar alat PDF di halaman ToolsPage
const ToolCard: React.FC<ToolCardProps> = ({ icon, title, description, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100 flex flex-col items-start"
    >
      <div className="bg-blue-50 p-3 rounded-lg text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm flex-grow">{description}</p>
    </div>
  );
};

export default ToolCard;