import React from 'react';
import { View } from '../types';
import { Shield, Clock, Lock } from 'lucide-react';

interface FooterProps {
  onSelectView: (view: View) => void;
}

const Footer: React.FC<FooterProps> = ({ onSelectView }) => {
  return (
    <footer className="bg-white dark:bg-[#161A22] border-t border-slate-200 dark:border-slate-800 mt-20 pt-12 pb-8 text-slate-600 dark:text-slate-400 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Banner (Section 4.4) */}
        <div className="bg-slate-50 dark:bg-[#1E222B] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Enkripsi TLS 256-bit</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semua transmisi berkas terproteksi secara aman.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Penghapusan Otomatis</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Berkas dihapus permanen dari server dalam 60 menit.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Privasi 100% Terjaga</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kami tidak pernah membaca atau membagikan isi berkas Anda.</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                P
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-base">PDF Toolbox Pro</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Platform manipulasi dokumen PDF server-side tercepat, andal, dan aman untuk segala kebutuhan pekerjaan dan tugas Anda.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Alat Populer</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onSelectView(View.MERGE)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Gabungkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.COMPRESS)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Kompres PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.SPLIT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Pisahkan PDF
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PDF_TO_WORD)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  PDF ke Word
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Konversi & Edit</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onSelectView(View.PDF_TO_IMAGE)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  PDF ke JPG / Gambar
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.ADD_SIGNATURE)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Tanda Tangan Dokumen
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.ORGANIZE)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Atur & Susun Halaman
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.ADD_TEXT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Tambah Teks ke PDF
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Informasi & Bantuan</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => onSelectView(View.ABOUT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Tentang Kami
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.PRIVACY)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Kebijakan Privasi
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.FAQ)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  FAQ & Tanya Jawab
                </button>
              </li>
              <li>
                <button onClick={() => onSelectView(View.CONTACT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Hubungi Dukungan
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} PDF Toolbox Pro. Seluruh hak cipta dilindungi.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onSelectView(View.PRIVACY)} className="hover:underline hover:text-blue-600 dark:hover:text-blue-400">
              Privasi & Keamanan
            </button>
            <span>•</span>
            <button onClick={() => onSelectView(View.CONTACT)} className="hover:underline hover:text-blue-600 dark:hover:text-blue-400">
              Kontak
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
