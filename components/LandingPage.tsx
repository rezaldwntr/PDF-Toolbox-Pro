
import React from 'react';
import { View } from '../types';
import { 
  MergeIcon, CompressIcon, SplitIcon, 
  FileWordIcon, FileExcelIcon, FileJpgIcon,
  ArrowLeftIcon, DownloadIcon, UploadIcon
} from './icons';

interface LandingPageProps {
  onSelectView: (view: View) => void;
}

// 3D-like Icon Placeholders using standard SVGs but styled differently
const ThreeDCubeIcon = () => (
    <div className="relative w-16 h-16">
        <div className="absolute inset-0 bg-yellow-400 rounded-lg transform rotate-12 opacity-80"></div>
        <div className="absolute inset-0 bg-orange-500 rounded-lg transform -rotate-6 shadow-lg flex items-center justify-center text-white">
            <MergeIcon className="w-8 h-8" />
        </div>
    </div>
);

const ThreeDShapeIcon = ({ color }: { color: string }) => (
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white shadow-lg`}>
        <div className="w-6 h-6 border-4 border-white rounded-full opacity-50"></div>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onSelectView }) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 animate-fade-in pb-20 pt-4">
      {/* --- Main Content Column (Left) --- */}
      <div className="xl:col-span-3 space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-2">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Popular Tools</h1>
             </div>
             <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
             </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-80">
            
            {/* 1. Big Green Card (Merge PDF) */}
            <div className="bg-[#10B981] rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between group cursor-pointer transition-transform hover:scale-[1.01]" onClick={() => onSelectView(View.MERGE)}>
                <div>
                    <h2 className="text-3xl font-bold mb-2 leading-tight">Combine PDFs<br/>and Organize</h2>
                    <p className="opacity-90 text-sm">Merge multiple files into one.</p>
                </div>
                
                <div className="mt-8">
                    <button className="bg-white text-[#10B981] px-6 py-3 rounded-xl font-bold text-sm hover:bg-opacity-90 transition-colors">
                        Go to tool
                    </button>
                </div>

                {/* Decorative 3D Elements */}
                <div className="absolute right-8 bottom-8 md:bottom-12 md:right-12 transform group-hover:rotate-12 transition-transform duration-500">
                    <ThreeDCubeIcon />
                </div>
                <div className="absolute top-1/2 left-1/2 w-48 h-48 border-[1rem] border-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            </div>

            {/* Right Column of Main Grid */}
            <div className="grid grid-cols-2 gap-6">
                
                {/* 2. Split PDF Card */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 flex flex-col justify-between cursor-pointer group hover:shadow-lg transition-all" onClick={() => onSelectView(View.SPLIT)}>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">Split<br/>PDF Files</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Extract pages instantly.</p>
                    </div>
                    <div className="mt-4 self-end group-hover:scale-110 transition-transform">
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 opacity-20"></div>
                             <SplitIcon className="w-8 h-8 relative z-10" />
                        </div>
                    </div>
                </div>

                {/* 3. Compress PDF Card */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 flex flex-col justify-between cursor-pointer group hover:shadow-lg transition-all" onClick={() => onSelectView(View.COMPRESS)}>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">Compress<br/>& Reduce</h3>
                         <div className="mt-2 bg-purple-100 dark:bg-purple-900/30 rounded-full px-3 py-1 inline-flex items-center">
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">OPTIMIZED</span>
                         </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full h-16 bg-gray-50 dark:bg-slate-700 rounded-xl relative overflow-hidden">
                             <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                <path d="M0,20 Q25,35 50,20 T100,20 V40 H0 Z" fill="#C084FC" className="opacity-50" />
                                <path d="M0,25 Q25,40 50,25 T100,25 V40 H0 Z" fill="#A855F7" />
                             </svg>
                             <div className="absolute top-2 right-2 bg-black text-white text-[10px] px-2 py-0.5 rounded-full">65% Saved</div>
                        </div>
                    </div>
                </div>

                {/* 4. Convert Card (Full Width in subgrid) */}
                <div className="col-span-2 bg-[#111827] rounded-[2.5rem] p-6 flex items-center justify-between cursor-pointer group" onClick={() => onSelectView(View.TOOLS_TAB)}>
                     <div>
                        <h3 className="text-lg font-bold text-white mb-1">More Tools</h3>
                        <p className="text-xs text-gray-400">Convert, Sign, Edit & More</p>
                    </div>
                    <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-[#111827] flex items-center justify-center text-white text-xs"><FileWordIcon className="w-5 h-5 text-white" /></div>
                        <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-[#111827] flex items-center justify-center text-white text-xs"><FileExcelIcon className="w-5 h-5 text-white" /></div>
                        <div className="w-10 h-10 rounded-full bg-red-500 border-2 border-[#111827] flex items-center justify-center text-white text-xs"><FileJpgIcon className="w-5 h-5 text-white" /></div>
                    </div>
                </div>

            </div>
        </div>

        {/* List Section (Homework -> Recent/Quick Access) */}
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Access</h2>
                <button className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:bg-gray-50">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </button>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm">
                <div className="hidden md:grid grid-cols-4 text-xs font-bold text-gray-400 mb-4 px-4">
                    <span>TOOL NAME</span>
                    <span>CATEGORY</span>
                    <span>STATUS</span>
                    <span>ACTION</span>
                </div>
                
                <div className="space-y-2">
                    {[
                        { name: 'Convert to Word', sub: 'Document Transformation', status: 'Ready', color: 'text-blue-500', bg: 'bg-blue-100', icon: <FileWordIcon />, onClick: () => onSelectView(View.PDF_TO_WORD) },
                        { name: 'Convert to Excel', sub: 'Data Extraction', status: 'Beta', color: 'text-green-500', bg: 'bg-green-100', icon: <FileExcelIcon />, onClick: () => onSelectView(View.PDF_TO_EXCEL) },
                        { name: 'Convert to Image', sub: 'Media Processing', status: 'Fast', color: 'text-purple-500', bg: 'bg-purple-100', icon: <FileJpgIcon />, onClick: () => onSelectView(View.PDF_TO_IMAGE) },
                    ].map((item, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors cursor-pointer group" onClick={item.onClick}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.name}&backgroundColor=e5e7eb`} alt="" className="w-10 h-10 rounded-full" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</h4>
                                </div>
                            </div>
                            <div className="hidden md:block text-sm text-gray-500">{item.sub}</div>
                            <div className="hidden md:block">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.color} ${item.bg} dark:bg-opacity-20`}>{item.status}</span>
                            </div>
                            <div className="hidden md:flex justify-end">
                                <button className="p-2 text-gray-400 hover:text-black dark:hover:text-white">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* --- Sidebar Column (Right) --- */}
      <div className="xl:col-span-1 space-y-8">
        
        {/* Streak / Status Widget */}
        <div>
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
                You're on a<br/>5-day streak
             </h2>
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <span className="bg-gray-100 dark:bg-slate-700 px-4 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">June 2024</span>
                    <div className="flex gap-2">
                        <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 hover:bg-gray-200">‹</button>
                        <button className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800">›</button>
                    </div>
                </div>
                
                <div className="flex justify-between text-center mb-6">
                    {['Mon','Tue','Wed','Thu','Fri'].map((d, i) => (
                        <div key={d} className={`flex flex-col gap-2 ${d === 'Thu' ? 'opacity-100' : 'opacity-40'}`}>
                            <span className="text-xs font-bold text-gray-500">{d}</span>
                            <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full ${d === 'Thu' ? 'bg-black text-white' : 'text-gray-900 dark:text-white'}`}>
                                {16+i}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="space-y-3 relative">
                     <div className="absolute left-[3.5rem] top-4 bottom-4 w-0.5 bg-blue-200 dark:bg-slate-700"></div>
                     
                     <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-400 w-10 text-right">10:00</span>
                         <div className="flex-1 bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 border-l-4 border-purple-500">
                             PDF Hierarchy Seminar
                         </div>
                     </div>
                     <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-400 w-10 text-right">12:00</span>
                         <div className="flex-1 bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 flex justify-between items-center">
                             <span>Split Flow</span>
                             <span className="bg-white/50 px-1.5 py-0.5 rounded text-[10px]">Break</span>
                         </div>
                     </div>
                     <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-900 dark:text-white w-10 text-right">14:00</span>
                         <div className="flex-1 bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 border-l-4 border-blue-500 shadow-md">
                             Material Design PDF
                         </div>
                     </div>
                </div>
             </div>
        </div>

        {/* Pro Promo Card */}
        <div className="bg-[#10B981] rounded-[2.5rem] p-8 text-center text-white relative overflow-hidden group">
            <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                     <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">Upgrade to Pro</h3>
                <p className="text-white/80 text-sm mb-6">Unlock unlimited processing & advanced tools.</p>
                <button className="bg-white text-[#10B981] w-full py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg">
                    Get Pro Now
                </button>
            </div>
            
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/20 rounded-full blur-xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
