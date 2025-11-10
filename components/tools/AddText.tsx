
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface AddTextProps {
  onBack: () => void;
}

const AddText: React.FC<AddTextProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Tambahkan Teks" onBack={onBack}>
      <div className="text-center text-slate-400">
        <p className="text-lg">Fitur untuk menambahkan teks ke file PDF akan segera tersedia.</p>
        <p className="mt-2">Anda akan dapat menulis dan memformat teks di sini.</p>
      </div>
    </ToolContainer>
  );
};

export default AddText;
