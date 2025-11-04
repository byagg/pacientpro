import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  bank_account: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string;
  bank_account?: string | null;
}

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const data = await sql`
          SELECT id, email, full_name, bank_account, created_at
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
      // Build update query - only bank_account is used in this app
      if (updates.bank_account !== undefined) {
        const [result] = await sql`
          UPDATE profiles
          SET bank_account = ${updates.bank_account}
          WHERE id = ${userId}
          RETURNING id, email, full_name, bank_account, created_at
        `;
        return result as Profile;
      }
      
      // For other fields, build queries separately
      if (updates.email !== undefined && updates.full_name !== undefined) {
        const [result] = await sql`
          UPDATE profiles
          SET email = ${updates.email}, full_name = ${updates.full_name}
          WHERE id = ${userId}
          RETURNING id, email, full_name, bank_account, created_at
        `;
        return result as Profile;
      }
      
      if (updates.email !== undefined) {
        const [result] = await sql`
          UPDATE profiles
          SET email = ${updates.email}
          WHERE id = ${userId}
          RETURNING id, email, full_name, bank_account, created_at
        `;
        return result as Profile;
      }
      
      if (updates.full_name !== undefined) {
        const [result] = await sql`
          UPDATE profiles
          SET full_name = ${updates.full_name}
          WHERE id = ${userId}
          RETURNING id, email, full_name, bank_account, created_at
        `;
        return result as Profile;
      }

      throw new Error('No updates provided');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", data.id] });
      toast({
        title: "Profil aktualizovaný",
        description: "Bankový účet bol úspešne uložený",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message,
      });
    },
  });
};

