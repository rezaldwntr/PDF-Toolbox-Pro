
import React from 'react';
import ToolContainer from '../common/ToolContainer';

const AboutUs: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <ToolContainer title="Tentang Kami" onBack={onBack} maxWidth="max-w-3xl">
      <div className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
        <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">PDF Toolbox Pro</h3>
            <p className="text-blue-600 font-medium">Solusi Dokumen Cerdas & Sederhana</p>
        </div>

        <p>
          Kami percaya bahwa bekerja dengan dokumen PDF seharusnya tidak rumit atau mahal. 
          <strong>PDF Toolbox Pro</strong> lahir dari kebutuhan akan alat manipulasi dokumen yang andal, cepat, dan menghormati privasi penggunanya.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 not-prose my-8">
            <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cepat</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Optimasi performa tinggi</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm">
                <div className="text-3xl mb-2">🛡️</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Aman</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enkripsi & Hapus Otomatis</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-700 rounded-2xl text-center border border-gray-100 dark:border-slate-600 shadow-sm">
                <div className="text-3xl mb-2">💎</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Gratis</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Fitur premium untuk semua</p>
            </div>
        </div>
        
        <h3>Misi Kami</h3>
        <p>
            Mempermudah pekerjaan administratif pelajar, profesional, dan bisnis kecil dengan menyediakan seperangkat alat PDF kelas enterprise tanpa biaya langganan yang membebani.
        </p>
        
        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl mt-8">
            <p className="text-sm m-0 italic text-center">
                "Produktivitas bukan tentang bekerja lebih keras, tapi bekerja lebih cerdas dengan alat yang tepat."
            </p>
        </div>
      </div>
    </ToolContainer>
  );
};

export default AboutUs;
