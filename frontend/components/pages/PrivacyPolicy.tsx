
import React from 'react';
import ToolContainer from '../common/ToolContainer';
import { ShieldIcon, LockIcon } from '../icons';

const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <ToolContainer title="Kebijakan Privasi" onBack={onBack} maxWidth="max-w-4xl">
      <div className="prose prose-lg prose-slate dark:prose-invert max-w-none">
        
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-2xl mb-8">
            <div className="text-2xl">🔒</div>
            <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-500 text-sm m-0">Ringkasan Singkat</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 m-0">Kami tidak menjual data Anda. File diproses secara otomatis dan dihapus setelahnya.</p>
            </div>
        </div>

        <h3>1. Pendekatan Hybrid Kami</h3>
        <p>PDF Toolbox Pro menggunakan teknologi unik untuk menyeimbangkan kecepatan dan keamanan:</p>
        
        <div className="grid md:grid-cols-2 gap-6 not-prose my-8">
            <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 shadow-sm">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center mb-4"><ShieldIcon /></div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Pemrosesan Lokal (Client-Side)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
                    Untuk alat seperti <strong>Atur PDF, Tambah Teks, dan Tanda Tangan</strong>, file Anda diproses sepenuhnya di dalam browser Anda menggunakan teknologi WebAssembly. File ini <strong>tidak pernah</strong> meninggalkan perangkat Anda.
                </p>
            </div>
            <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 shadow-sm">
                 <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center mb-4"><LockIcon /></div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Pemrosesan Cloud (Server-Side)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
                    Untuk tugas berat seperti <strong>Konversi, Kompresi, dan Penggabungan</strong>, file diunggah melalui koneksi terenkripsi (SSL) ke server kami, diproses, dan kemudian <strong>dihapus secara otomatis</strong> (maksimal 1 jam).
                </p>
            </div>
        </div>

        <h3>2. Pengumpulan Data</h3>
        <p>Kami meminimalkan data yang kami kumpulkan:</p>
        <ul>
            <li><strong>File Dokumen:</strong> Hanya disimpan sementara untuk keperluan pemrosesan. Tidak ada manusia yang melihat isi file Anda.</li>
            <li><strong>Log Teknis:</strong> Kami mencatat kesalahan sistem (error logs) untuk perbaikan bug, tanpa mengaitkannya dengan identitas pribadi Anda.</li>
            <li><strong>Tanpa Akun:</strong> Anda tidak perlu mendaftar atau memberikan email untuk menggunakan layanan dasar kami.</li>
        </ul>

        <h3>3. Layanan Pihak Ketiga</h3>
        <p>Website ini didukung oleh iklan untuk tetap gratis. Mitra periklanan kami (seperti Google Adsense) mungkin menggunakan <em>cookies</em> untuk menayangkan iklan yang relevan bagi Anda.</p>
        
        <p className="text-sm text-slate-400 mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </ToolContainer>
  );
};

export default PrivacyPolicy;
