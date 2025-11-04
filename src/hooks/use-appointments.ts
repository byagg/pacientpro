import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
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
      
      const data = await sql`
        SELECT 
          a.*,
          p.full_name as receiving_doctor_name
        FROM public.appointments a
        LEFT JOIN public.profiles p ON a.receiving_doctor_id = p.id
        WHERE a.angiologist_id = ${userId}
        ORDER BY a.appointment_date DESC
      `;

      return (data as Appointment[]) || [];
    },
    enabled: !!userId,
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AppointmentInsert) => {
      const [result] = await sql`
        INSERT INTO public.appointments (angiologist_id, patient_number, appointment_date, notes, status, receiving_doctor_id)
        VALUES (${data.angiologist_id}, ${data.patient_number}, ${data.appointment_date}, ${data.notes}, ${data.status || 'scheduled'}, ${data.receiving_doctor_id || null})
        RETURNING *
      `;

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
      await sql`
        DELETE FROM public.appointments
        WHERE id = ${appointmentId}
      `;

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
