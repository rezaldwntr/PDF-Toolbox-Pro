
import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface AddSignatureProps {
  onBack: () => void;
}

const AddSignature: React.FC<AddSignatureProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Tambahkan Tanda Tangan" onBack={onBack}>
      <div className="text-center text-slate-400">
        <p className="text-lg">Fitur untuk menambahkan tanda tangan digital akan segera tersedia.</p>
        <p className="mt-2">Anda akan dapat menggambar atau mengunggah tanda tangan di sini.</p>
      </div>
    </ToolContainer>
  );
};

export default AddSignature;
