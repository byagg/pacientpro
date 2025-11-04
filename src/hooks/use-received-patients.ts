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
            AND (a.examined_at IS NULL OR a.examined_at = '')
          ORDER BY a.appointment_date ASC
        `;
        
        console.log('Received patients query result:', appointments.length, 'patients');
        return appointments;
      } catch (error: any) {
        console.error('Error fetching received patients:', error);
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
      // Update appointment - mark as examined
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
      // Invalidate ALL related queries to ensure synchronization
      queryClient.invalidateQueries({ queryKey: ["received-patients"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
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

