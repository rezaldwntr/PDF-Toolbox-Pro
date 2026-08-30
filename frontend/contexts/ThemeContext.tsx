import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipe data untuk tema: 'light' atau 'dark'
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Membuat Context React untuk Tema
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook untuk menggunakan tema di komponen lain dengan mudah
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Provider komponen yang membungkus aplikasi
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  // Efek dijalankan sekali saat mount untuk mengecek preferensi pengguna
  useEffect(() => {
    // 1. Cek local storage (preferensi yang disimpan sebelumnya)
    const savedTheme = localStorage.getItem('theme') as Theme;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // 2. Jika tidak ada di local storage, cek preferensi sistem operasi
      setTheme('dark');
    }
  }, []);

  // Efek dijalankan setiap kali state 'theme' berubah
  useEffect(() => {
    // Terapkan class 'dark' ke elemen HTML root untuk mengaktifkan styling Tailwind
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Simpan preferensi ke local storage agar diingat saat kunjungan berikutnya
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fungsi untuk mengganti tema (toggle)
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};