-- Add password_hash column to profiles table (if it doesn't exist)
-- First ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add password_hash column if it doesn't exist
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

