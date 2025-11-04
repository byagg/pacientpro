-- ANGIOPLUS Database Setup Script
-- Run this script in your Neon database to set up all tables and columns

-- Create profiles table for angiologists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bank_account TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create appointments table (GDPR compliant - only patient number, no name)
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

-- Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  angiologist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  paid_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_angiologist ON public.appointments(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_commissions_angiologist ON public.commissions(angiologist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

