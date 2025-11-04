-- Add user_type column to profiles table (if it doesn't exist)
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

