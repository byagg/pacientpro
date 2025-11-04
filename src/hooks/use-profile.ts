import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  bank_account: string | null;
  ambulance_code: string | null;
  invoice_name: string | null;
  invoice_address: string | null;
  invoice_ico: string | null;
  invoice_dic: string | null;
  signature_image: string | null; // base64 encoded image
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
        const data = await sql`
        SELECT id, email, full_name, bank_account, ambulance_code,
               invoice_name, invoice_address, invoice_ico, invoice_dic, signature_image, created_at
        FROM profiles
        WHERE id = ${userId}
        `;

        if (data.length === 0) {
          console.warn('Profile not found for user:', userId);
          return null;
        }
        return data[0] as Profile;
      } catch (err) {
        console.error('Unexpected error in useProfile:', err);
        throw err;
      }
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
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
        // Use template literal syntax - much simpler and works correctly with Neon
        const result = await sql`
          UPDATE public.profiles
          SET 
            invoice_name = ${updates.invoice_name || null},
            invoice_address = ${updates.invoice_address || null},
            bank_account = ${updates.bank_account || null},
            invoice_ico = ${updates.invoice_ico || null},
            invoice_dic = ${updates.invoice_dic || null},
            signature_image = ${updates.signature_image || null}
          WHERE id = ${userId}
          RETURNING id, email, full_name, bank_account, ambulance_code,
                    invoice_name, invoice_address, invoice_ico, invoice_dic, signature_image, created_at
        `;
        
        console.log('Update result:', result);
        
        if (!result || result.length === 0) {
          throw new Error('Failed to update profile - no rows returned');
        }
        
        const profile = result[0] as Profile;
        console.log('Successfully updated profile:', profile);
        
        return profile;
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

