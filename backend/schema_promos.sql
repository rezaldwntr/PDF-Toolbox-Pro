-- ==============================================================================
-- SKRIP SQL: SISTEM PROMO, HARGA DINAMIS & PREFERENSI EMAIL MARKETING
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. TAMBAH KOLOM PREFERENSI MARKETING & NOTIFIKASI UPGRADE KE user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS accepts_marketing_emails BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_notified_tier TEXT DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_user_profiles_marketing ON public.user_profiles(accepts_marketing_emails);


-- 2. TABEL PENGATURAN PROMO & HARGA DINAMIS
CREATE TABLE IF NOT EXISTS public.promo_settings (
    id TEXT PRIMARY KEY,                       -- 'flash', 'monthly', 'annual', atau slug custom
    plan_id TEXT NOT NULL,                     -- 'flash', 'monthly', 'annual'
    title TEXT NOT NULL,                       -- contoh: 'Promo Gajian Diskon 35%'
    discount_price NUMERIC NOT NULL,           -- contoh: 19000
    original_price NUMERIC NOT NULL,           -- contoh: 29000
    is_active BOOLEAN NOT NULL DEFAULT false,  -- saklar promo aktif/nonaktif
    target_emails TEXT[] DEFAULT '{}',         -- array email target. Jika kosong = BERLAKU SEMUA USER
    banner_text TEXT,                          -- pengumuman banner
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Data Awal Standar (Non-aktif sampai dinyalakan oleh Admin)
INSERT INTO public.promo_settings (id, plan_id, title, discount_price, original_price, is_active, target_emails, banner_text)
VALUES
('flash', 'flash', 'Flash Sale 24-Jam', 3500, 5000, false, '{}', '⚡ Promo Kilat Diskon 30%'),
('monthly', 'monthly', 'Promo Spesial Monthly Pro', 19000, 29000, false, '{}', '🚀 Diskon Spesial Bulanan Rp19.000'),
('annual', 'annual', 'Promo Spesial Annual VIP', 99000, 149000, false, '{}', '👑 Promo Terbesar Tahunan Hemat 67%')
ON CONFLICT (id) DO NOTHING;


-- 3. ROW LEVEL SECURITY (RLS) UNTUK PROMO SETTINGS
ALTER TABLE public.promo_settings ENABLE ROW LEVEL SECURITY;

-- Publik (tamu & user login) dapat membaca promo yang sedang aktif
CREATE POLICY "Public read active promos"
ON public.promo_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Admin resmi (rezaldewantara@gmail.com) memiliki akses penuh untuk mengubah harga promo
CREATE POLICY "Admin full access on promo_settings"
ON public.promo_settings
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'rezaldewantara@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'rezaldewantara@gmail.com');

-- Backend Cloud Run Service Role memiliki akses penuh
CREATE POLICY "Service Role full access on promo_settings"
ON public.promo_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
