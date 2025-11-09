-- ============================================
-- Pridanie adresa a telefón do profiles
-- ============================================

-- Pridaj stĺpce ak neexistujú
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Poznámka: RLS policies už existujú a fungujú pre tieto stĺpce

