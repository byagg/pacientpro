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
  break_start_time: string | null; // HH:MM:SS format (optional)
  break_end_time: string | null; // HH:MM:SS format (optional)
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
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_active?: boolean;
}

export interface OfficeHourUpdate {
  id: string;
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  break_start_time?: string | null;
  break_end_time?: string | null;
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
      const breakStartTime = data.break_start_time ? `${data.break_start_time}:00` : null;
      const breakEndTime = data.break_end_time ? `${data.break_end_time}:00` : null;
      
      // Use conditional SQL for nullable break times
      const [hour] = breakStartTime && breakEndTime
        ? await sql<OfficeHour[]>`
            INSERT INTO public.office_hours (
              receiving_doctor_id,
              day_of_week,
              start_time,
              end_time,
              slot_duration_minutes,
              break_start_time,
              break_end_time,
              is_active
            )
            VALUES (
              ${data.receiving_doctor_id},
              ${data.day_of_week},
              ${data.start_time}::time,
              ${data.end_time}::time,
              ${data.slot_duration_minutes ?? 30},
              ${breakStartTime}::time,
              ${breakEndTime}::time,
              ${data.is_active ?? true}
            )
            RETURNING *
          `
        : await sql<OfficeHour[]>`
            INSERT INTO public.office_hours (
              receiving_doctor_id,
              day_of_week,
              start_time,
              end_time,
              slot_duration_minutes,
              break_start_time,
              break_end_time,
              is_active
            )
            VALUES (
              ${data.receiving_doctor_id},
              ${data.day_of_week},
              ${data.start_time}::time,
              ${data.end_time}::time,
              ${data.slot_duration_minutes ?? 30},
              NULL,
              NULL,
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
      // Build dynamic UPDATE query based on provided fields
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }
      
      if (data.start_time !== undefined) {
        updates.push(`start_time = $${paramIndex}::time`);
        values.push(data.start_time);
        paramIndex++;
      }
      
      if (data.end_time !== undefined) {
        updates.push(`end_time = $${paramIndex}::time`);
        values.push(data.end_time);
        paramIndex++;
      }
      
      if (data.slot_duration_minutes !== undefined) {
        updates.push(`slot_duration_minutes = $${paramIndex}`);
        values.push(data.slot_duration_minutes);
        paramIndex++;
      }
      
      if (data.break_start_time !== undefined) {
        const breakStartTime = data.break_start_time ? `${data.break_start_time}:00` : null;
        updates.push(`break_start_time = $${paramIndex}::time`);
        values.push(breakStartTime);
        paramIndex++;
      }
      
      if (data.break_end_time !== undefined) {
        const breakEndTime = data.break_end_time ? `${data.break_end_time}:00` : null;
        updates.push(`break_end_time = $${paramIndex}::time`);
        values.push(breakEndTime);
        paramIndex++;
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = now()`);
      values.push(data.id);

      const query = `
        UPDATE public.office_hours
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await sql.unsafe(query, values);
      return result[0] as OfficeHour;
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

