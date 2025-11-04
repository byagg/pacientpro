import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "./use-appointments";

// Extended appointment with sending doctor info
export interface ReceivedAppointment extends Appointment {
  sending_doctor_name: string;
  sending_doctor_email: string;
}

// Fetch received patients (all scheduled appointments that can be examined)
export const useReceivedPatients = (receivingDoctorId: string) => {
  return useQuery({
    queryKey: ["received-patients", receivingDoctorId],
    queryFn: async () => {
      try {
      // Get all scheduled appointments (not yet examined)
      // These are all patients sent by sending doctors that haven't been examined yet
      const appointments = await sql<ReceivedAppointment[]>`
        SELECT 
          a.*,
          p.full_name as sending_doctor_name,
          p.email as sending_doctor_email
        FROM public.appointments a
        JOIN public.profiles p ON a.angiologist_id = p.id
        WHERE a.status = 'scheduled'
          AND a.examined_at IS NULL
        ORDER BY a.appointment_date ASC
      `;
        return appointments;
      } catch (error: any) {
        // If columns don't exist yet, return empty array
        if (error?.message?.includes('does not exist') || error?.message?.includes('column')) {
          console.warn('Appointments table columns do not exist yet. Please run the migration.');
          return [];
        }
        throw error;
      }
    },
    enabled: !!receivingDoctorId,
    retry: false,
  });
};

// Mark patient as examined
export const useMarkPatientExamined = () => {
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
      const [appointment] = await sql<Appointment[]>`
        UPDATE public.appointments
        SET 
          examined_at = ${examinedAt}::timestamptz,
          examined_by = ${examinedBy},
          receiving_doctor_id = ${examinedBy},
          status = 'completed'
        WHERE id = ${appointmentId}
        RETURNING *
      `;
      return appointment;
    },
    onSuccess: (data) => {
      // Invalidate both received patients and sending doctor's appointments
      queryClient.invalidateQueries({ queryKey: ["received-patients"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", data.angiologist_id] });
      toast({
        title: "Pacient označený ako vyšetrený",
        description: "Čas vyšetrenia bol uložený.",
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

