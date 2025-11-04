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

// Mark appointment as examined (for sending doctor)
export const useMarkAppointmentExamined = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      examinedAt,
      examinedBy,
    }: {
      appointmentId: string;
      examinedAt: string; // ISO timestamp
      examinedBy: string;
    }) => {
      // Update appointment
      const [appointment] = await sql<Appointment[]>`
        UPDATE public.appointments
        SET 
          examined_at = ${examinedAt}::timestamptz,
          examined_by = ${examinedBy},
          status = 'completed'
        WHERE id = ${appointmentId}
        RETURNING *
      `;

      // Create commission if it doesn't exist
      const existingCommissions = await sql`
        SELECT id FROM public.commissions
        WHERE appointment_id = ${appointmentId}
      `;

      if (existingCommissions.length === 0) {
        await sql`
          INSERT INTO public.commissions (angiologist_id, appointment_id, amount, status)
          VALUES (${appointment.angiologist_id}, ${appointmentId}, 50.00, 'pending')
        `;
      }

      return appointment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", data.angiologist_id] });
      queryClient.invalidateQueries({ queryKey: ["commissions", data.angiologist_id] });
      toast({
        title: "Pacient označený ako vyšetrený",
        description: "Čas vyšetrenia bol uložený a manipulačný poplatok bol vytvorený.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa označiť pacienta ako vyšetreného.",
      });
    },
  });
};
