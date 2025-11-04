import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";

export interface OfficeHour {
  id: string;
  receiving_doctor_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfficeHourInsert {
  receiving_doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes?: number;
  is_active?: boolean;
}

export interface OfficeHourUpdate {
  id: string;
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  is_active?: boolean;
}

// Fetch office hours for a receiving doctor
export const useOfficeHours = (receivingDoctorId: string) => {
  return useQuery({
    queryKey: ["office-hours", receivingDoctorId],
    queryFn: async () => {
      try {
        const hours = await sql<OfficeHour[]>`
          SELECT * FROM public.office_hours
          WHERE receiving_doctor_id = ${receivingDoctorId}
          ORDER BY day_of_week, start_time
        `;
        return hours;
      } catch (error: any) {
        // If table doesn't exist, return empty array
        if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
          console.warn('office_hours table does not exist yet. Please run the migration.');
          return [];
        }
        throw error;
      }
    },
    enabled: !!receivingDoctorId,
    retry: false, // Don't retry if table doesn't exist
  });
};

// Create office hour
export const useCreateOfficeHour = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OfficeHourInsert) => {
      const [hour] = await sql<OfficeHour[]>`
        INSERT INTO public.office_hours (
          receiving_doctor_id,
          day_of_week,
          start_time,
          end_time,
          slot_duration_minutes,
          is_active
        )
        VALUES (
          ${data.receiving_doctor_id},
          ${data.day_of_week},
          ${data.start_time}::time,
          ${data.end_time}::time,
          ${data.slot_duration_minutes ?? 30},
          ${data.is_active ?? true}
        )
        RETURNING *
      `;
      return hour;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["office-hours", variables.receiving_doctor_id] });
      toast({
        title: "Ordinančné hodiny pridané",
        description: "Nový slot bol úspešne pridaný.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa pridať ordinančné hodiny.",
      });
    },
  });
};

// Update office hour
export const useUpdateOfficeHour = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OfficeHourUpdate) => {
      // For now, we only use this for toggling is_active
      // Other updates can be added later if needed
      if (data.is_active !== undefined) {
        const [hour] = await sql<OfficeHour[]>`
          UPDATE public.office_hours
          SET 
            is_active = ${data.is_active},
            updated_at = now()
          WHERE id = ${data.id}
          RETURNING *
        `;
        return hour;
      }
      
      // If other fields need to be updated, handle them separately
      throw new Error('Only is_active can be updated via this hook');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["office-hours", data.receiving_doctor_id] });
      toast({
        title: "Ordinančné hodiny aktualizované",
        description: "Zmeny boli uložené.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať ordinančné hodiny.",
      });
    },
  });
};

// Delete office hour
export const useDeleteOfficeHour = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, receivingDoctorId }: { id: string; receivingDoctorId: string }) => {
      await sql`
        DELETE FROM public.office_hours
        WHERE id = ${id}
      `;
      return { id, receivingDoctorId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["office-hours", variables.receivingDoctorId] });
      toast({
        title: "Ordinančné hodiny odstránené",
        description: "Slot bol úspešne odstránený.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa odstrániť ordinančné hodiny.",
      });
    },
  });
};

