import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rmvflqzxxbzhilobyitw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZscXp4eGJ6aGlsb2J5aXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTU4MDEsImV4cCI6MjA2NDI5MTgwMX0.3WWno9IcYz_0o2QyhkzlYTRuyyggNBx86J0eCr5tlds';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

