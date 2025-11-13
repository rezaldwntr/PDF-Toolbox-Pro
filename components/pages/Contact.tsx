import React from 'react';
import ToolContainer from '../common/ToolContainer';

interface ContactProps {
  onBack: () => void;
}

const Contact: React.FC<ContactProps> = ({ onBack }) => {
  return (
    <ToolContainer title="Hubungi Kami" onBack={onBack} maxWidth="max-w-2xl">
      <div className="text-center text-slate-300 prose prose-invert prose-lg max-w-none">
        <p>
          Punya pertanyaan, masukan, atau saran? Kami ingin sekali mendengar dari Anda.
        </p>
        <p>
          Cara terbaik untuk menghubungi adalah melalui Instagram.
        </p>
        <p>
          Hubungi pembuatnya:{' '}
          <a
            href="https://instagram.com/rezaldwntr"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            @rezaldwntr
          </a>
        </p>
      </div>
    </ToolContainer>
  );
};

export default Contact;
