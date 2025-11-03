-- Add bank_account column to profiles table (if it doesn't exist)
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

