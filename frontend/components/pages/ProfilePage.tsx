
import React from 'react';
import { UserIcon, ShieldIcon, LockIcon, BellIcon } from '../icons';

const ProfilePage: React.FC = () => {
  return (
    <div className="pb-20 animate-fade-in px-4 pt-6">
      <div className="max-w-3xl mx-auto">
        {/* Profile Header Card */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300">
          <div className="relative">
             <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-blue-500/30">
              G
            </div>
            <span className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-white dark:border-slate-800 rounded-full"></span>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Guest User</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Pengguna Gratis • <span className="text-blue-600 font-medium cursor-pointer hover:underline">Upgrade ke Pro</span></p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 ml-2">Pengaturan Umum</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 text-left group">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><UserIcon className="w-6 h-6"/></div>
              <div>
                <h4 className="text-slate-800 dark:text-white font-bold text-base">Akun Saya</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kelola data diri</p>
              </div>
            </button>
            
            <button className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-purple-500/50 hover:shadow-lg transition-all duration-300 text-left group">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><BellIcon className="w-6 h-6"/></div>
              <div>
                <h4 className="text-slate-800 dark:text-white font-bold text-base">Notifikasi</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Atur pemberitahuan</p>
              </div>
            </button>
          </div>

          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 ml-2 mt-4">Keamanan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-green-500/50 hover:shadow-lg transition-all duration-300 text-left group">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform"><ShieldIcon className="w-6 h-6"/></div>
              <div>
                <h4 className="text-slate-800 dark:text-white font-bold text-base">Privasi</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pengaturan data</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-red-500/50 hover:shadow-lg transition-all duration-300 text-left group">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform"><LockIcon className="w-6 h-6"/></div>
              <div>
                <h4 className="text-slate-800 dark:text-white font-bold text-base">Kata Sandi</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ubah keamanan</p>
              </div>
            </button>
          </div>
          
          <div className="pt-8 text-center">
              <button 
                  onClick={() => alert("Fitur Login/Register akan hadir segera!")}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                  Keluar dari Mode Tamu
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
