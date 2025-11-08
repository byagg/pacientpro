import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Commission {
  id: string;
  angiologist_id: string;
  appointment_id: string;
  amount: number;
  status: string | null;
  created_at: string;
  paid_at: string | null;
}

export const useCommissions = (userId: string) => {
  return useQuery({
    queryKey: ["commissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('angiologist_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching commissions:', error);
        throw error;
      }

      return (data || []) as Commission[];
    },
    enabled: !!userId,
  });
};

// Mark commission as paid
export const useMarkCommissionPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ commissionId, paidAt }: { commissionId: string; paidAt: string }) => {
      const { data, error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: paidAt,
        })
        .eq('id', commissionId)
        .select()
        .single();

      if (error) {
        console.error('Error marking commission as paid:', error);
        throw error;
      }

      return data as Commission;
    },
    onSuccess: (data) => {
      // Invalidate ALL related queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["received-patients"] });
      toast({
        title: "Poplatok označený ako vyplatený",
        description: "Manipulačný poplatok bol úspešne označený.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa označiť poplatok ako vyplatený.",
      });
    },
  });
};
