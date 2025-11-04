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
-- Step 4: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_angiologist ON public.appointments(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_angiologist ON public.commissions(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- Verification queries (optional - to check if everything worked)
-- ============================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'appointments', 'commissions')
-- ORDER BY table_name, ordinal_position;

