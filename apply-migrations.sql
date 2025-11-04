-- ANGIOPLUS Database Setup - Complete Migration Script
-- Run this script in Neon SQL Editor to set up your database

-- ============================================
-- Step 1: Create profiles table
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bank_account TEXT,
  password_hash TEXT,
  user_type TEXT CHECK (user_type IN ('sending', 'receiving')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add bank_account if table exists but column doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'bank_account'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN bank_account TEXT;
    END IF;
END $$;

-- Add password_hash if table exists but column doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- Add user_type if table exists but column doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'user_type'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN user_type TEXT CHECK (user_type IN ('sending', 'receiving'));
    END IF;
END $$;

-- Add ambulance_code if table exists but column doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'ambulance_code'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN ambulance_code TEXT;
    END IF;
END $$;

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
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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

-- ============================================
-- Step 4: Add receiving doctor features to appointments
-- ============================================
DO $$ 
BEGIN
    -- Add receiving_doctor_id to link appointment to receiving doctor
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'receiving_doctor_id'
    ) THEN
        ALTER TABLE public.appointments
        ADD COLUMN receiving_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add examined_at timestamp when patient was examined
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'examined_at'
    ) THEN
        ALTER TABLE public.appointments
        ADD COLUMN examined_at TIMESTAMPTZ;
    END IF;

    -- Add examined_by to track which doctor examined the patient
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'examined_by'
    ) THEN
        ALTER TABLE public.appointments
        ADD COLUMN examined_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- Step 5: Create office_hours table for receiving doctors
-- ============================================
CREATE TABLE IF NOT EXISTS public.office_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30, -- Duration of one appointment slot
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(receiving_doctor_id, day_of_week, start_time)
);

-- ============================================
-- Step 6: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_angiologist ON public.appointments(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_angiologist ON public.commissions(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_office_hours_receiving_doctor ON public.office_hours(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_receiving_doctor ON public.appointments(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_examined_by ON public.appointments(examined_by);

-- ============================================
-- Step 7: Add invoice features
-- ============================================
-- Add invoice data columns to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invoice_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN invoice_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invoice_address'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN invoice_address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invoice_ico'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN invoice_ico TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'invoice_dic'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN invoice_dic TEXT;
    END IF;
END $$;

-- Create invoices table
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

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(invoice_id, appointment_id)
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_sending_doctor ON public.invoices(sending_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_receiving_doctor ON public.invoices(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_appointment ON public.invoice_items(appointment_id);

-- ============================================
-- Verification queries (optional - to check if everything worked)
-- ============================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'appointments', 'commissions', 'invoices')
-- ORDER BY table_name, ordinal_position;

