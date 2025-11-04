-- Add invoice data columns to profiles table
DO $$ 
BEGIN
    -- Add invoice_name
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'invoice_name'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN invoice_name TEXT;
    END IF;

    -- Add invoice_address
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'invoice_address'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN invoice_address TEXT;
    END IF;

    -- Add invoice_ico (IČO)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'invoice_ico'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN invoice_ico TEXT;
    END IF;

    -- Add invoice_dic (DIČ)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'invoice_dic'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN invoice_dic TEXT;
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
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create invoice_items table (to track which appointments are in which invoice)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(invoice_id, appointment_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_sending_doctor ON public.invoices(sending_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_receiving_doctor ON public.invoices(receiving_doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_appointment ON public.invoice_items(appointment_id);

