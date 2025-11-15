import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  address: string | null;
  phone: string | null;
  bank_account: string | null;
  ambulance_code: string | null;
  invoice_name: string | null;
  invoice_address: string | null;
  invoice_ico: string | null;
  invoice_dic: string | null;
  signature_image: string | null; // base64 encoded image
  vat_payer_status: 'yes' | 'no' | 'not_applicable' | null;
  created_at: string;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
  bank_account?: string | null;
  signature_image?: string | null;
  invoice_name?: string | null;
  invoice_address?: string | null;
  invoice_ico?: string | null;
  invoice_dic?: string | null;
}

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, address, phone, bank_account, ambulance_code, invoice_name, invoice_address, invoice_ico, invoice_dic, signature_image, vat_payer_status, created_at')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully

        if (error) {
          console.error('Error fetching profile:', error);
          // If it's a 406 or PGRST116 error (no rows returned), return null instead of throwing
          if (error.code === 'PGRST116' || error.message?.includes('multiple (or no) rows returned')) {
            console.warn('Profile not found for user:', userId);
            return null;
          }
          throw error;
        }

        if (!data) {
          console.warn('Profile not found for user:', userId);
          return null;
        }
        return data as Profile;
      } catch (err: any) {
        console.error('Unexpected error in useProfile:', err);
        // If it's a 406 or PGRST116 error, return null instead of throwing
        if (err && typeof err === 'object' && (err.code === 'PGRST116' || err.message?.includes('multiple (or no) rows returned') || err.message?.includes('JSON object requested'))) {
          console.warn('Profile not found (handled gracefully):', userId);
          return null;
        }
        throw err;
      }
    },
    enabled: !!userId,
    retry: false, // Don't retry on 406 errors
    staleTime: 30000, // Cache for 30 seconds to reduce unnecessary requests
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid repeated 406 errors
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: false, // Don't refetch on reconnect to avoid repeated 406 errors
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: ProfileUpdate }) => {
      if (Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      console.log('Starting profile update:', { userId, updates });

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            invoice_name: updates.invoice_name || null,
            invoice_address: updates.invoice_address || null,
            bank_account: updates.bank_account || null,
            invoice_ico: updates.invoice_ico || null,
            invoice_dic: updates.invoice_dic || null,
            signature_image: updates.signature_image || null,
          })
          .eq('id', userId)
          .select()
          .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully
        
        console.log('Update result:', data);
        
        if (error) {
          console.error('Error updating profile:', error);
          // If it's a 406 or PGRST116 error, provide a more helpful message
          if (error.code === 'PGRST116' || error.message?.includes('multiple (or no) rows returned')) {
            throw new Error('Profil nebol nájdený alebo nemáte oprávnenie na úpravu. Skontrolujte, či profil existuje a či ste prihlásený správnym účtom.');
          }
          throw error;
        }
        
        if (!data) {
          throw new Error('Profil nebol nájdený. Skontrolujte, či profil existuje v databáze.');
        }
        
        console.log('Successfully updated profile:', data);
        
        return data as Profile;
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    },
    onSuccess: (profile: Profile) => {
      // Invalidate the specific profile query
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Profil aktualizovaný",
        description: "Údaje boli úspešne uložené",
      });
    },
    onError: (error: Error) => {
      console.error('Profile update error:', error);
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať profil",
      });
    },
  });
};

