-- Migration: Add receiving doctor features
-- This migration adds support for receiving doctors to set office hours and examine patients

-- Add columns to appointments table for receiving doctor features
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

-- Create office_hours table for receiving doctors to set available slots
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_office_hours_receiving_doctor ON public.office_hours(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_receiving_doctor ON public.appointments(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_examined_by ON public.appointments(examined_by);

