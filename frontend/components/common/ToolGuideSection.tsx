// frontend/components/common/ToolGuideSection.tsx
import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ShieldCheck, 
  Lock, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Lightbulb, 
  Sparkles,
  FileCheck
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface StepItem {
  number: number;
  title: string;
  description: string;
}

interface ToolGuideData {
  steps: StepItem[];
  highlights: { title: string; desc: string }[];
  faqs: FaqItem[];
  tips: string[];
}

const DEFAULT_GUIDES: Record<string, ToolGuideData> = {
  'Gabungkan PDF': {
    steps: [
      { number: 1, title: 'Unggah Berkas PDF', description: 'Pilih atau seret beberapa berkas dokumen PDF yang ingin Anda satukan ke area kerja.' },
      { number: 2, title: 'Atur Urutan Halaman', description: 'Gunakan fitur drag-and-drop taktil untuk menyusun urutan berkas sesuai hierarki yang Anda inginkan.' },
      { number: 3, title: 'Gabungkan & Unduh', description: 'Klik tombol Gabungkan PDF. Dokumen hasil penggabungan berkecepatan tinggi siap diunduh dalam hitungan detik.' }
    ],
    highlights: [
      { title: 'In-Memory Stream', desc: 'Pemrosesan langsung di RAM tanpa I/O disk lambat untuk performa setara standar iLovePDF.' },
      { title: 'Kualitas Asli Terjaga', desc: 'Resolusi teks vektor, tabel, dan gambar dipertahankan 100% tanpa penurunan kualitas grafis.' },
      { title: 'Keamanan TLS 256-Bit', desc: 'Seluruh berkas ditransfer melalui koneksi terenkripsi perbankan dan dihapus otomatis dalam 60 menit.' }
    ],
    faqs: [
      { question: 'Berapa banyak file PDF yang bisa saya gabungkan sekaligus?', answer: 'Pengguna gratis dapat menggabungkan hingga beberapa dokumen dalam batas ukuran berkas standar. Pengguna Flash Pass dan Pro dapat menggabungkan puluhan dokumen berukuran hingga ratusan megabyte secara serentak.' },
      { question: 'Apakah format dan tata letak dokumen akan berantakan?', answer: 'Tidak sama sekali. Sistem kami menggunakan algoritma page-tree grafting tingkat biner sehingga font, margin, dan gambar dipertahankan persis seperti aslinya.' },
      { question: 'Bisakah saya mengubah urutan file setelah diunggah?', answer: 'Tentu saja! Anda cukup menekan dan menggeser kartu pratinjau dokumen ke posisi yang diinginkan secara mudah dan responsif.' },
      { question: 'Apakah dokumen yang digabungkan aman dari kebocoran data?', answer: 'Sangat aman. Dokumen Anda tidak pernah diindeks, tidak pernah dibaca staf, dan otomatis dimusnahkan secara permanen setelah proses selesai.' }
    ],
    tips: [
      'Pastikan tidak ada file yang diproteksi kata sandi sebelum menggabungkan. Buka kunci file terlebih dahulu jika diperlukan.',
      'Susun dokumen pembuka seperti Cover dan Surat Pengantar pada urutan 1 dan 2 agar laporan tersusun profesional.',
      'Gunakan fitur Kompres PDF setelah penggabungan jika ukuran file akhir melebihi batas pengiriman email instansi.'
    ]
  },

  'Pisahkan PDF': {
    steps: [
      { number: 1, title: 'Pilih File PDF', description: 'Unggah dokumen PDF yang memiliki banyak halaman dan ingin Anda pecah.' },
      { number: 2, title: 'Tentukan Metode Pemisahan', description: 'Pilih metode pemisahan: Rentang halaman tertentu (misal: 1-5), setiap beberapa halaman, atau ekstrak seluruh lembar.' },
      { number: 3, title: 'Unduh Hasil Pemisahan', description: 'Sistem akan mengekstrak lembar yang dipilih atau mengemasnya ke dalam file arsip ZIP instan.' }
    ],
    highlights: [
      { title: '4 Mode Ekstraksi Presisi', desc: 'Mendukung pemisahan rentang kustom, pemilihan lembar interaktif, dan pemecahan kelipatan halaman.' },
      { title: 'Arsip ZIP Otomatis', desc: 'Jika menghasilkan banyak file terpisah, sistem otomatis mengompresi hasilnya ke arsip ZIP rapi.' },
      { title: 'Zero Data Leakage', desc: 'Seluruh struktur halaman diproses aman dan langsung dihapus dari memori server.' }
    ],
    faqs: [
      { question: 'Bagaimana format penulisan rentang halaman yang benar?', answer: 'Anda dapat menuliskan angka tunggal atau rentang dengan tanda hubung dan koma, contohnya: 1-3, 5, 8-10.' },
      { question: 'Apakah ukuran file hasil pemisahan menjadi lebih kecil?', answer: 'Ya, ukuran berkas hasil ekstraksi akan proporsional sesuai jumlah lembar yang Anda ambil.' },
      { question: 'Bisakah saya mengambil hanya 1 halaman penting dari dokumen 100 lembar?', answer: 'Bisa! Cukup pilih mode ekstraksi dan masukkan nomor halaman yang Anda butuhkan (misal: halaman 42).' }
    ],
    tips: [
      'Gunakan fitur pemisahan untuk menghapus lembar kosong atau halaman lampiran yang tidak diperlukan sebelum mengirimkan dokumen.',
      'Periksa kembali nomor halaman dokumen asli agar tidak salah menentukan rentang halaman yang ingin diekstrak.'
    ]
  },

  'Kompres PDF': {
    steps: [
      { number: 1, title: 'Unggah Dokumen PDF', description: 'Pilih berkas PDF berukuran besar dari perangkat komputer atau ponsel pintar Anda.' },
      { number: 2, title: 'Pilih Level Kompresi', description: 'Pilih profil kompresi: Ekstrem (ukuran terkecil), Rekomendasi (keseimbangan terbaik), atau Rendah (kualitas visual maksimal).' },
      { number: 3, title: 'Kecilkan & Simpan', description: 'Mesin kompresi cerdas akan mengoptimalkan struktur biner dan gambar dokumen dalam beberapa detik.' }
    ],
    highlights: [
      { title: 'Optimasi Tanpa Buram', desc: 'Mengurangi ukuran file drastis tanpa merusak ketajaman font vektor dan kejelasan teks dokumen.' },
      { title: 'Re-Encoding Gambar Pintar', desc: 'Menerapkan kompresi gambar adaptif dan penghapusan metadata tersembunyi yang tidak terpakai.' },
      { title: 'Jaminan Non-Inflatasi', desc: 'Algoritma menjamin ukuran berkas hasil tidak akan pernah membengkak lebih besar dari aslinya.' }
    ],
    faqs: [
      { question: 'Apakah teks di dalam PDF tetap bisa dicari (searchable) setelah dikompres?', answer: 'Ya, 100%! Teks vektor asli dipertahankan secara utuh sehingga Anda tetap dapat memilih (highlight), menyalin (copy), dan mencari teks.' },
      { question: 'Berapa persen ukuran file saya bisa berkurang?', answer: 'Rata-rata berkas dapat berkurang antara 30% hingga 85%, tergantung banyaknya gambar beresolusi tinggi di dalam dokumen tersebut.' },
      { question: 'Apakah aman mengompres dokumen penting seperti laporan keuangan?', answer: 'Sangat aman. Kami menggunakan enkripsi TLS 256-bit dan berkas langsung dimusnahkan dalam 60 menit.' }
    ],
    tips: [
      'Mode Rekomendasi adalah pilihan ideal untuk pengunggahan portal instansi pemerintah seperti SSCASN, CPNS, BKN, dan portal beasiswa.',
      'Gunakan mode Ekstrem jika Anda hanya butuh membaca dokumen di layar smartphone atau mengirimkannya via WhatsApp/email.'
    ]
  },

  'PDF ke Word': {
    steps: [
      { number: 1, title: 'Unggah Berkas PDF', description: 'Pilih dokumen PDF yang ingin Anda ubah menjadi dokumen Word yang dapat diedit.' },
      { number: 2, title: 'Proses Rekonstruksi', description: 'Mesin konversi server-side merekonstruksi paragraf, font, tabel, dan tata letak ke format DOCX modern.' },
      { number: 3, title: 'Unduh Berkas Word', description: 'Buka dan edit dokumen di Microsoft Word, Google Docs, atau LibreOffice tanpa kendala.' }
    ],
    highlights: [
      { title: 'Format DOCX Asli', desc: 'Kompatibel penuh dengan Microsoft Office Word 2010 hingga Office 365 dan Google Docs.' },
      { title: 'Preservasi Paragraf & Tabel', desc: 'Struktur kolom dan tabel dikonversi menjadi elemen tabel Word asli yang fleksibel diedit.' },
      { title: 'Akselerasi CPU Multi-Core', desc: 'Pemrosesan paralel berbasis thread berkecepatan tinggi untuk dokumen berpuluh-puluh lembar.' }
    ],
    faqs: [
      { question: 'Apakah saya bisa mengedit teks hasil konversi di Microsoft Word?', answer: 'Ya, seluruh teks dikonversi menjadi teks dokumen yang bebas disunting, diformat ulang, atau disalin.' },
      { question: 'Bagaimana jika PDF saya merupakan hasil foto pindaian (scan)?', answer: 'Jika dokumen berupa gambar hasil scan tanpa teks digital, gunakan fitur OCR PDF kami untuk mengenali teks terlebih dahulu.' },
      { question: 'Apakah tata letak gambar akan bergeser?', answer: 'Sistem kami mendeteksi bounding-box elemen grafis untuk mempertahankan posisi relatif gambar sedekat mungkin dengan dokumen aslinya.' }
    ],
    tips: [
      'Gunakan pemotongan rentang halaman sebelum konversi jika Anda hanya membutuhkan bab atau halaman tertentu untuk menghemat waktu.',
      'Pastikan dokumen asli memiliki orientasi tegak (portrait) yang tepat agar paragraf terdeteksi dengan rapi.'
    ]
  },

  'Watermark PDF': {
    steps: [
      { number: 1, title: 'Unggah Berkas PDF', description: 'Pilih dokumen PDF yang ingin Anda beri cap air atau identitas hak cipta.' },
      { number: 2, title: 'Sesuaikan Teks / Gambar', description: 'Ketik teks watermark (atau unggah logo PNG), atur transparansi, sudut rotasi, dan posisi grid 9-titik.' },
      { number: 3, title: 'Terapkan & Unduh', description: 'Watermark diterapkan secara presisi pada setiap halaman dokumen dan siap disimpan.' }
    ],
    highlights: [
      { title: 'Teks & Stempel Gambar', desc: 'Mendukung teks kustom dengan berbagai font serta logo grafis berlatar belakang transparan.' },
      { title: 'Kontrol Transparansi & Sudut', desc: 'Slider opasitas halus dan rotasi bebas (0° hingga 360°) untuk hasil elegan.' },
      { title: 'Lapisan Atas / Bawah', desc: 'Pilih apakah watermark berada di atas teks atau di belakang teks sebagai latar belakang.' }
    ],
    faqs: [
      { question: 'Apakah watermark bisa dihapus dengan mudah oleh orang lain?', answer: 'Watermark kami di-embed langsung ke level biner halaman PDF sehingga tidak dapat dihapus hanya dengan seleksi teks biasa.' },
      { question: 'Apakah watermark otomatis muncul di seluruh halaman?', answer: 'Ya, secara default watermark akan dicap di seluruh lembar dokumen secara konsisten.' }
    ],
    tips: [
      'Gunakan teks seperti "SALINAN LEGALISIR", "DRAFT RAHASIA", atau "HANYA UNTUK KEPERLUAN VERIFIKASI" untuk mencegah penyalahgunaan dokumen.',
      'Atur opasitas sekitar 25%–35% agar teks watermark terlihat jelas namun tidak menutupi tulisan penting di dokumen.'
    ]
  },

  'Proteksi PDF': {
    steps: [
      { number: 1, title: 'Pilih Dokumen PDF', description: 'Unggah dokumen sensitif yang ingin Anda amankan dari akses tidak berizin.' },
      { number: 2, title: 'Masukkan Kata Sandi Kuat', description: 'Tentukan kata sandi dan periksa indikator kekuatan sandi untuk proteksi maksimal.' },
      { number: 3, title: 'Enkripsi & Unduh', description: 'Dokumen dienkripsi dengan standar kriptografi industri AES-128/256 bit.' }
    ],
    highlights: [
      { title: 'Enkripsi Kuat AES', desc: 'Menerapkan enkripsi biner berstandar militer yang diakui secara global.' },
      { title: 'Meter Kekuatan Sandi', desc: 'Membantu Anda membuat kata sandi yang resisten terhadap serangan brute-force.' },
      { title: 'Kunci Akses Universal', desc: 'Dokumen terlindungi dapat dibuka di Adobe Acrobat Reader, Google Chrome, Mac Preview, dan HP.' }
    ],
    faqs: [
      { question: 'Apakah pihak PDF Toolbox Pro mengetahui kata sandi yang saya masukkan?', answer: 'Sama sekali tidak. Proses hashing dan enkripsi dilakukan secara otomatis tanpa ada pencatatan kata sandi di log server.' },
      { question: 'Apa yang terjadi jika saya lupa kata sandi dokumen?', answer: 'Karena enkripsi kami menggunakan standar kriptografi murni, tidak ada pintu belakang (backdoor) untuk memulihkan sandi yang terlupa.' }
    ],
    tips: [
      'Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk menghasilkan kata sandi yang kuat.',
      'Simpan kata sandi di tempat aman atau pengelola sandi (password manager) terpercaya.'
    ]
  }
};

interface ToolGuideSectionProps {
  toolTitle: string;
}

export const ToolGuideSection: React.FC<ToolGuideSectionProps> = ({ toolTitle }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Cari guide spesifik atau gunakan panduan default yang komprehensif
  const guide = DEFAULT_GUIDES[toolTitle] || {
    steps: [
      { number: 1, title: 'Unggah Dokumen', description: `Pilih berkas PDF dari komputer, tablet, atau smartphone Anda untuk memulai pengolahan ${toolTitle}.` },
      { number: 2, title: 'Sesuaikan Pengaturan', description: 'Atur opsi dan parameter yang tersedia sesuai kebutuhan spesifik dokumen Anda.' },
      { number: 3, title: 'Proses & Unduh', description: 'Klik tombol proses dan unduh dokumen hasil olahan berkualitas tinggi dalam beberapa detik.' }
    ],
    highlights: [
      { title: 'Kecepatan Server-Side', desc: 'Didukung oleh mesin pemrosesan multi-core berkecepatan tinggi untuk hasil instan tanpa antrean.' },
      { title: 'Privasi Terjamin 100%', desc: 'Enkripsi TLS 256-bit dan penghapusan otomatis dokumen secara permanen dalam 60 menit.' },
      { title: 'Dukungan Multi-Perangkat', desc: 'Bekerja sempurna di Windows, Mac, Linux, Android, iOS, tanpa perlu instalasi aplikasi tambahan.' }
    ],
    faqs: [
      { question: `Apakah menggunakan ${toolTitle} ini gratis?`, answer: 'Ya! Kami menyediakan kuota gratis setiap hari bagi seluruh pengunjung dan pengguna terdaftar.' },
      { question: 'Apakah file saya aman dan terjaga kerahasiaannya?', answer: 'Sangat aman. Sistem kami beroperasi dengan kebijakan Zero Data Retention; file Anda dimusnahkan secara permanen setelah proses selesai.' },
      { question: 'Berapa batas ukuran file yang dapat diunggah?', answer: 'Pengguna gratis dapat memproses dokumen hingga 50 MB, sedangkan pengguna Pro mendukung berkas besar hingga 250–500 MB.' }
    ],
    tips: [
      'Pastikan koneksi internet stabil saat mengunggah dan mengunduh berkas berukuran besar.',
      'Periksa pratinjau dokumen sebelum mengunduh untuk memastikan seluruh hasil sesuai dengan ekspektasi Anda.'
    ]
  };

  return (
    <section 
      aria-label={`Panduan dan Informasi Lengkap ${toolTitle}`}
      className="w-full mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-10"
    >
      {/* 1. Panduan 3 Langkah Mudah */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold mb-2">
            <Sparkles size={13} />
            <span>Panduan Praktis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cara Menggunakan {toolTitle} dalam 3 Langkah Mudah
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Alur kerja yang dirancang intuitif, cepat, dan ramah pengguna bahkan untuk pemula.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {guide.steps.map((step) => (
            <div 
              key={step.number}
              className="p-5 rounded-2xl bg-slate-50/80 dark:bg-[#161A22] border border-slate-200/80 dark:border-slate-800 flex flex-col items-start"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center mb-3 shadow-sm shadow-blue-500/30">
                {step.number}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Keunggulan & Spesifikasi Fitur */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-500" />
          <span>Keunggulan & Kualitas Layanan Kami</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {guide.highlights.map((hl, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl bg-white dark:bg-[#161A22] border border-slate-200 dark:border-slate-800"
            >
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mb-1 text-blue-600 dark:text-blue-400">
                ✓ {hl.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {hl.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Tips Praktis Pengelolaan Dokumen */}
      {guide.tips && guide.tips.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm mb-2">
            <Lightbulb size={18} className="text-amber-600 dark:text-amber-400" />
            <span>Tips Produktivitas Dokumen</span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-900/80 dark:text-amber-300/80 list-disc list-inside pl-1">
            {guide.tips.map((tip, idx) => (
              <li key={idx} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. FAQ Khusus Alat Ini */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-500" />
          <span>Pertanyaan yang Sering Diajukan (FAQ)</span>
        </h3>

        <div className="space-y-2.5">
          {guide.faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#161A22]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex justify-between items-center text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={16} 
                    className={`transform transition-transform shrink-0 ml-2 ${isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} 
                  />
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ToolGuideSection;
