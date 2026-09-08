import { createClient } from '@supabase/supabase-js';

// Deteksi environment variable secara fleksibel:
// Mendukung VITE_SUPABASE_URL, SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY
const env = import.meta.env as Record<string, any>;

export const SUPABASE_DEFAULT_URL = 'https://lfjakofhylhghwmhgvej.supabase.co';

const supabaseUrl = 
  env.VITE_SUPABASE_URL || 
  env.SUPABASE_URL || 
  SUPABASE_DEFAULT_URL;

const supabaseAnonKey = 
  env.VITE_SUPABASE_ANON_KEY || 
  env.SUPABASE_ANON_KEY || 
  env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  env.SUPABASE_PUBLISHABLE_KEY || 
  '';

export const isSupabaseConfigured = Boolean(supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key');

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] VITE_SUPABASE_ANON_KEY belum terdeteksi. ' +
    'Pastikan variabel environment VITE_SUPABASE_ANON_KEY atau SUPABASE_ANON_KEY sudah diset di Vercel.'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

