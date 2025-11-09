-- ============================================
-- Pridanie RLS policies pre DEV MODE
-- Umožní operácie s DEV UUID bez autentifikácie
-- ============================================

-- ============================================
-- PROFILES TABLE - DEV MODE polícia
-- ============================================

-- Drop existujúce policy a vytvoriť novú s DEV výnimkou
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

-- Pridať INSERT policy pre DEV (ak niekto potrebuje vytvárať dáta z DEV MODE)
DROP POLICY IF EXISTS "DEV MODE can insert profiles" ON public.profiles;

CREATE POLICY "DEV MODE can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

-- ============================================
-- APPOINTMENTS TABLE - DEV MODE polícia
-- ============================================

DROP POLICY IF EXISTS "Angiologists can view their own appointments" ON public.appointments;

CREATE POLICY "Angiologists can view their own appointments"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() = angiologist_id 
    OR auth.uid() = receiving_doctor_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Angiologists can create appointments" ON public.appointments;

CREATE POLICY "Angiologists can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    auth.uid() = angiologist_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Angiologists can update their own appointments" ON public.appointments;

CREATE POLICY "Angiologists can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (
    auth.uid() = angiologist_id 
    OR auth.uid() = receiving_doctor_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Angiologists can delete appointments" ON public.appointments;

CREATE POLICY "Angiologists can delete appointments"
  ON public.appointments FOR DELETE
  USING (
    auth.uid() = angiologist_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

-- ============================================
-- OFFICE_HOURS TABLE - DEV MODE polícia
-- ============================================

DROP POLICY IF EXISTS "Receiving doctors can manage their office hours" ON public.office_hours;

CREATE POLICY "Receiving doctors can manage their office hours"
  ON public.office_hours
  FOR ALL
  USING (
    auth.uid() = receiving_doctor_id
    OR receiving_doctor_id = '00000000-0000-0000-0000-000000000002'
  );

-- ============================================
-- INVOICES TABLE - DEV MODE polícia
-- ============================================

DROP POLICY IF EXISTS "Users can view invoices" ON public.invoices;

CREATE POLICY "Users can view invoices"
  ON public.invoices FOR SELECT
  USING (
    auth.uid() = sending_doctor_id 
    OR auth.uid() = receiving_doctor_id
    OR sending_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;

CREATE POLICY "Users can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (
    auth.uid() = receiving_doctor_id
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Users can update their invoices" ON public.invoices;

CREATE POLICY "Users can update their invoices"
  ON public.invoices FOR UPDATE
  USING (
    auth.uid() = sending_doctor_id 
    OR auth.uid() = receiving_doctor_id
    OR sending_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Users can delete invoices" ON public.invoices;

CREATE POLICY "Users can delete invoices"
  ON public.invoices FOR DELETE
  USING (
    auth.uid() = receiving_doctor_id
    OR receiving_doctor_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

-- ============================================
-- INVOICE_ITEMS TABLE - DEV MODE polícia
-- ============================================

DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;

CREATE POLICY "Users can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (true); -- Invoice items sú viditeľné pre všetkých (cez JOIN s invoices)

DROP POLICY IF EXISTS "Users can create invoice items" ON public.invoice_items;

CREATE POLICY "Users can create invoice items"
  ON public.invoice_items FOR INSERT
  WITH CHECK (true); -- Povoliť INSERT pre všetkých (RLS je na invoices úrovni)

DROP POLICY IF EXISTS "Users can delete invoice items" ON public.invoice_items;

CREATE POLICY "Users can delete invoice items"
  ON public.invoice_items FOR DELETE
  USING (true); -- Povoliť DELETE pre všetkých (RLS je na invoices úrovni)

-- ============================================
-- COMMISSIONS TABLE - DEV MODE polícia
-- ============================================

DROP POLICY IF EXISTS "Users can view commissions" ON public.commissions;

CREATE POLICY "Users can view commissions"
  ON public.commissions FOR SELECT
  USING (
    auth.uid() = angiologist_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Users can create commissions" ON public.commissions;

CREATE POLICY "Users can create commissions"
  ON public.commissions FOR INSERT
  WITH CHECK (
    auth.uid() = angiologist_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

DROP POLICY IF EXISTS "Users can delete commissions" ON public.commissions;

CREATE POLICY "Users can delete commissions"
  ON public.commissions FOR DELETE
  USING (
    auth.uid() = angiologist_id
    OR angiologist_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  );

-- ============================================
-- Overenie policies
-- ============================================

-- Zobraz všetky policies pre profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'appointments', 'office_hours', 'invoices', 'commissions')
ORDER BY tablename, policyname;

-- ============================================
-- INFO: Čo tento script robí
-- ============================================
-- 1. Upraví existujúce RLS policies aby akceptovali DEV UUID
-- 2. Pridá výnimky pre obe DEV ID (odosielajúci aj prijímajúci)
-- 3. Umožní všetky operácie (SELECT, INSERT, UPDATE) pre DEV účty
-- 4. Normálne používateľské účty fungujú ako predtým (cez auth.uid())
-- ============================================

