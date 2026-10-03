// frontend/components/developer/DeveloperApiHub.tsx
import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  RotateCcw, 
  Sparkles, 
  ChevronRight, 
  Code2, 
  Server, 
  CheckCircle2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BACKEND_URL } from '../../config';

interface DeveloperApiHubProps {
  onBack: () => void;
}

interface ApiKeyData {
  api_key: string;
  user_id: string;
  plan_name: string;
  plan_type: 'prepaid' | 'subscription';
  credits_total: number;
  credits_remaining: number;
  rate_limit_rps: number;
  is_active: boolean;
  total_calls: number;
  created_at: string;
}

const DeveloperApiHub: React.FC<DeveloperApiHubProps> = ({ onBack }) => {
  const { user, isGuest } = useAuth();
  const { addToast } = useToast();

  const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [pricingTab, setPricingTab] = useState<'prepaid' | 'subscription'>('prepaid');
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'node' | 'php'>('curl');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('compress');
  const [topUpModalOpen, setTopUpModalOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('starter');

  const userId = user?.id || 'guest_dev_preview';

  // Muat kunci API pengguna dari backend
  useEffect(() => {
    let isMounted = true;
    const fetchKey = async () => {
      setIsLoadingKey(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/keys/user/${userId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0 && isMounted) {
            setApiKeyData(json.data[0]);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat kunci API:', err);
      } finally {
        if (isMounted) setIsLoadingKey(false);
      }
    };

    fetchKey();
    return () => { isMounted = false; };
  }, [userId]);

  // Handler Buat Kunci API Baru (Sandbox 100 Kredit)
  const handleGenerateKey = async (planId = 'sandbox', planType = 'prepaid') => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_email: user?.email || 'developer@example.com',
          plan_id: planId,
          plan_type: planType,
        }),
      });

      if (!res.ok) throw new Error('Gagal menghasilkan kunci API.');
      const json = await res.json();
      setApiKeyData(json.data);
      addToast('Kunci API baru berhasil diterbitkan dengan 100 kredit Sandbox!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal membuat kunci API.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (!apiKeyData) return;
    navigator.clipboard.writeText(apiKeyData.api_key);
    setCopied(true);
    addToast('Kunci API disalin ke clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTopUpConfirm = async () => {
    if (!apiKeyData) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/keys/top-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKeyData.api_key,
          package_id: selectedPackage,
        }),
      });

      if (!res.ok) throw new Error('Gagal memproses top-up.');
      const json = await res.json();
      setApiKeyData(json.data);
      setTopUpModalOpen(false);
      addToast('Kredit API berhasil ditambahkan ke akun Anda!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Gagal mengisi saldo kredit.', 'error');
    }
  };

  const currentKey = apiKeyData?.api_key || 'ptpro_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  // Contoh kode dinamis
  const getCodeSnippet = () => {
    const epMap: Record<string, string> = {
      compress: '/tools/compress-pdf',
      redact: '/tools/redact-pdf',
      bank_statement: '/tools/parse-bank-statement',
      ocr: '/tools/ocr-pdf',
    };
    const targetUrl = `https://pdftoolbox.app${epMap[selectedEndpoint]}`;

    if (selectedLang === 'curl') {
      return `curl -X POST "${targetUrl}" \\
  -H "X-API-Key: ${currentKey}" \\
  -F "file=@dokumen.pdf" \\
  -o "hasil_dokumen.pdf"`;
    }
    if (selectedLang === 'python') {
      return `import requests

url = "${targetUrl}"
headers = {"X-API-Key": "${currentKey}"}
files = {"file": open("dokumen.pdf", "rb")}

response = requests.post(url, headers=headers, files=files)
if response.status_code == 200:
    with open("hasil_dokumen.pdf", "wb") as f:
        f.write(response.content)
    print("Selesai! Sisa Kredit:", response.headers.get("X-API-Credit-Remaining"))
else:
    print("Error:", response.json())`;
    }
    if (selectedLang === 'node') {
      return `const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function processPdf() {
  const form = new FormData();
  form.append('file', fs.createReadStream('dokumen.pdf'));

  const response = await axios.post('${targetUrl}', form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': '${currentKey}',
    },
    responseType: 'arraybuffer',
  });

  fs.writeFileSync('hasil_dokumen.pdf', response.data);
  console.log('Selesai! Sisa Kredit:', response.headers['x-api-credit-remaining']);
}
processPdf();`;
    }
    // PHP
    return `<?php
$ch = curl_init();
$file = new CURLFile('dokumen.pdf', 'application/pdf');

curl_setopt_array($ch, [
  CURLOPT_URL => "${targetUrl}",
  CURLOPT_POST => 1,
  CURLOPT_HTTPHEADER => ["X-API-Key: ${currentKey}"],
  CURLOPT_POSTFIELDS => ["file" => $file],
  CURLOPT_RETURNTRANSFER => true,
]);

$response = curl_exec($ch);
file_put_contents("hasil_dokumen.pdf", $response);
curl_close($ch);
?>`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Tombol Kembali & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Halaman Utama</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                B2B Micro-API Developer Hub
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Infrastruktur otomasi manipulasi PDF berbiaya rendah untuk Startup, UMKM, dan Pengembang Perangkat Lunak.
              </p>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <Server size={14} />
          <span>v8.5 Production API</span>
        </span>
      </div>

      {/* Bagian 1: Manajemen Kunci API */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm mb-10 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key size={18} className="text-blue-600 dark:text-blue-400" />
              <span>Kunci API Developer Anda</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gunakan kunci rahasia ini di header HTTP <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px]">X-API-Key</code> pada setiap pemanggilan endpoint.
            </p>
          </div>

          {apiKeyData && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Saldo Kredit</span>
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  {apiKeyData.credits_remaining}
                </span>
                <span className="text-xs text-slate-400"> / {apiKeyData.credits_total}</span>
              </div>
              <button
                type="button"
                onClick={() => setTopUpModalOpen(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Zap size={14} className="fill-current text-amber-300" />
                <span>Top Up Kredit</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          {apiKeyData ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full bg-slate-50 dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>
                  {showKey ? apiKeyData.api_key : `${apiKeyData.api_key.slice(0, 14)}••••••••••••••••••••••••`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={showKey ? 'Sembunyikan' : 'Tampilkan Kunci'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyKey}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? 'Tersalin!' : 'Salin Kunci'}</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Anda belum memiliki Kunci API Developer yang aktif.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Dapatkan 100 kredit gratis otomatis di lingkungan Sandbox untuk mulai menguji integrasi di localhost atau Postman.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateKey('sandbox', 'prepaid')}
                disabled={isGenerating}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={16} />
                <span>{isGenerating ? 'Menerbitkan Kunci...' : 'Terbitkan Kunci API Gratis (100 Request)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bagian 2: Skema Harga API Ganda (Kredit vs Langganan) */}
      <div className="mb-14">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pilihan Skema Biaya Fleksibel
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Pilih sistem kredit prabayar tanpa komitmen, atau langganan bulanan hemat hingga 70% untuk produksi rutin.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-6">
            <button
              type="button"
              onClick={() => setPricingTab('prepaid')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                pricingTab === 'prepaid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kredit Prabayar (Pay-As-You-Go)
            </button>
            <button
              type="button"
              onClick={() => setPricingTab('subscription')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                pricingTab === 'subscription'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Langganan Bulanan (Hemat s.d 70%)
            </button>
          </div>
        </div>

        {/* Tabel Opsi 1: Kredit Prabayar */}
        {pricingTab === 'prepaid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { id: 'starter', name: 'Starter Pack', price: 'Rp 49.000', credits: '750', unit: 'Rp 65/call', max: '15 MB', rps: '3 req/detik' },
              { id: 'growth', name: 'Growth Pack', price: 'Rp 149.000', credits: '2.500', unit: 'Rp 59/call', max: '25 MB', rps: '5 req/detik', badge: 'Populer' },
              { id: 'business', name: 'Business Pack', price: 'Rp 399.000', credits: '8.000', unit: 'Rp 49/call', max: '50 MB', rps: '10 req/detik' },
              { id: 'scale', name: 'Scale Pack', price: 'Rp 899.000', credits: '20.000', unit: 'Rp 44/call', max: '50 MB', rps: '20 req/detik' },
            ].map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col justify-between relative group"
              >
                {pkg.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm">
                    {pkg.badge}
                  </span>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{pkg.name}</h3>
                  <div className="mt-3">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{pkg.price}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Sekali bayar (aktif 365 hari)</span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span><strong>{pkg.credits}</strong> Request Panggilan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Hanya <strong>{pkg.unit}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Batas Berkas: <strong>{pkg.max}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Kecepatan: {pkg.rps}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg.id);
                    setTopUpModalOpen(true);
                  }}
                  className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-800 hover:text-white dark:text-slate-200 dark:hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Beli Paket</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Tabel Opsi 2: Langganan Bulanan */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { id: 'dev_starter', name: 'Dev Starter', price: 'Rp 99.000', period: '/ bulan', credits: '3.000 req / bln', unit: 'Rp 33/call', save: 'Hemat 49%', max: '25 MB', rps: '5 req/detik', extra: 'Email Support' },
              { id: 'dev_pro', name: 'Dev Pro', price: 'Rp 249.000', period: '/ bulan', credits: '10.000 req / bln', unit: 'Rp 24/call', save: 'Hemat 60%', max: '50 MB', rps: '15 req/detik', badge: 'Terbaik', extra: 'Priority Queue + Email' },
              { id: 'dev_scale', name: 'Dev Scale', price: 'Rp 699.000', period: '/ bulan', credits: '35.000 req / bln', unit: 'Rp 19/call', save: 'Hemat 70%', max: '100 MB', rps: '30 req/detik', extra: 'Webhook + WhatsApp SLA' },
            ].map((sub) => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-md flex flex-col justify-between relative group"
              >
                {sub.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm">
                    {sub.badge}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{sub.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      {sub.save}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{sub.price}</span>
                    <span className="text-xs text-slate-400">{sub.period}</span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                      <span><strong>{sub.credits}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                      <span>Hanya <strong>{sub.unit}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                      <span>Batas Berkas: <strong>{sub.max}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                      <span>Dukungan: {sub.extra}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPackage(sub.id);
                    setTopUpModalOpen(true);
                  }}
                  className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Langganan Sekarang</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bagian 3: Dokumentasi Cepat & Contoh Kode Multibahasa */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 size={18} className="text-blue-400" />
              <span>Contoh Kode Integrasi API</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pilih endpoint dan bahasa pemrograman untuk menyalin kode siap pakai ke aplikasi Anda.
            </p>
          </div>

          {/* Endpoint Selector */}
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="bg-slate-800 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="compress">Kompres PDF (/tools/compress-pdf)</option>
            <option value="redact">Sensor NIK / UU PDP (/tools/redact-pdf)</option>
            <option value="bank_statement">Rekening Koran (/tools/parse-bank-statement)</option>
            <option value="ocr">OCR Teks (/tools/ocr-pdf)</option>
          </select>
        </div>

        {/* Tab Bahasa Pemrograman */}
        <div className="flex items-center gap-2 mt-5">
          {(['curl', 'python', 'node', 'php'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLang(lang)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedLang === lang
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : lang === 'node' ? 'Node.js' : 'PHP'}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <div className="mt-4 relative bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 font-mono text-xs overflow-x-auto">
          <pre className="text-emerald-400 leading-relaxed">
            <code>{getCodeSnippet()}</code>
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(getCodeSnippet());
              addToast('Contoh kode disalin!', 'success');
            }}
            className="absolute top-3 right-3 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Salin Kode"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Top-Up / Pembelian */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Konfirmasi Top-Up Kredit API
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Kredit akan langsung ditambahkan ke kunci API Anda secara instan setelah pembayaran terkonfirmasi.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Paket yang Dipilih</span>
              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 capitalize">
                {selectedPackage.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTopUpModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTopUpConfirm}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperApiHub;
