import React from 'react';
import ToolContainer from '../common/ToolContainer';
import { View } from '../../types';
import {
  FileText,
  ShieldCheck,
  CreditCard,
  Lock,
  RefreshCw,
  AlertTriangle,
  FileCode,
  Scale,
  Clock,
  HelpCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
  onSelectView?: (view: View) => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack, onSelectView }) => {
  return (
    <ToolContainer title="Syarat & Ketentuan Layanan" onBack={onBack} maxWidth="max-w-4xl">
      <div className="space-y-8 text-text-secondary leading-relaxed text-sm sm:text-base">
        
        {/* Banner Pengantar / Ikhtisar Lisensi Digital */}
        <div className="flex items-start gap-4 p-5 bg-[#9B4819]/10 dark:bg-[#9B4819]/20 border border-[#9B4819]/25 rounded-2xl shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#9B4819] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#9B4819] dark:text-[#E06D3B] text-base mb-1">
              Perjanjian Layanan Perangkat Lunak & Barang Digital (Digital Goods / SaaS)
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Dokumen ini merupakan perjanjian hukum yang mengikat antara Anda (Pengguna) dan <strong>PDF Toolbox Pro</strong>. 
              Dengan mengakses situs, mengunggah dokumen, atau membeli paket akses digital kami, Anda menyatakan telah membaca, memahami, 
              dan menyetujui seluruh ketentuan di bawah ini.
            </p>
          </div>
        </div>

        {/* 1. Syarat Penggunaan (Conditions of Use) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#9B4819]/10 text-[#9B4819] dark:bg-[#9B4819]/25 dark:text-[#E06D3B] flex items-center justify-center text-xs font-bold">1</span>
            <span>Syarat Penggunaan (Conditions of Use)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Layanan <strong>PDF Toolbox Pro</strong> ditawarkan kepada Anda dengan syarat kepatuhan tanpa syarat terhadap syarat, ketentuan, 
            dan pemberitahuan yang tercantum dalam dokumen ini, serta pedoman atau aturan tambahan yang berlaku untuk setiap fitur atau bagian dari platform kami.
          </p>
        </div>

        {/* 2. Ikhtisar & Penerimaan Ketentuan (Overview) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#9B4819]/10 text-[#9B4819] dark:bg-[#9B4819]/25 dark:text-[#E06D3B] flex items-center justify-center text-xs font-bold">2</span>
            <span>Ikhtisar & Persetujuan (Overview & Acceptance)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Penggunaan Anda atas platform ini merupakan bentuk persetujuan penuh terhadap seluruh Syarat dan Ketentuan ini. Harap membacanya dengan saksama. 
            Jika Anda <strong>tidak menyetujui</strong> salah satu atau seluruh ketentuan ini, Anda diwajibkan untuk segera menghentikan penggunaan situs dan layanan PDF Toolbox Pro.
          </p>
        </div>

        {/* 3. Perubahan Situs & Ketentuan (Modification of Terms & Pricing) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#9B4819]/10 text-[#9B4819] dark:bg-[#9B4819]/25 dark:text-[#E06D3B] flex items-center justify-center text-xs font-bold">3</span>
            <span>Perubahan Layanan & Ketentuan (Modification of Terms)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            PDF Toolbox Pro berhak mengubah, memodifikasi, memperbarui, atau menghentikan sebagian atau seluruh syarat, fitur, harga paket langganan, 
            dan materi pada situs ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Penyesuaian tarif berlaku untuk transaksi pembelian baru berikutnya. 
            Jika terjadi kekeliruan pencantuman harga (*price mistake*), PDF Toolbox Pro berhak menolak atau membatalkan pesanan yang terdampak.
          </p>
        </div>

        {/* 4. Pemberian Lisensi Penggunaan (Grant of License) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <FileCode size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>4. Pemberian Lisensi Penggunaan (Grant of License)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            PDF Toolbox Pro memberikan Anda hak non-eksklusif, tidak dapat dialihkan, dan terbatas untuk mengakses serta memanfaatkan platform perangkat lunak 
            kami semata-mata untuk keperluan pribadi atau operasional bisnis internal Anda selama masa berlaku akun atau paket digital Anda. Anda <strong>dilarang keras</strong> untuk:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-text-secondary pl-2">
            <li>Memodifikasi, membongkar, merekayasa balik (*reverse engineer*), atau melakukan dekompilasi terhadap kode sumber platform;</li>
            <li>Membuat karya turunan (*derivative works*) berdasarkan komponen platform;</li>
            <li>Menggunakan bot, perayap otomatis (*web scraping*), atau skrip otomatis untuk menyedot layanan tanpa izin tertulis;</li>
            <li>Menjual kembali, menyewakan, atau mendistribusikan ulang hak akses akun berbayar Anda kepada pihak ketiga di luar batas wajar.</li>
          </ul>
        </div>

        {/* 5. Hak Kepemilikan & Hak Cipta Dokumen (Proprietary Rights) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#314028] dark:text-emerald-400" />
            <span>5. Hak Kepemilikan & Hak Dokumen Anda (Proprietary Rights)</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 not-prose">
            <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-paper">
              <h4 className="font-serif font-bold text-text-primary text-base mb-1">Hak Cipta Dokumen Anda (100% Milik Anda)</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Anda memegang kepemilikan penuh dan seluruh hak kekayaan intelektual atas setiap berkas PDF, teks, gambar, dan data yang Anda unggah. 
                PDF Toolbox Pro <strong>tidak pernah mengklaim kepemilikan</strong> atau hak lisensi apa pun atas dokumen Anda.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-paper">
              <h4 className="font-serif font-bold text-text-primary text-base mb-1">Hak Milik Platform PDF Toolbox Pro</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Seluruh logo, merek dagang, antarmuka desain (UI/UX), arsitektur perangkat lunak, dan materi situs adalah hak milik eksklusif pengembang PDF Toolbox Pro 
                dan dilindungi oleh undang-undang hak cipta Republik Indonesia serta perjanjian internasional.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Biaya, Pembayaran & Pemenuhan Digital (Fees & Payment via Midtrans) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <CreditCard size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>6. Biaya, Mata Uang & Pembayaran (Fees & Payment Processing)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Sebagai imbalan atas akses fitur premium (seperti <em>24-Hour Flash Pass, Monthly Pro, atau Annual Value Pass</em>), Pengguna setuju membayar biaya lisensi 
            sesuai rincian pada halaman Harga (*Pricing*).
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-text-secondary pl-2">
            <li><strong>Mata Uang Resmi:</strong> Semua harga tercantum dan ditagihkan dalam mata uang Rupiah Indonesia (IDR / Rp).</li>
            <li><strong>Mitra Gerbang Pembayaran Resmi:</strong> Seluruh transaksi elektronik diproses secara aman melalui gerbang pembayaran berizin resmi Bank Indonesia yaitu <strong>PT Midtrans</strong>. Kami mendukung metode pembayaran QRIS (semua e-wallet & m-banking), GoPay, OVO, ShopeePay, DANA, serta Transfer Virtual Account Bank (BCA, Mandiri, BRI, BNI, Permata).</li>
            <li><strong>Pemenuhan Produk Digital Instan:</strong> Karena produk yang dijual adalah hak akses digital (*digital license*), akun Anda akan otomatis dan instan di-upgrade secara langsung setelah pembayaran berhasil diverifikasi oleh sistem Midtrans.</li>
          </ul>
        </div>

        {/* 7. Kebijakan Pembatalan & Pengembalian Dana (Refund & Cancellation Policy) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <RefreshCw size={18} className="text-[#314028] dark:text-emerald-400" />
            <span>7. Kebijakan Pembatalan & Pengembalian Dana (Refund Policy)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Sesuai dengan karakteristik barang digital dan layanan daring yang dapat langsung dikonsumsi:
          </p>
          <div className="p-5 rounded-2xl bg-elevated border border-border-subtle text-xs sm:text-sm space-y-2 shadow-2xs">
            <p className="font-serif font-bold text-text-primary text-base">
              Ketentuan Produk Digital (Intangible Digital Goods):
            </p>
            <p className="text-text-secondary leading-relaxed">
              Pembelian paket akses seperti <strong>24-Hour Flash Pass</strong> bersifat final dan tidak dapat dibatalkan atau di-refund setelah akses berhasil diaktifkan. 
              Pengembalian dana hanya dapat dipertimbangkan jika terjadi kendala teknis fatal yang terbukti disebabkan oleh sistem kami (misalnya: saldo terpotong ganda akibat gangguan jaringan gateway) dan telah diverifikasi oleh tim dukungan teknis kami dalam waktu maksimal 3x24 jam sejak transaksi.
            </p>
          </div>
        </div>

        {/* 8. Kelayakan Pengguna (Eligibility) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#314028] dark:text-emerald-400" />
            <span>8. Kelayakan Pengguna (Eligibility)</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Syarat dan Ketentuan ini mencakup penggunaan gratis oleh Tamu (*Guest*) dan Pengguna Terdaftar (*Free*), serta pengguna berbayar oleh individu, mahasiswa, 
            dosen/akademisi, profesional, maupun korporasi. Pengguna harus berusia minimal 18 tahun atau telah mendapatkan izin dan pengawasan dari orang tua/wali yang sah 
            menurut hukum yang berlaku.
          </p>
        </div>

        {/* 9. Kerahasiaan Dokumen & Pembersihan Otomatis (Confidentiality & Auto-Cleanup) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <Clock size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>9. Kerahasiaan Dokumen & Penghapusan Otomatis (Confidentiality)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Keamanan dan kerahasiaan dokumen Anda adalah komitmen utama kami:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-text-secondary pl-2">
            <li>Seluruh berkas yang diunggah diproses melalui saluran transmisi terenkripsi <strong>TLS 256-bit</strong>.</li>
            <li>Dokumen sementara hasil olah server secara otomatis dan permanen <strong>dihapus dalam 60 menit</strong> (atau maksimal 24 jam untuk tier berlangganan).</li>
            <li>Tidak ada staf, operator, atau sistem otomatis kami yang membaca, menyalin, mendistribusikan, atau memanfaatkan isi dokumen Anda untuk keperluan lain.</li>
          </ul>
        </div>

        {/* 10. Batasan Tanggung Jawab & Sanggahan (Warranty & Liability Disclaimer) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            <span>10. Batasan Tanggung Jawab & Sanggahan (Warranty & Liability)</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            PDF Toolbox Pro berkomitmen untuk mengerahkan upaya teknis terbaik guna memastikan stabilitas dan keakuratan hasil manipulasi dokumen. 
            Namun demikian, layanan ini disediakan atas dasar <strong>"SEBAGAIMANA ADANYA" (*AS IS*)</strong> dan <strong>"SEBAGAIMANA TERSEDIA" (*AS AVAILABLE*)</strong>. 
            Kami tidak memberikan jaminan tersirat bahwa layanan akan bebas dari gangguan tanpa henti atau kompatibel dengan seluruh varian format berkas non-standar. 
            PDF Toolbox Pro tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan bisnis, atau kerusakan data akibat kesalahan operasional pengguna.
          </p>
        </div>

        {/* 11. Kewajiban & Larangan bagi Pengguna (Your Obligations & Warranties) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <Lock size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>11. Kewajiban & Perilaku Pengguna (User Obligations)</span>
          </h3>
          <p className="text-sm text-text-secondary">
            Anda menjamin dan menyatakan kepada PDF Toolbox Pro bahwa berkas dan materi yang Anda unggah:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-text-secondary pl-2">
            <li>Bebas dari virus, worm, Trojan horse, malware, skrip jahat, atau kode komputer berbahaya lainnya;</li>
            <li>Tidak melanggar hak cipta, paten, merek dagang, atau hak privasi pihak ketiga mana pun;</li>
            <li>Tidak memuat konten yang melawan hukum, mengancam, memfitnah, bermuatan pornografi ilegal, penipuan, atau melanggar ketentuan perundang-undangan di Republik Indonesia.</li>
          </ul>
        </div>

        {/* 12. Pengakhiran Akun & Layanan (Termination) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#9B4819]/10 text-[#9B4819] dark:bg-[#9B4819]/25 dark:text-[#E06D3B] flex items-center justify-center text-xs font-bold">12</span>
            <span>Pengakhiran Layanan (Termination)</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            PDF Toolbox Pro berhak, atas kebijakan diskresi wajar, membekukan atau menghentikan akses akun Anda seketika tanpa pemberitahuan jika Anda 
            terbukti melanggar ketentuan ini, menyalahgunakan infrastruktur sistem secara tidak sah, atau melakukan tindakan kecurangan pembayaran.
          </p>
        </div>

        {/* 13. Hukum yang Berlaku & Penyelesaian Sengketa (Applicable Laws) */}
        <div className="space-y-3">
          <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
            <Scale size={18} className="text-[#314028] dark:text-emerald-400" />
            <span>13. Hukum yang Berlaku (Applicable Laws)</span>
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Syarat dan Ketentuan ini diatur dan ditafsirkan sepenuhnya sesuai dengan hukum dan peraturan perundang-undangan yang berlaku di 
            <strong> Negara Kesatuan Republik Indonesia</strong>. Segala perselisihan yang timbul akan diupayakan untuk diselesaikan secara musyawarah untuk mufakat 
            sebelum diajukan ke ranah peradilan di wilayah yurisdiksi Indonesia.
          </p>
        </div>

        {/* 14. Pertanyaan, Umpan Balik & Dukungan (Questions & Feedback) */}
        <div className="p-6 bg-elevated rounded-2xl border border-border-subtle space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-text-primary font-serif font-bold text-base">
            <HelpCircle size={20} className="text-[#9B4819] dark:text-[#E06D3B]" />
            <span>14. Pertanyaan, Hubungi Dukungan & Legal Notice</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Jika Anda memiliki pertanyaan seputar Syarat & Ketentuan ini atau membutuhkan bantuan terkait transaksi dan akun Anda, 
            silakan hubungi tim kami melalui menu{' '}
            {onSelectView ? (
              <button
                onClick={() => onSelectView(View.CONTACT)}
                className="text-[#9B4819] dark:text-[#E06D3B] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Hubungi Dukungan <ExternalLink size={12} />
              </button>
            ) : (
              <span className="font-semibold text-text-primary">Hubungi Dukungan</span>
            )}.
          </p>
          <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between text-xs text-text-muted gap-2">
            <div>
              <strong>Legal Notice:</strong> PDF Toolbox Pro adalah platform layanan digital / Software-as-a-Service (SaaS). 
              Fasilitasi pemrosesan transaksi pembayaran didukung oleh <strong>PT Midtrans</strong>.
            </div>
            <div className="shrink-0 font-medium">
              Revisi Terakhir: September 2026
            </div>
          </div>
        </div>

      </div>
    </ToolContainer>
  );
};

export default TermsOfService;
