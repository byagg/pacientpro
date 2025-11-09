-- ============================================
-- ANGIOPLUS - Complete Supabase Migration
-- This script sets up the complete database for Supabase Auth
-- ============================================

-- Step 1: Create profiles table (linked to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  bank_account TEXT,
  user_type TEXT CHECK (user_type IN ('sending', 'receiving')),
  ambulance_code TEXT,
  signature_image TEXT,
  invoice_name TEXT,
  invoice_address TEXT,
  invoice_ico TEXT,
  invoice_dic TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to view other profiles (needed for appointments with receiving doctors)
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- ============================================
-- Step 2: Create appointments table
-- ============================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  angiologist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_number TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  google_calendar_event_id TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  receiving_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  examined_at TIMESTAMPTZ,
  examined_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Angiologists can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Angiologists can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Angiologists can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Receiving doctors can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Receiving doctors can update appointments" ON public.appointments;

-- Appointments policies
CREATE POLICY "Angiologists can view their own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = angiologist_id OR auth.uid() = receiving_doctor_id);

CREATE POLICY "Angiologists can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = angiologist_id);

CREATE POLICY "Angiologists can update their own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = angiologist_id OR auth.uid() = receiving_doctor_id);

-- ============================================
-- Step 3: Create commissions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  angiologist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  paid_at TIMESTAMPTZ
);

-- Enable RLS on commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Angiologists can view their own commissions" ON public.commissions;

-- Commissions policies
CREATE POLICY "Angiologists can view their own commissions"
  ON public.commissions FOR SELECT
  USING (auth.uid() = angiologist_id);

-- ============================================
-- Step 4: Create office_hours table
-- ============================================
CREATE TABLE IF NOT EXISTS public.office_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  break_start_time TIME,
  break_end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(receiving_doctor_id, day_of_week, start_time)
);

-- Enable RLS on office_hours
ALTER TABLE public.office_hours ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Receiving doctors can manage their office hours" ON public.office_hours;
DROP POLICY IF EXISTS "Everyone can view office hours" ON public.office_hours;

-- Office hours policies
CREATE POLICY "Receiving doctors can manage their office hours"
  ON public.office_hours
  FOR ALL
  USING (auth.uid() = receiving_doctor_id);

CREATE POLICY "Everyone can view office hours"
  ON public.office_hours
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- Step 5: Create invoices tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  sending_doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiving_doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  patient_count INTEGER NOT NULL,
  issue_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(invoice_id, appointment_id)
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;

-- Invoice policies
CREATE POLICY "Users can view their invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = sending_doctor_id OR auth.uid() = receiving_doctor_id);

CREATE POLICY "Users can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = receiving_doctor_id);

CREATE POLICY "Users can update their invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = sending_doctor_id OR auth.uid() = receiving_doctor_id);

-- Invoice items policies
CREATE POLICY "Users can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.sending_doctor_id = auth.uid() OR invoices.receiving_doctor_id = auth.uid())
    )
  );

-- ============================================
-- Step 6: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_angiologist ON public.appointments(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_receiving_doctor ON public.appointments(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_examined_by ON public.appointments(examined_by);
CREATE INDEX IF NOT EXISTS idx_commissions_angiologist ON public.commissions(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_office_hours_receiving_doctor ON public.office_hours(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sending_doctor ON public.invoices(sending_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_receiving_doctor ON public.invoices(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_appointment ON public.invoice_items(appointment_id);

-- ============================================
-- Step 7: Create trigger for new user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_type, ambulance_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'sending'),
    COALESCE(NEW.raw_user_meta_data->>'ambulance_code', '')
  );
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Verification Query (commented out - uncomment to run)
-- ============================================
-- SELECT 
--   table_name, 
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
-- FROM information_schema.tables t
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

