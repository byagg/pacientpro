import { useQuery } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { formatDoctorName } from "@/lib/utils-doctors";

export interface AvailableSlot {
  receiving_doctor_id: string;
  receiving_doctor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

// Fetch all available slots from all receiving doctors
export const useAvailableSlots = () => {
  return useQuery({
    queryKey: ["available-slots"],
    queryFn: async () => {
      try {
        const slots = await sql<AvailableSlot[]>`
          SELECT 
            oh.receiving_doctor_id,
            p.full_name as receiving_doctor_name,
            oh.day_of_week,
            oh.start_time,
            oh.end_time,
            oh.slot_duration_minutes,
            oh.is_active
          FROM public.office_hours oh
          JOIN public.profiles p ON oh.receiving_doctor_id = p.id
          WHERE oh.is_active = true
          ORDER BY oh.day_of_week, oh.start_time
        `;
        return slots;
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

    // Generate slots based on slot_duration_minutes
    for (let currentMinutes = startTimeMinutes; currentMinutes < endTimeMinutes; currentMinutes += oh.slot_duration_minutes) {
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

