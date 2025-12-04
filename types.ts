// Enum untuk mengatur navigasi (View) dalam aplikasi.
// Setiap nilai merepresentasikan halaman atau alat yang sedang aktif.
// Ini digunakan oleh state 'activeView' di App.tsx untuk menentukan komponen mana yang dirender.
export enum View {
  // --- Main Navigation Tabs (Tab Utama yang muncul di BottomNav) ---
  HOME_TAB,   // Halaman Beranda (Landing Page)
  TOOLS_TAB,  // Halaman Daftar Semua Alat
  PROFILE_TAB,// Halaman Profil Pengguna

  // --- Active Tools (Alat-alat pemrosesan PDF) ---
  MERGE,         // Alat Gabungkan PDF
  SPLIT,         // Alat Pisahkan PDF
  COMPRESS,      // Alat Kompres PDF
  CONVERT,       // Alat Konversi PDF (Word, Excel, PPT, Gambar)
  ADD_TEXT,      // Alat Tambah Teks ke PDF
  ADD_SIGNATURE, // Alat Tambah Tanda Tangan
  ORGANIZE,      // Alat Atur Halaman (Hapus, Putar, Urutkan)
  
  // --- Pages (Halaman Informasi Statis) ---
  BLOG,          // Halaman Blog/Artikel
  FAQ,           // Halaman Pertanyaan Umum
  PRIVACY,       // Halaman Kebijakan Privasi
  ABOUT,         // Halaman Tentang Kami
  CONTACT,       // Halaman Kontak Formulir
}