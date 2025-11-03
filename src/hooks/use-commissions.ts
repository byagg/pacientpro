import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Commission = Tables<"commissions">;

export const useCommissions = (userId: string) => {
  return useQuery({
    queryKey: ["commissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("angiologist_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as Commission[]) || [];
    },
    enabled: !!userId,
  });
};

