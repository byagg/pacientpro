import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
        const { data, error } = await supabase
          .from('office_hours')
          .select('*')
          .eq('receiving_doctor_id', receivingDoctorId)
          .order('day_of_week')
          .order('start_time');

        if (error) {
          // If table doesn't exist, return empty array
          if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            console.warn('office_hours table does not exist yet. Please run the migration.');
            return [];
          }
          throw error;
        }

        return (data || []) as OfficeHour[];
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
      
      const { data: hour, error } = await supabase
        .from('office_hours')
        .insert({
          receiving_doctor_id: data.receiving_doctor_id,
          day_of_week: data.day_of_week,
          start_time: `${data.start_time}:00`,
          end_time: `${data.end_time}:00`,
          slot_duration_minutes: data.slot_duration_minutes ?? 30,
          break_start_time: breakStartTime,
          break_end_time: breakEndTime,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating office hour:', error);
        throw error;
      }

      return hour as OfficeHour;
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
      const updates: any = {};

      if (data.is_active !== undefined) {
        updates.is_active = data.is_active;
      }
      
      if (data.start_time !== undefined) {
        updates.start_time = `${data.start_time}:00`;
      }
      
      if (data.end_time !== undefined) {
        updates.end_time = `${data.end_time}:00`;
      }
      
      if (data.slot_duration_minutes !== undefined) {
        updates.slot_duration_minutes = data.slot_duration_minutes;
      }
      
      if (data.break_start_time !== undefined) {
        updates.break_start_time = data.break_start_time ? `${data.break_start_time}:00` : null;
      }
      
      if (data.break_end_time !== undefined) {
        updates.break_end_time = data.break_end_time ? `${data.break_end_time}:00` : null;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error('No fields to update');
      }

      updates.updated_at = new Date().toISOString();

      const { data: hour, error } = await supabase
        .from('office_hours')
        .update(updates)
        .eq('id', data.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating office hour:', error);
        throw error;
      }

      return hour as OfficeHour;
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
      const { error } = await supabase
        .from('office_hours')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting office hour:', error);
        throw error;
      }

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
