import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Appointment {
  id: string;
  angiologist_id: string;
  patient_number: string;
  appointment_date: string;
  google_calendar_event_id: string | null;
  status: string | null;
  notes: string | null;
  receiving_doctor_id: string | null;
  receiving_doctor_name: string | null;
  examined_at: string | null;
  examined_by: string | null;
  created_at: string;
}

export interface AppointmentInsert {
  angiologist_id: string;
  patient_number: string;
  appointment_date: string;
  notes: string | null;
  status?: string | null;
  receiving_doctor_id?: string | null;
}

export const useAppointments = (userId: string) => {
  return useQuery({
    queryKey: ["appointments", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!appointments_receiving_doctor_id_fkey(full_name)
        `)
        .eq('angiologist_id', userId)
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      return (data || []).map(appointment => ({
        ...appointment,
        receiving_doctor_name: appointment.profiles?.full_name || null,
      })) as Appointment[];
    },
    enabled: !!userId,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AppointmentInsert) => {
      const { data: result, error } = await supabase
        .from('appointments')
        .insert({
          angiologist_id: data.angiologist_id,
          patient_number: data.patient_number,
          appointment_date: data.appointment_date,
          notes: data.notes,
          status: data.status || 'scheduled',
          receiving_doctor_id: data.receiving_doctor_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      return result as Appointment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", data.angiologist_id] });
      toast({
        title: "Rezervácia vytvorená",
        description: `Rezervácia s číslom ${data.patient_number} bola úspešne pridaná`,
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

// Delete appointment
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ appointmentId, userId }: { appointmentId: string; userId: string }) => {
      // Delete appointment (will cascade delete commissions)
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }

      return { appointmentId, userId };
    },
    onSuccess: (data) => {
      // Invalidate ALL related queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["received-patients"] });
      toast({
        title: "Pacient vymazaný",
        description: "Pacient bol úspešne odstránený zo zoznamu",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa vymazať pacienta",
      });
    },
  });
};
