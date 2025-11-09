-- ============================================
-- Pridanie pola platca DPH do profiles tabuľky
-- ============================================

-- Pridanie stĺpca vat_payer_status do profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS vat_payer_status TEXT CHECK (vat_payer_status IN ('yes', 'no', 'not_applicable'));

-- Nastavenie defaultnej hodnoty na 'not_applicable' pre existujúce záznamy
UPDATE public.profiles 
SET vat_payer_status = 'not_applicable' 
WHERE vat_payer_status IS NULL;

COMMENT ON COLUMN public.profiles.vat_payer_status IS 'Status platcu DPH: yes = Platca DPH, no = Nie platca DPH, not_applicable = Neaplikovateľné';

