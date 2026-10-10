// frontend/components/developer/DeveloperApiHub.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowLeft,
  Loader2,
  CreditCard,
  Shield,
  AlertCircle,
  X
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

interface ApiPackageInfo {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  credits: string;
  creditsNum: number;
  type: 'prepaid' | 'subscription';
  rateLimit: string;
  maxFileSize: string;
  badge?: string;
  period?: string;
}

const ALL_PACKAGES: Record<string, ApiPackageInfo> = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    price: 'Rp 49.000',
    priceNum: 49000,
    credits: '750 Request',
    creditsNum: 750,
    type: 'prepaid',
    rateLimit: '3 req/detik',
    maxFileSize: '15 MB',
  },
  growth: {
    id: 'growth',
    name: 'Growth Pack',
    price: 'Rp 149.000',
    priceNum: 149000,
    credits: '2.500 Request',
    creditsNum: 2500,
    type: 'prepaid',
    rateLimit: '5 req/detik',
    maxFileSize: '25 MB',
    badge: 'Populer',
  },
  business: {
    id: 'business',
    name: 'Business Pack',
    price: 'Rp 399.000',
    priceNum: 399000,
    credits: '8.000 Request',
    creditsNum: 8000,
    type: 'prepaid',
    rateLimit: '10 req/detik',
    maxFileSize: '50 MB',
  },
  scale: {
    id: 'scale',
    name: 'Scale Pack',
    price: 'Rp 899.000',
    priceNum: 899000,
    credits: '20.000 Request',
    creditsNum: 20000,
    type: 'prepaid',
    rateLimit: '20 req/detik',
    maxFileSize: '50 MB',
  },
  dev_starter: {
    id: 'dev_starter',
    name: 'Dev Starter',
    price: 'Rp 99.000',
    priceNum: 99000,
    credits: '3.000 Request / bln',
    creditsNum: 3000,
    type: 'subscription',
    rateLimit: '5 req/detik',
    maxFileSize: '25 MB',
    period: '/ bulan',
  },
  dev_pro: {
    id: 'dev_pro',
    name: 'Dev Pro',
    price: 'Rp 249.000',
    priceNum: 249000,
    credits: '10.000 Request / bln',
    creditsNum: 10000,
    type: 'subscription',
    rateLimit: '15 req/detik',
    maxFileSize: '50 MB',
    badge: 'Terbaik',
    period: '/ bulan',
  },
  dev_scale: {
    id: 'dev_scale',
    name: 'Dev Scale',
    price: 'Rp 699.000',
    priceNum: 699000,
    credits: '35.000 Request / bln',
    creditsNum: 35000,
    type: 'subscription',
    rateLimit: '30 req/detik',
    maxFileSize: '100 MB',
    period: '/ bulan',
  },
};

const DeveloperApiHub: React.FC<DeveloperApiHubProps> = ({ onBack }) => {
  const { user, isGuest, signInWithGoogle } = useAuth();
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
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  const userId = user?.id || 'guest_dev_preview';

  // Muat kunci API pengguna dari backend
  const fetchKey = useCallback(async () => {
    setIsLoadingKey(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/keys/user/${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setApiKeyData(json.data[0]);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat kunci API:', err);
    } finally {
      setIsLoadingKey(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKey();
  }, [fetchKey]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Polling status transaksi Midtrans
  const startPollingPayment = useCallback((activeOrderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/payment/status/${activeOrderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_paid) {
            clearInterval(pollIntervalRef.current);
            setIsProcessingPayment(false);
            setTopUpModalOpen(false);
            addToast('Pembayaran berhasil! Kredit API telah ditambahkan ke akun Anda.', 'success');
            await fetchKey();
          }
        }
      } catch (err) {
        console.warn('Gagal memeriksa status pembayaran Midtrans:', err);
      }
    }, 3500);
  }, [addToast, fetchKey]);

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

  // Eksekusi Pembayaran Top-Up Kredit API Resmi via Midtrans Snap
  const handleTopUpConfirm = async () => {
    if (isGuest) {
      addToast('Silakan masuk dengan akun Google terlebih dahulu agar kunci API dan kredit tersimpan aman.', 'info');
      await signInWithGoogle();
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/payment/create-snap-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPackage,
          user_id: user?.id || userId,
          user_email: user?.email || 'developer@pdftoolbox.app',
          user_name: user?.fullName || 'Developer PDF Toolbox',
          api_key: apiKeyData?.api_key || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Gagal membuat sesi pembayaran Midtrans.');
      }

      const data = await res.json();

      if ((window as any).snap && data.token && data.token !== 'DEMO-SNAP-TOKEN') {
        (window as any).snap.pay(data.token, {
          onSuccess: async (result: any) => {
            console.log('Top-up Midtrans Snap Success:', result);
            setIsProcessingPayment(false);
            setTopUpModalOpen(false);
            addToast('Pembayaran berhasil! Kredit API telah ditambahkan ke akun Anda.', 'success');
            await fetchKey();
          },
          onPending: (result: any) => {
            console.log('Top-up Midtrans Snap Pending:', result);
            addToast('Menunggu pembayaran diselesaikan...', 'info');
            if (data.order_id) {
              startPollingPayment(data.order_id);
            }
          },
          onError: (result: any) => {
            console.error('Top-up Midtrans Snap Error:', result);
            setIsProcessingPayment(false);
            setPaymentError('Pembayaran dibatalkan atau gagal diproses oleh gateway.');
            addToast('Pembayaran gagal atau dibatalkan.', 'error');
          },
          onClose: () => {
            console.log('Pengguna menutup jendela pembayaran Snap');
            setIsProcessingPayment(false);
            if (data.order_id) {
              startPollingPayment(data.order_id);
            }
          },
        });
      } else if (data.redirect_url) {
        window.open(data.redirect_url, '_blank');
        if (data.order_id) {
          startPollingPayment(data.order_id);
        }
      } else {
        throw new Error('Sesi pembayaran Midtrans tidak dapat dimuat.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Gagal memproses pembayaran top-up.');
      addToast(err.message || 'Gagal memproses pembayaran.', 'error');
      setIsProcessingPayment(false);
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
            className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-[#9B4819] dark:hover:text-[#E06D3B] mb-3 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Halaman Utama</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#9B4819] text-white flex items-center justify-center shadow-paper">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                B2B Micro-API Developer Hub
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                Infrastruktur otomasi manipulasi PDF berbiaya rendah untuk Startup, UMKM, dan Pengembang Perangkat Lunak.
              </p>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25 font-mono">
          <Server size={14} />
          <span>v8.5 Production API</span>
        </span>
      </div>

      {/* Bagian 1: Manajemen Kunci API */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-paper mb-10 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border-subtle/80">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-text-primary flex items-center gap-2">
              <Key size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
              <span>Kunci API Developer Anda</span>
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Gunakan kunci rahasia ini di header HTTP <code className="px-1.5 py-0.5 rounded bg-elevated border border-border-subtle text-[#9B4819] dark:text-[#E06D3B] font-mono text-[11px]">X-API-Key</code> pada setiap pemanggilan endpoint.
            </p>
          </div>

          {apiKeyData && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-canvas border border-border-subtle text-right">
                <span className="text-[10px] uppercase font-bold text-text-muted block tracking-wider">Saldo Kredit</span>
                <span className="text-xl font-bold text-[#9B4819] dark:text-[#E06D3B] font-mono">
                  {apiKeyData.credits_remaining}
                </span>
                <span className="text-xs text-text-muted"> / {apiKeyData.credits_total}</span>
              </div>
              <button
                type="button"
                onClick={() => setTopUpModalOpen(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#9B4819] hover:bg-[#7E3812] text-white font-bold text-xs shadow-paper active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
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
              <div className="relative flex-1 w-full bg-canvas rounded-2xl px-4 py-3 border border-border-subtle font-mono text-sm text-text-primary flex items-center justify-between">
                <span>
                  {showKey ? apiKeyData.api_key : `${apiKeyData.api_key.slice(0, 14)}••••••••••••••••••••••••`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title={showKey ? 'Sembunyikan' : 'Tampilkan Kunci'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyKey}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 rounded-2xl bg-elevated hover:bg-border-subtle border border-border-strong text-text-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check size={16} className="text-[#314028] dark:text-[#34D399]" /> : <Copy size={16} />}
                <span>{copied ? 'Tersalin!' : 'Salin Kunci'}</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-canvas/50 rounded-2xl border border-dashed border-border-strong/60">
              <p className="text-sm font-semibold text-text-primary mb-2">
                Anda belum memiliki Kunci API Developer yang aktif.
              </p>
              <p className="text-xs text-text-secondary mb-5">
                Dapatkan 100 kredit gratis otomatis di lingkungan Sandbox untuk mulai menguji integrasi di localhost atau Postman.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateKey('sandbox', 'prepaid')}
                disabled={isGenerating}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#9B4819] hover:bg-[#7E3812] active:scale-95 text-white font-bold text-xs shadow-paper transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Pilihan Skema Biaya Fleksibel
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1.5 font-sans">
            Pilih sistem kredit prabayar tanpa komitmen, atau langganan bulanan hemat hingga 70% untuk produksi rutin.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-2xl bg-elevated border border-border-subtle mt-6">
            <button
              type="button"
              onClick={() => setPricingTab('prepaid')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                pricingTab === 'prepaid'
                  ? 'bg-surface text-[#9B4819] dark:text-[#E06D3B] shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Kredit Prabayar (Pay-As-You-Go)
            </button>
            <button
              type="button"
              onClick={() => setPricingTab('subscription')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                pricingTab === 'subscription'
                  ? 'bg-surface text-[#9B4819] dark:text-[#E06D3B] shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
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
                className="bg-surface rounded-3xl p-6 border border-border-subtle shadow-paper hover:border-[#9B4819]/60 hover:shadow-paper-float transition-all flex flex-col justify-between relative group"
              >
                {pkg.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#9B4819] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                    {pkg.badge}
                  </span>
                )}
                <div>
                  <h3 className="font-serif font-bold text-text-primary text-base">{pkg.name}</h3>
                  <div className="mt-3">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-text-primary">{pkg.price}</span>
                    <span className="text-xs text-text-muted block mt-0.5">Sekali bayar (aktif 365 hari)</span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border-subtle/80 space-y-2.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span><strong>{pkg.credits}</strong> Request Panggilan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span>Hanya <strong>{pkg.unit}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span>Batas Berkas: <strong>{pkg.max}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
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
                  className={`mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                    pkg.badge
                      ? 'bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper'
                      : 'bg-elevated hover:bg-[#9B4819] text-text-primary hover:text-white border border-border-subtle hover:border-[#9B4819]'
                  }`}
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
                className="bg-surface rounded-3xl p-6 border border-border-subtle hover:border-[#9B4819]/60 shadow-paper hover:shadow-paper-float transition-all flex flex-col justify-between relative group"
              >
                {sub.badge && (
                  <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#9B4819] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-xs">
                    {sub.badge}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-text-primary text-base">{sub.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#314028]/10 text-[#314028] dark:text-[#34D399] border border-[#314028]/25">
                      {sub.save}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="font-serif text-3xl font-bold text-text-primary">{sub.price}</span>
                    <span className="text-xs text-text-muted">{sub.period}</span>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border-subtle/80 space-y-2.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span><strong>{sub.credits}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span>Hanya <strong>{sub.unit}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                      <span>Batas Berkas: <strong>{sub.max}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-[#314028] dark:text-[#34D399] shrink-0" />
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
                  className={`mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                    sub.badge
                      ? 'bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper'
                      : 'bg-elevated hover:bg-[#9B4819] hover:text-white text-text-primary border border-border-subtle'
                  }`}
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
      <div className="bg-[#181818] text-[#F2EFE9] rounded-3xl p-6 sm:p-8 shadow-paper border border-[#2D2D2D]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2D2D2D]">
          <div>
            <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
              <Code2 size={18} className="text-[#9B4819] dark:text-[#E06D3B]" />
              <span>Contoh Kode Integrasi API</span>
            </h2>
            <p className="text-xs text-[#A8A49A] mt-1">
              Pilih endpoint dan bahasa pemrograman untuk menyalin kode siap pakai ke aplikasi Anda.
            </p>
          </div>

          {/* Endpoint Selector */}
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="bg-[#242424] text-[#F2EFE9] text-xs font-semibold rounded-xl px-3 py-2 border border-[#3A3A3A] outline-none focus:ring-2 focus:ring-[#9B4819] cursor-pointer"
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
                  ? 'bg-[#9B4819] text-white shadow-xs'
                  : 'text-[#A8A49A] hover:text-white hover:bg-white/10'
              }`}
            >
              {lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : lang === 'node' ? 'Node.js' : 'PHP'}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <div className="mt-4 relative bg-[#121212] rounded-2xl p-4 sm:p-5 border border-[#242424] font-mono text-xs overflow-x-auto">
          <pre className="text-[#34D399] leading-relaxed">
            <code>{getCodeSnippet()}</code>
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(getCodeSnippet());
              addToast('Contoh kode disalin!', 'success');
            }}
            className="absolute top-3 right-3 p-2 rounded-xl bg-[#242424] hover:bg-[#2D2D2D] text-[#A8A49A] hover:text-white transition-colors cursor-pointer border border-[#3A3A3A]"
            title="Salin Kode"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Top-Up / Pembelian Kredit API */}
      {topUpModalOpen && (() => {
        const pkg = ALL_PACKAGES[selectedPackage] || {
          id: selectedPackage,
          name: selectedPackage.replace('_', ' ').toUpperCase(),
          price: 'Rp -',
          priceNum: 0,
          credits: '-',
          creditsNum: 0,
          type: 'prepaid',
          rateLimit: '-',
          maxFileSize: '-',
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-surface rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-border-subtle shadow-paper-float relative">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => !isProcessingPayment && setTopUpModalOpen(false)}
                disabled={isProcessingPayment}
                className="absolute top-5 right-5 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors cursor-pointer disabled:opacity-40"
                title="Tutup"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="pr-8 mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9B4819]/10 text-[#9B4819] dark:text-[#E06D3B] text-[11px] font-bold uppercase tracking-wider mb-2">
                  <CreditCard size={13} />
                  <span>Gerbang Pembayaran Midtrans</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-text-primary">
                  Konfirmasi Top-Up Kredit API
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Kredit akan langsung ditambahkan ke Kunci API Anda secara instan begitu pembayaran terverifikasi.
                </p>
              </div>

              {/* Detail Paket Terpilih */}
              <div className="bg-canvas rounded-2xl p-4 sm:p-5 border border-border-subtle space-y-3.5 mb-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">
                      Paket yang Dipilih
                    </span>
                    <h4 className="font-serif text-lg font-bold text-text-primary mt-0.5">
                      {pkg.name}
                    </h4>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-[#9B4819] dark:text-[#E06D3B]">
                      {pkg.type === 'prepaid' ? 'Prabayar (Aktif 365 Hari)' : 'Langganan Bulanan'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">
                      Total Tagihan
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#9B4819] dark:text-[#E06D3B]">
                      {pkg.price}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-subtle/80 grid grid-cols-2 gap-3 text-xs text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                    <span>Kuota: <strong>{pkg.credits}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#314028] dark:text-[#34D399] shrink-0" />
                    <span>Maks Berkas: <strong>{pkg.maxFileSize}</strong></span>
                  </div>
                </div>

                {/* Target Key Info */}
                <div className="pt-3 border-t border-border-subtle/80 text-xs">
                  <span className="text-text-muted text-[11px] font-medium block mb-1">
                    Kunci API Penerima Kredit:
                  </span>
                  {apiKeyData ? (
                    <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-border-subtle font-mono text-[11px] text-text-primary">
                      <Key size={13} className="text-[#9B4819] dark:text-[#E06D3B] shrink-0" />
                      <span className="truncate flex-1">{apiKeyData.api_key}</span>
                      <span className="text-[10px] font-bold text-[#314028] dark:text-[#34D399] uppercase shrink-0">
                        Aktif
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-border-subtle text-text-secondary text-[11px]">
                      <Sparkles size={13} className="text-[#9B4819] dark:text-[#E06D3B] shrink-0" />
                      <span>Kunci API baru akan otomatis diterbitkan untuk akun <strong>{user?.email || 'Anda'}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Midtrans Trust & Payment Channels */}
              <div className="bg-[#314028]/5 dark:bg-[#34D399]/10 rounded-2xl p-3.5 border border-[#314028]/15 dark:border-[#34D399]/20 mb-5 text-xs text-text-secondary flex items-start gap-2.5">
                <Shield size={16} className="text-[#314028] dark:text-[#34D399] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-text-primary">
                    Mendukung QRIS & Virtual Account Resmi
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    GoPay, OVO, ShopeePay, Dana, LinkAja, BCA, BNI, BRI, Permata & Mandiri. Verifikasi instan 24/7.
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {paymentError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400 mb-5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  disabled={isProcessingPayment}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:bg-elevated transition-all cursor-pointer min-h-[44px] disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleTopUpConfirm}
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#9B4819] hover:bg-[#7E3812] text-white shadow-paper active:scale-95 transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Menyiapkan Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>Bayar Sekarang ({pkg.price})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DeveloperApiHub;
