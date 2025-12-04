import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';

// Tipe notifikasi yang tersedia
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

// Membuat Context React untuk manajemen Toast
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Custom hook untuk mempermudah pemanggilan toast dari komponen mana saja
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

// Provider utama yang membungkus aplikasi dan menyimpan state toast
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fungsi untuk menambahkan pesan toast baru ke dalam antrian
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now(); // Gunakan timestamp sebagai ID unik
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    
    // Otomatis hapus toast setelah 5 detik
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  // Fungsi untuk menghapus toast dari state (digunakan oleh tombol tutup atau timeout)
  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Container untuk merender toast secara visual di lapisan atas */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

// Komponen individual untuk menampilkan satu pesan Toast
const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    // Animasi keluar sebelum menghapus dari DOM
    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    };
    
    useEffect(() => {
        // Timer otomatis di level komponen untuk memicu animasi keluar
        const timer = setTimeout(() => {
            handleDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    // Styling CSS berdasarkan tipe pesan
    const typeClasses = {
        success: 'bg-green-600 border-green-700 text-white dark:bg-green-900/90 dark:border-green-800',
        error: 'bg-red-600 border-red-700 text-white dark:bg-red-900/90 dark:border-red-800',
        warning: 'bg-yellow-500 border-yellow-600 text-white dark:bg-yellow-700/90 dark:border-yellow-600',
        info: 'bg-blue-600 border-blue-700 text-white dark:bg-blue-900/90 dark:border-blue-800',
    };

    // Ikon SVG berdasarkan tipe
    const Icon = {
        success: () => <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
        error: () => <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
        warning: () => <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
        info: () => <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
    }

    return (
        <div 
        className={`flex items-center gap-4 w-full max-w-sm p-4 rounded-lg shadow-lg shadow-gray-300/50 dark:shadow-none backdrop-blur-md border transition-all duration-300 ${typeClasses[toast.type]} ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
        role="alert"
        >
            <div className="flex-shrink-0">
                <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    {Icon[toast.type]()}
                </svg>
            </div>
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Tutup"
            >
               <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};

// Container yang menggunakan Portal untuk merender toast di layer paling atas (di luar root app)
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Membuat atau mencari elemen root khusus untuk portal toast
    let element = document.getElementById('toast-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'toast-portal';
      document.body.appendChild(element);
    }
    setPortalRoot(element);
  }, []);

  if (!portalRoot) return null;

  // Render menggunakan ReactDOM.createPortal agar tidak terpengaruh overflow parent
  return ReactDOM.createPortal(
    <div className="fixed top-5 right-5 z-[100] space-y-3">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    portalRoot
  );
};