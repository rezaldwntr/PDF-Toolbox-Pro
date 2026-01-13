
import React from 'react';
import { View } from '../types';

interface FooterProps {
  onNavigate: (view: View) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 mt-auto pt-12 pb-8 md:pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
                    <span className="font-bold text-lg">P</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">PDF Toolbox</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
              Platform manajemen dokumen all-in-one. Proses file PDF Anda dengan aman, cepat, dan profesional tanpa biaya tersembunyi.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Menu Utama</h4>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
               <li>
                   <button onClick={() => onNavigate(View.HOME_TAB)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Beranda</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.TOOLS_TAB)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Semua Alat</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.BLOG)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Blog & Artikel</button>
               </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">Bantuan & Legal</h4>
             <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
               <li>
                   <button onClick={() => onNavigate(View.FAQ)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.PRIVACY)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Kebijakan Privasi</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.ABOUT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tentang Kami</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.CONTACT)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Hubungi Kami</button>
               </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
           <p className="text-slate-400 dark:text-slate-500 text-sm text-center md:text-left">
               © {new Date().getFullYear()} PDF Toolbox Pro. All rights reserved.
           </p>
           
           <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
             <span>Dibuat oleh</span>
             <a 
                href="https://instagram.com/rezaldwntr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md"
             >
                @rezaldwntr
             </a>
           </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
