-- SQL skript na vytvorenie chýbajúceho profilu pre používateľa
-- Použite tento skript, ak používateľ má auth.users záznam, ale chýba mu profil v profiles tabuľke

-- ============================================
-- KROK 1: Skontrolujte, či už existuje profil
-- ============================================
-- Spustite tento SELECT, aby ste videli aktuálny stav:
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  p.id as profile_id,
  p.email as profile_email,
  CASE 
    WHEN p.id IS NULL THEN 'CHÝBA PROFIL - možno vytvoriť'
    WHEN p.id = au.id THEN 'OK - profil existuje s správnym ID'
    WHEN p.id != au.id THEN 'PROBLÉM - profil existuje s iným ID'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON p.email = au.email
WHERE au.id = 'dea8cb66-2bf6-46b1-b6d6-14dfba856545';

-- ============================================
-- KROK 2: Vytvorenie profilu (spustite len ak KROK 1 ukázal "CHÝBA PROFIL")
-- ============================================
-- Tento skript vytvorí profil len ak:
-- 1. Profil s týmto ID ešte neexistuje
-- 2. Profil s týmto emailom ešte neexistuje
INSERT INTO profiles (
  id,
  email,
  full_name,
  user_type,
  created_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
  COALESCE(raw_user_meta_data->>'user_type', 'sending')::TEXT as user_type,
  created_at
FROM auth.users
WHERE id = 'dea8cb66-2bf6-46b1-b6d6-14dfba856545'
  AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.users.id 
       OR profiles.email = auth.users.email
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- KROK 3 (VOLITEĽNÉ): Oprava ID profilu
-- ============================================
-- Použite len ak KROK 1 ukázal "PROBLÉM - profil existuje s iným ID"
-- POZOR: Toto môže narušiť foreign key constraints v iných tabuľkách!
/*
-- Najprv zistite, aký profil existuje:
SELECT id, email, full_name FROM profiles WHERE email = 'gazi.andrej@gmail.com';

-- Potom aktualizujte ID (nahraďte OLD_PROFILE_ID skutočným ID existujúceho profilu):
-- UPDATE profiles SET id = 'dea8cb66-2bf6-46b1-b6d6-14dfba856545' WHERE id = 'OLD_PROFILE_ID';
-- 
-- POZOR: Pred aktualizáciou skontrolujte, či nie sú v iných tabuľkách (appointments, invoices, commissions)
-- referencie na staré ID. Ak áno, musíte ich najprv aktualizovať!
*/
