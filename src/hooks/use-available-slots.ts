import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDoctorName } from "@/lib/utils-doctors";

export interface AvailableSlot {
  receiving_doctor_id: string;
  receiving_doctor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  break_start_time: string | null;
  break_end_time: string | null;
  is_active: boolean;
}

// Fetch all available slots from all receiving doctors
export const useAvailableSlots = () => {
  return useQuery({
    queryKey: ["available-slots"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('office_hours')
          .select(`
            receiving_doctor_id,
            day_of_week,
            start_time,
            end_time,
            slot_duration_minutes,
            break_start_time,
            break_end_time,
            is_active,
            profiles!office_hours_receiving_doctor_id_fkey(
              id,
              full_name,
              updated_at
            )
          `)
          .eq('is_active', true)
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

        return (data || []).map(slot => ({
          ...slot,
          receiving_doctor_name: slot.profiles?.full_name || '',
        })) as AvailableSlot[];
      } catch (error: any) {
        // If table doesn't exist, return empty array
        if (error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
          console.warn('office_hours table does not exist yet. Please run the migration.');
          return [];
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0, // Data is never stale - always refetch to get latest doctor names
    refetchInterval: 30000, // Refetch every 30 seconds to get updated doctor names
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Helper function to generate time slots for a given date based on office hours
export const generateTimeSlotsForDate = (
  date: Date,
  officeHours: AvailableSlot[]
): Array<{ time: string; label: string; receivingDoctorId: string; receivingDoctorName: string }> => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const slots: Array<{ time: string; label: string; receivingDoctorId: string; receivingDoctorName: string }> = [];

  // Filter office hours for this day
  const todayHours = officeHours.filter((oh) => oh.day_of_week === dayOfWeek);

  todayHours.forEach((oh) => {
    const [startHour, startMinute] = oh.start_time.split(':').map(Number);
    const [endHour, endMinute] = oh.end_time.split(':').map(Number);

    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    // Calculate break time in minutes if break exists
    let breakStartMinutes = null;
    let breakEndMinutes = null;
    if (oh.break_start_time && oh.break_end_time) {
      const [breakStartHour, breakStartMin] = oh.break_start_time.split(':').map(Number);
      const [breakEndHour, breakEndMin] = oh.break_end_time.split(':').map(Number);
      breakStartMinutes = breakStartHour * 60 + breakStartMin;
      breakEndMinutes = breakEndHour * 60 + breakEndMin;
    }

    // Generate slots based on slot_duration_minutes
    for (let currentMinutes = startTimeMinutes; currentMinutes < endTimeMinutes; currentMinutes += oh.slot_duration_minutes) {
      // Skip slots that overlap with break time
      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        const slotEndMinutes = currentMinutes + oh.slot_duration_minutes;
        // Skip if slot overlaps with break (slot starts before break ends and ends after break starts)
        if (currentMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
          continue;
        }
      }

      const slotHour = Math.floor(currentMinutes / 60);
      const slotMinute = currentMinutes % 60;

      const slotTime = new Date(date);
      slotTime.setHours(slotHour, slotMinute, 0, 0);

      // Only include future slots
      if (slotTime > new Date()) {
        const timeString = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
        slots.push({
          time: slotTime.toISOString(),
          label: `${timeString} - ${formatDoctorName(oh.receiving_doctor_name)}`,
          receivingDoctorId: oh.receiving_doctor_id,
          receivingDoctorName: oh.receiving_doctor_name,
        });
      }
    }
  });

  return slots;
};
