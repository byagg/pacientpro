import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
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
      
      const data = await sql`
        SELECT * FROM public.commissions
        WHERE angiologist_id = ${userId}
        ORDER BY created_at DESC
      `;

      return (data as Commission[]) || [];
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
      const [commission] = await sql<Commission[]>`
        UPDATE public.commissions
        SET 
          status = 'paid',
          paid_at = ${paidAt}::timestamptz
        WHERE id = ${commissionId}
        RETURNING *
      `;
      return commission;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commissions", data.angiologist_id] });
      queryClient.invalidateQueries({ queryKey: ["appointments", data.angiologist_id] });
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
