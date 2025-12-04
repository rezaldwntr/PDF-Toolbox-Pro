import React from 'react';
import { UserIcon, ShieldIcon, LockIcon, BellIcon } from '../icons';

// Halaman Profil Pengguna (Saat ini statis sebagai placeholder)
const ProfilePage: React.FC = () => {
  return (
    <div className="pb-20 animate-fade-in">
      <div className="flex items-center gap-4 mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400 shadow-sm">
          G
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Guest User</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Pengguna Gratis</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">Pengaturan Umum</h3>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 text-left">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"><UserIcon /></div>
            <div className="flex-1">
              <h4 className="text-gray-800 dark:text-gray-200 font-medium">Akun</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Kelola detail profil Anda</p>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 text-left">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400"><BellIcon /></div>
            <div className="flex-1">
              <h4 className="text-gray-800 dark:text-gray-200 font-medium">Notifikasi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atur preferensi pemberitahuan</p>
            </div>
          </button>
        </div>

        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mt-6">Keamanan</h3>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 text-left">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"><ShieldIcon /></div>
            <div className="flex-1">
              <h4 className="text-gray-800 dark:text-gray-200 font-medium">Privasi Data</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Kelola pengaturan privasi Anda</p>
            </div>
          </button>

          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400"><LockIcon /></div>
            <div className="flex-1">
              <h4 className="text-gray-800 dark:text-gray-200 font-medium">Kata Sandi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ubah kata sandi akun</p>
            </div>
          </button>
        </div>
        
        <div className="mt-8 text-center">
            <button 
                onClick={() => alert("Fitur Login/Register akan hadir segera!")}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
                Keluar (Demo)
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;