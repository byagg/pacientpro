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
}

export const useAppointments = (userId: string) => {
  return useQuery({
    queryKey: ["appointments", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const data = await sql`
        SELECT * FROM public.appointments
        WHERE angiologist_id = ${userId}
        ORDER BY appointment_date DESC
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
        INSERT INTO public.appointments (angiologist_id, patient_number, appointment_date, notes, status)
        VALUES (${data.angiologist_id}, ${data.patient_number}, ${data.appointment_date}, ${data.notes}, ${data.status || 'scheduled'})
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
