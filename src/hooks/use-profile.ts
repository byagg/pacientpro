import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  bank_account: string | null;
  invoice_name: string | null;
  invoice_address: string | null;
  invoice_ico: string | null;
  invoice_dic: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
  bank_account?: string | null;
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
          SELECT id, email, full_name, bank_account, 
                 invoice_name, invoice_address, invoice_ico, invoice_dic, created_at
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

      // Build dynamic update query
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        setClauses.push(`${key} = $${values.length + 1}`);
        values.push(value);
      });

      const query = `
        UPDATE profiles
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length + 1}
        RETURNING id, email, full_name, bank_account, 
                  invoice_name, invoice_address, invoice_ico, invoice_dic, created_at
      `;

      try {
        console.log('Executing update query:', query, 'with values:', [...values, userId]);
        
        // Execute the query - sql.unsafe returns a promise that resolves to an array
        const rows = await sql.unsafe(query, [...values, userId]);
        console.log('Raw SQL result:', rows);
        console.log('Is array:', Array.isArray(rows));
        console.log('Length:', rows?.length);
        
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          throw new Error('Failed to update profile - no rows returned');
        }
        
        const profile = rows[0] as Profile;
        console.log('Returning profile:', profile);
        
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

