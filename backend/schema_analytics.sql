-- ==============================================================================
-- SKRIP SQL ANALITIK, TRANSAKSI, & TELEMETRI PDF TOOLBOX PRO
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. TABEL RIWAYAT TRANSAKSI PEMBAYARAN MIDTRANS
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,                       -- Order ID (contoh: PDFTB-FLASH-user123-1726912345)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    plan_id TEXT NOT NULL,                     -- 'flash', 'monthly', 'annual'
    gross_amount NUMERIC NOT NULL,             -- 5000, 29000, 149000
    status TEXT NOT NULL DEFAULT 'pending',    -- 'settlement', 'capture', 'pending', 'cancel', 'expire', 'deny'
    payment_type TEXT,                         -- 'qris', 'gopay', 'shopeepay', 'bank_transfer', dll.
    transaction_time TIMESTAMPTZ,
    settlement_time TIMESTAMPTZ,
    raw_response JSONB,                        -- Respons biner/JSON lengkap dari Midtrans
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indeks performa untuk query cepat transaksi
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);


-- 2. TABEL LOG PENGGUNAAN ALAT (TAMU & USER LOGIN)
CREATE TABLE IF NOT EXISTS public.tool_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name TEXT NOT NULL,                   -- 'merge', 'split', 'compress', 'word', 'excel', 'ppt', 'image', 'ocr', 'watermark', 'protect', 'unlock', 'crop', 'pdfa', 'edit', 'translate', 'organize', 'text', 'sign'
    is_guest BOOLEAN NOT NULL DEFAULT true,    -- true jika tanpa login
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    session_id TEXT,                           -- Anonymous visitor UUID dari browser
    file_size_bytes BIGINT DEFAULT 0,          -- Ukuran file yang diproses
    page_count INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'success',    -- 'success', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indeks performa untuk agregasi metrik analitik
CREATE INDEX IF NOT EXISTS idx_tool_usages_tool_name ON public.tool_usages(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usages_is_guest ON public.tool_usages(is_guest);
CREATE INDEX IF NOT EXISTS idx_tool_usages_user_id ON public.tool_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usages_created_at ON public.tool_usages(created_at DESC);


-- 3. KONFIGURASI ROW LEVEL SECURITY (RLS)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usages ENABLE ROW LEVEL SECURITY;

-- Pengguna hanya bisa membaca transaksi milik mereka sendiri
CREATE POLICY "Users can view own transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Backend Cloud Run (Service Role Key) memiliki akses penuh membaca dan menulis
CREATE POLICY "Service Role full access on transactions"
ON public.payment_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Backend Service Role memiliki akses penuh pada log pemakaian
CREATE POLICY "Service Role full access on tool usages"
ON public.tool_usages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Pengguna publik/tamu diizinkan merekam (INSERT) telemetri pemakaian
CREATE POLICY "Public insert tool usages"
ON public.tool_usages
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
