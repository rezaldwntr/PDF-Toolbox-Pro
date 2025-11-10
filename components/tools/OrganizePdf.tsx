
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface OrganizePdfProps {
  onBack: () => void;
}

const OrganizePdf: React.FC<OrganizePdfProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Atur PDF" onBack={onBack}>
      <div className="text-center text-slate-400">
        <p className="text-lg">Fitur untuk mengatur halaman PDF akan segera tersedia.</p>
        <p className="mt-2">Anda akan dapat menyusun ulang, memutar, dan menghapus halaman di sini.</p>
      </div>
    </ToolContainer>
  );
};

export default OrganizePdf;
