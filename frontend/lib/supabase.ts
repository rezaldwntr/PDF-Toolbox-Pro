import { createClient } from '@supabase/supabase-js';

// Variabel ini diinjeksi oleh Vite melalui .env.local / Vercel Environment Variables
// VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus diset sebelum deploy
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum dikonfigurasi. ' +
    'Auth dan kuota berbasis akun tidak akan berfungsi. ' +
    'Salin .env.example ke .env.local dan isi nilainya.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
