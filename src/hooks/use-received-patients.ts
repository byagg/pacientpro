import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Appointment } from "./use-appointments";

// Extended appointment with sending doctor info
export interface ReceivedAppointment extends Appointment {
  sending_doctor_name: string;
  sending_doctor_email: string;
}

// Fetch received patients (all appointments - both waiting and examined)
export const useReceivedPatients = (receivingDoctorId: string) => {
  return useQuery({
    queryKey: ["received-patients", receivingDoctorId],
    queryFn: async () => {
      try {
        // Get all appointments (waiting and examined)
        // These are all patients sent by sending doctors
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            profiles!appointments_angiologist_id_fkey(full_name, email)
          `)
          .in('status', ['scheduled', 'completed'])
          .order('examined_at', { ascending: true, nullsFirst: true })
          .order('appointment_date', { ascending: true });

        if (error) {
          console.error('Error fetching received patients:', error);
          throw error;
        }
        
        const appointments = (data || []).map(appointment => ({
          ...appointment,
          sending_doctor_name: appointment.profiles?.full_name || '',
          sending_doctor_email: appointment.profiles?.email || '',
        })) as ReceivedAppointment[];
        
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
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .update({
          examined_at: examinedAt,
          examined_by: examinedBy,
          receiving_doctor_id: examinedBy,
          status: 'completed',
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (appointmentError) {
        console.error('Error marking patient as examined:', appointmentError);
        throw appointmentError;
      }

      // Create commission if it doesn't exist
      const { data: existingCommissions } = await supabase
        .from('commissions')
        .select('id')
        .eq('appointment_id', appointmentId);

      if (!existingCommissions || existingCommissions.length === 0) {
        const { error: commissionError } = await supabase
          .from('commissions')
          .insert({
            angiologist_id: appointment.angiologist_id,
            appointment_id: appointmentId,
            amount: 14.00,
            status: 'pending',
          });

        if (commissionError) {
          console.error('Error creating commission:', commissionError);
          // Don't throw, just log - commission creation is not critical
        }
      }

      return appointment as Appointment;
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
