
import React from 'react';
import { View } from '../types';

interface FooterProps {
  onNavigate: (view: View) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-apple-parchment dark:bg-[#000000] border-t border-apple-hairline dark:border-[#333333] mt-auto pt-[64px] pb-[64px] px-4 sm:px-6 lg:px-[32px] transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto text-apple-inkMuted80 dark:text-[#a1a1a6]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-apple-hairline dark:border-[#333333] pb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h3 className="text-[17px] font-semibold text-apple-ink dark:text-white tracking-tight-md">PDF Toolbox Pro</h3>
            <p className="text-[12px] leading-snug tracking-fine max-w-sm">
              Platform manajemen dokumen all-in-one. Proses file PDF Anda dengan aman, cepat, dan profesional tanpa biaya tersembunyi.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[14px] text-apple-ink dark:text-white mb-2 tracking-caption">Menu Utama</h4>
            <ul className="text-[17px] leading-[2.41] tracking-display">
               <li>
                   <button onClick={() => onNavigate(View.HOME_TAB)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Beranda</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.TOOLS_TAB)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Semua Alat</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.BLOG)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Blog & Artikel</button>
               </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold text-[14px] text-apple-ink dark:text-white mb-2 tracking-caption">Bantuan & Legal</h4>
             <ul className="text-[17px] leading-[2.41] tracking-display">
               <li>
                   <button onClick={() => onNavigate(View.FAQ)} className="hover:text-apple-ink dark:hover:text-white transition-colors">FAQ</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.PRIVACY)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Kebijakan Privasi</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.ABOUT)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Tentang Kami</button>
               </li>
               <li>
                   <button onClick={() => onNavigate(View.CONTACT)} className="hover:text-apple-ink dark:hover:text-white transition-colors">Hubungi Kami</button>
               </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] tracking-fine text-apple-inkMuted48 dark:text-[#a1a1a6]">
           <p>
               Copyright © {new Date().getFullYear()} PDF Toolbox Pro. All rights reserved.
           </p>
           
           <div className="flex items-center gap-2">
             <span>Dibuat oleh</span>
             <a 
                href="https://instagram.com/rezaldwntr" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-apple-ink dark:hover:text-white transition-colors underline"
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
