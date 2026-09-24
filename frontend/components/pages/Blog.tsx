// frontend/components/pages/Blog.tsx
import React, { useState } from 'react';
import ToolContainer from '../common/ToolContainer';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  Share2, 
  CheckCircle2, 
  Lightbulb, 
  BookOpen, 
  Sparkles,
  X
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  category: string;
  summary: string;
  color: string;
  readTime: string;
  date: string;
  author: string;
  paragraphs: {
    heading?: string;
    text: string;
    points?: string[];
  }[];
  keyTakeaways: string[];
}

const blogPosts: BlogPost[] = [
  {
    id: 'tips-gabung-lamaran-kerja',
    title: 'Tips & Strategi Menggabungkan Dokumen Lamaran Kerja Menjadi Satu PDF Rapi',
    category: 'Karir & Produktivitas',
    summary: 'Jangan kirim banyak file terpisah yang merepotkan HRD. Pelajari cara menyatukan CV, Surat Lamaran, Ijazah, dan Portofolio menjadi satu PDF profesional.',
    color: 'bg-blue-100 text-blue-600',
    readTime: '4 min baca',
    date: '20 September 2026',
    author: 'Tim Editorial PDF Toolbox',
    paragraphs: [
      {
        heading: '1. Mengapa Menggabungkan Dokumen Sangat Penting bagi HRD?',
        text: 'Saat melamar pekerjaan, HRD atau tim rekruter menerima ratusan hingga ribuan email setiap harinya. Jika Anda melampirkan berkas dalam bentuk 5 hingga 10 file terpisah (CV.pdf, KTP.jpg, Ijazah.pdf, Portofolio.pdf), rekruter harus mengunduh dan membuka file Anda satu per satu. Hal ini tidak hanya membuang waktu mereka, namun juga meningkatkan risiko ada berkas penting yang terlewatkan. Menyatukan seluruh berkas pendukung ke dalam satu dokumen PDF tunggal yang runut menunjukkan profesionalisme dan perhatian tinggi terhadap detail.'
      },
      {
        heading: '2. Urutan Standar Berkas Lamaran yang Disukai Rekruter',
        text: 'Urutan hierarki dokumen sangat menentukan impresi pertama. Susunlah dokumen dengan urutan logis berikut:',
        points: [
          'Halaman 1: Surat Lamaran Kerja (Cover Letter) yang ditujukan spesifik untuk posisi yang dilamar.',
          'Halaman 2–3: Curriculum Vitae (CV) atau Resume terbaru dengan ringkasan pengalaman dan kontak aktif.',
          'Halaman 4: Salinan Ijazah Terakhir dan Transkrip Nilai resmi.',
          'Halaman 5: Sertifikat Keahlian / Pelatihan relevan yang mendukung posisi.',
          'Halaman 6 dan seterusnya: Ringkasan Portofolio hasil karya terbaik (jika relevan).'
        ]
      },
      {
        heading: '3. Perhatikan Batas Ukuran File Pengiriman',
        text: 'Banyak sistem portal rekrutmen perusahaan maupun formulir online instansi (seperti BUMN dan instansi pemerintah) membatasi ukuran unggahan berkas maksimal 2 MB hingga 5 MB. Setelah Anda menggabungkan seluruh dokumen menggunakan alat Gabungkan PDF, pastikan untuk memeriksa ukuran totalnya. Jika ukurannya melebihi batas, gunakan fitur Kompres PDF kami untuk merampingkan ukurannya tanpa membuat teks sertifikat atau foto Anda menjadi buram.'
      }
    ],
    keyTakeaways: [
      'Gunakan urutan logis: Cover Letter -> CV -> Ijazah -> Sertifikat -> Portofolio.',
      'Beri nama file yang profesional, contoh: CV_Lamaran_NamaLengkap_Posisi.pdf.',
      'Kompres file hingga berada di bawah batas 2–5 MB sebelum dikirimkan ke email rekruter.'
    ]
  },

  {
    id: 'kompres-pdf-tanpa-buram',
    title: 'Memahami Algoritma Kompresi PDF: Cara Mengecilkan Ukuran Tanpa Buram',
    category: 'Teknologi & Optimasi',
    summary: 'Bagaimana cara kerja algoritma kompresi kami mengurangi ukuran file drastis tanpa merusak keterbacaan teks dan ketajaman gambar dokumen.',
    color: 'bg-emerald-100 text-emerald-600',
    readTime: '5 min baca',
    date: '18 September 2026',
    author: 'Tim Engineering PDF Toolbox',
    paragraphs: [
      {
        heading: '1. Anatomi Berkas PDF: Vektor vs Raster',
        text: 'Sebuah dokumen PDF modern tersusun atas beberapa lapisan objek data yang berbeda. Lapisan pertama adalah data vektor, yang mencakup teks, font digital, dan diagram garis geometris. Lapisan kedua adalah data raster, yaitu gambar bitmap, foto hasil scan, atau stempel grafis. Lapisan ketiga adalah metadata dokumen, bookmark halaman, dan struktur pohon objek (object tree).'
      },
      {
        heading: '2. Mengapa Kompresi Biasa Sering Membuat Dokumen Buram?',
        text: 'Banyak software konverter gratis melakukan kompresi secara ceroboh dengan cara mengubah seluruh halaman dokumen menjadi gambar resolusi rendah (rasterisasi agresif). Akibatnya, teks menjadi pecah saat diperbesar, tidak dapat diseleksi (unsearchable), dan terlihat buram saat dicetak.'
      },
      {
        heading: '3. Pendekatan Cerdas PDF Toolbox Pro',
        text: 'Engine kompresi PDF Toolbox Pro menggunakan pendekatan pembedahan biner selektif:',
        points: [
          'Preservasi Teks Vektor 100%: Seluruh font dan teks asli dipertahankan dalam bentuk matematis vektor murni sehingga tetap super tajam pada tingkat perbesaran (zoom) berapa pun.',
          'Pembersihan Objek Mati (Dead Object Pruning): Menghapus jejak revisi lama, metadata yang tidak terpakai, dan stream kosong di dalam biner PDF.',
          'Downsampling Gambar Adaptif: Menyesuaikan kerapatan piksel gambar foto ke standar optimal (150–200 DPI) yang memangkas ukuran biner secara masif tanpa penurunan kualitas kasat mata.'
        ]
      }
    ],
    keyTakeaways: [
      'Kompresi cerdas mempertahankan teks vektor sehingga dokumen tetap bisa dicari dan disalin.',
      'Gunakan mode Rekomendasi untuk kebutuhan unggah portal resmi instansi pemerintah.',
      'Penghapusan objek biner yatim mampu memangkas ukuran hingga 40% bahkan sebelum gambar di-downscale.'
    ]
  },

  {
    id: 'ubah-pdf-ke-word-edit-ulang',
    title: 'Panduan Konversi PDF ke Word: Mengedit Dokumen Tanpa Merusak Tata Letak',
    category: 'Tutorial & Produktivitas',
    summary: 'Salah ketik pada naskah PDF final? Jangan ketik ulang dari nol. Pelajari alur konversi presisi tinggi ke DOCX yang menjaga format tabel dan paragraf.',
    color: 'bg-purple-100 text-purple-600',
    readTime: '4 min baca',
    date: '15 September 2026',
    author: 'Tim Editorial PDF Toolbox',
    paragraphs: [
      {
        heading: '1. Masalah Klasik Mengedit Dokumen PDF',
        text: 'Format Portable Document Format (PDF) pada dasarnya dirancang sebagai format output cetak digital final, bukan format pengolah kata untuk disunting. Ketika terjadi kesalahan ketik nama, nominal angka kontrak, atau penomoran klausul, membuka PDF secara langsung sering kali menggeser posisi paragraf dan merusak format tabel.'
      },
      {
        heading: '2. Cara Kerja Rekonstruksi Paragraf ke Format DOCX',
        text: 'Mesin konversi PDF ke Word di PDF Toolbox Pro memindai struktur koordinat absolut setiap huruf dan kata di halaman, kemudian merekonstruksinya menjadi blok paragraf alami Microsoft Word (flow-based document model). Dengan demikian, ketika Anda menambahkan atau menghapus kata di Word, kalimat di bawahnya akan mengalir turun secara otomatis seperti dokumen Word asli.'
      },
      {
        heading: '3. Rekomendasi Praktis Sebelum Konversi',
        text: 'Untuk mendapatkan hasil konversi terbaik yang 100% rapi:',
        points: [
          'Pastikan orientasi halaman PDF sudah benar (tegak/portrait) sebelum diunggah.',
          'Jika dokumen memiliki banyak halaman dan Anda hanya butuh bab tertentu, manfaatkan fitur rentang halaman (page range slicing) untuk mempercepat proses.',
          'Buka dokumen hasil konversi di aplikasi Microsoft Word versi 2013 ke atas atau Google Docs untuk dukungan rendering format tabel terlengkap.'
        ]
      }
    ],
    keyTakeaways: [
      'Konversi cerdas merekonstruksi tabel dan paragraf sehingga mudah diedit tanpa merusak margin.',
      'Gunakan fitur potong halaman jika hanya butuh merevisi halaman tertentu.',
      'Kompatibel penuh dengan Microsoft Office, Google Docs, dan LibreOffice.'
    ]
  },

  {
    id: 'tanda-tangan-digital-vs-basah',
    title: 'Tanda Tangan Digital vs Tanda Tangan Basah: Keabsahan Hukum & Keamanan Dokumen',
    category: 'Legalitas & Keamanan',
    summary: 'Mengapa beralih ke tanda tangan elektronik lebih aman, sah secara hukum perdata/bisnis, dan ramah lingkungan dibandingkan mencetak kertas berkali-kali.',
    color: 'bg-amber-100 text-amber-600',
    readTime: '6 min baca',
    date: '12 September 2026',
    author: 'Pakar Hukum Siber & Dokumen Digital',
    paragraphs: [
      {
        heading: '1. Landasan Hukum Tanda Tangan Elektronik di Indonesia',
        text: 'Berdasarkan Undang-Undang No. 11 Tahun 2008 tentang Informasi dan Transaksi Elektronik (UU ITE) serta peraturan perubahannya (UU No. 1 Tahun 2024), tanda tangan elektronik diakui memiliki kekuatan hukum dan akibat hukum yang sah sama halnya dengan tanda tangan basah di atas kertas fisik.'
      },
      {
        heading: '2. Mengapa Tanda Tangan Digital Lebih Aman dari Pemalsuan?',
        text: 'Tanda tangan basah di atas kertas fisik sangat rentan dipalsukan atau ditiru menggunakan teknik jiplak manual. Sebaliknya, pembubuhan tanda tangan pada dokumen digital yang dipadukan dengan enkripsi dokumen dan jejak audit (audit trail) mempersulit pihak tidak bertanggung jawab untuk memodifikasi isi klausul kontrak setelah dokumen ditandatangani.'
      },
      {
        heading: '3. Efisiensi Biaya & Manfaat Lingkungan (Paperless)',
        text: 'Mencetak dokumen 20 lembar hanya untuk ditandatangani satu orang lalu memindainya kembali (scan) merupakan pemborosan kertas, tinta printer, dan waktu operasional. Dengan fitur Tanda Tangan PDF dari PDF Toolbox Pro, Anda dapat:',
        points: [
          'Membubuhkan tanda tangan langsung menggunakan layar sentuh smartphone, mouse, atau gambar paraf transparan.',
          'Menyelesaikan penandatanganan dokumen dalam hitungan detik tanpa meninggalkan meja kerja.',
          'Mendukung gerakan Paperless Office yang ramah lingkungan dan menghemat jutaan rupiah anggaran cetak kantor per tahun.'
        ]
      }
    ],
    keyTakeaways: [
      'Tanda tangan elektronik memiliki keabsahan hukum yang diakui oleh UU ITE di Indonesia.',
      'Mengurangi risiko pemalsuan dokumen serta menghemat biaya kertas dan tinta printer.',
      'Dapat dibubuhkan secara instan via browser smartphone maupun laptop tanpa perlu instalasi aplikasi.'
    ]
  }
];

export const Blog: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <ToolContainer 
      title="Blog & Wawasan Dokumen Digital" 
      description="Artikel mendalam, panduan teknis, dan tips praktis seputar pengelolaan, keamanan, dan optimalisasi berkas PDF."
      onBack={onBack} 
      maxWidth="max-w-6xl"
      showGuide={false}
    >
      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blogPosts.map((post) => (
          <div 
            key={post.id} 
            onClick={() => setSelectedPost(post)}
            className="group bg-white dark:bg-[#161A22] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col items-start cursor-pointer h-full"
          >
            <div className="flex justify-between w-full items-start mb-4">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/40">
                {post.category}
              </span>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={12} />
                {post.readTime}
              </span>
            </div>
            
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
              {post.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6 flex-grow leading-relaxed">
              {post.summary}
            </p>
            
            <div className="flex items-center justify-between w-full pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {post.date}
              </span>
              <button 
                type="button"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 group-hover:translate-x-1 transition-transform"
              >
                <span>Baca Selengkapnya</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FULL ARTICLE READER MODAL */}
      {selectedPost && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white dark:bg-[#161A22] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  {selectedPost.category}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  {selectedPost.readTime}
                </span>
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="Tutup Artikel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body (Scrollable Article Content) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {selectedPost.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <User size={13} />
                    {selectedPost.author}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar size={13} />
                    {selectedPost.date}
                  </span>
                </div>
              </div>

              {/* Lead Summary */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-sm italic leading-relaxed">
                "{selectedPost.summary}"
              </div>

              {/* Article Paragraphs & Points */}
              <div className="space-y-6 text-slate-600 dark:text-slate-300">
                {selectedPost.paragraphs.map((para, idx) => (
                  <div key={idx} className="space-y-2">
                    {para.heading && (
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-2">
                        {para.heading}
                      </h2>
                    )}
                    <p className="text-sm leading-relaxed">
                      {para.text}
                    </p>
                    {para.points && para.points.length > 0 && (
                      <ul className="space-y-2 pl-4 text-xs sm:text-sm list-disc text-slate-600 dark:text-slate-300">
                        {para.points.map((pt, pIdx) => (
                          <li key={pIdx} className="leading-relaxed">
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Key Takeaways Box */}
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Poin Kunci (Key Takeaways):</span>
                </div>
                <ul className="space-y-1.5 text-xs sm:text-sm text-emerald-900/90 dark:text-emerald-300/90 list-disc list-inside pl-1">
                  {selectedPost.keyTakeaways.map((takeaway, tIdx) => (
                    <li key={tIdx} className="leading-relaxed">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Ditulis oleh {selectedPost.author}
              </span>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolContainer>
  );
};

export default Blog;
