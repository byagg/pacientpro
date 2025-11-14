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
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }

        if (!data) {
          console.warn('Profile not found for user:', userId);
          return null;
        }
        return data as Profile;
      } catch (err) {
        console.error('Unexpected error in useProfile:', err);
        throw err;
      }
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 0, // Data is never stale - always refetch to get latest data
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
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
          .single();
        
        console.log('Update result:', data);
        
        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
        
        if (!data) {
          throw new Error('Failed to update profile - no data returned');
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

