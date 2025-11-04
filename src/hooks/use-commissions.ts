import { useQuery } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";

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
        SELECT * FROM commissions
        WHERE angiologist_id = ${userId}
        ORDER BY created_at DESC
      `;

      return (data as Commission[]) || [];
    },
    enabled: !!userId,
  });
};

