-- ============================================
-- Vytvorenie DEV MODE používateľov
-- Spustite tento script v Supabase SQL Editore PRE použitie DEV MODE
-- ============================================

-- POZNÁMKA: Toto vytvorí len profily bez auth.users záznamov
-- DEV MODE nepotrebuje skutočnú autentifikáciu, len databázové záznamy

-- Dočasne vypnúť RLS kontrolu pre tento insert
SET session_replication_role = replica;

-- 1. Vytvoriť profil pre DEV odosielajúceho lekára
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  user_type,
  ambulance_code,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'odosielajuci@dev.sk',
  'DEV Odosielajúci Lekár',
  'sending',
  'OD',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  ambulance_code = EXCLUDED.ambulance_code;

-- 2. Vytvoriť profil pre DEV prijímajúceho lekára
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  user_type,
  ambulance_code,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'prijimajuci@dev.sk',
  'DEV Prijímajúci Lekár',
  'receiving',
  'PJ',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  ambulance_code = EXCLUDED.ambulance_code;

-- Zapnúť späť RLS kontrolu
SET session_replication_role = DEFAULT;

-- ============================================
-- Overenie že profily boli vytvorené
-- ============================================
SELECT 
  id,
  email,
  full_name,
  user_type,
  ambulance_code,
  created_at
FROM public.profiles
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
)
ORDER BY user_type;

-- ============================================
-- VÝSLEDOK: Mali by ste vidieť 2 záznamy:
-- 1. DEV Odosielajúci Lekár (sending)
-- 2. DEV Prijímajúci Lekár (receiving)
-- ============================================

