import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Loader2, Clock } from "lucide-react";
import { z } from "zod";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useAvailableSlots, generateTimeSlotsForDate } from "@/hooks/use-available-slots";
import { useProfile } from "@/hooks/use-profile";
const appointmentSchema = z.object({
  ambulanceCode: z.string().min(1, "Kód ambulancie je povinný"),
  appointmentDate: z.string().min(1, "Dátum rezervácie je povinný").refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && parsed > new Date();
    },
    {
      message: "Dátum musí byť platný a v budúcnosti",
    }
  ),
  procedureType: z.string().min(1, "Typ procedúry je povinný"),
});

interface AppointmentFormProps {
  userId: string;
  userType?: 'sending' | 'receiving';
}

const AppointmentForm = ({ userId, userType }: AppointmentFormProps) => {
  const { data: profile } = useProfile(userId);
  const [selectedDate, setSelectedDate] = useState(""); // For sending doctor - date only
  const [selectedSlot, setSelectedSlot] = useState(""); // For sending doctor - time slot
  const [appointmentDate, setAppointmentDate] = useState(""); // For receiving doctor - datetime-local
  const [procedureType, setProcedureType] = useState("");
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();
  const { data: availableSlots = [] } = useAvailableSlots();

  // Get ambulance code from user profile
  const ambulanceCode = profile?.ambulance_code || "XX";

  // Generate time slots for selected date (for sending doctor)
  const timeSlots = useMemo(() => {
    if (!selectedDate || userType === 'receiving') return [];
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) return [];
    return generateTimeSlotsForDate(date, availableSlots);
  }, [selectedDate, availableSlots, userType]);

  // Get unique available dates from slots (for sending doctor)
  const availableDatesForCalendar = useMemo(() => {
    if (userType === 'receiving' || availableSlots.length === 0) return [];
    
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check next 90 days
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      const slots = generateTimeSlotsForDate(checkDate, availableSlots);
      if (slots.length > 0) {
        dates.push(new Date(checkDate));
      }
    }
    
    return dates;
  }, [availableSlots, userType]);

  // Convert selected date string to Date object for calendar
  const selectedDateObj = selectedDate ? new Date(selectedDate) : undefined;

  // Format current date/time for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSetNow = () => {
    setAppointmentDate(getCurrentDateTime());
  };

  const generatePatientNumber = (code: string, datetime: string) => {
    const date = new Date(datetime);
    const year = String(date.getFullYear() % 100).padStart(2, '0'); // Last 2 digits of year
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${code}-${year}${month}${day}-${hours}${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // For sending doctor, use selected slot; for receiving doctor, use appointmentDate
      const finalAppointmentDate = userType === 'receiving' ? appointmentDate : selectedSlot;

      if (!finalAppointmentDate) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: userType === 'receiving' 
            ? "Dátum a čas vyšetrenia je povinný" 
            : "Vyberte dostupný slot",
        });
        return;
      }

      appointmentSchema.parse({
        ambulanceCode,
        appointmentDate: finalAppointmentDate,
        procedureType,
      });

      const appointmentDateObj = new Date(finalAppointmentDate);
      if (isNaN(appointmentDateObj.getTime())) {
        throw new Error("Neplatný dátum rezervácie");
      }

      const patientNumber = generatePatientNumber(ambulanceCode, finalAppointmentDate);

      await createAppointment.mutateAsync({
        angiologist_id: userId,
        patient_number: patientNumber,
        appointment_date: appointmentDateObj.toISOString(),
        notes: procedureType,
        status: 'scheduled',
      });

      // Reset form
      setSelectedDate("");
      setSelectedSlot("");
      setAppointmentDate("");
      setProcedureType("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: error.errors[0].message,
        });
      }
      // Other errors are handled by mutation's onError
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-primary" />
          <CardTitle>Nová rezervácia</CardTitle>
        </div>
        <CardDescription>
          Číslo pacienta sa vygeneruje automaticky z kódu ambulancie a času vyšetrenia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kód ambulancie</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-4 py-2 font-mono">
                {ambulanceCode}
              </Badge>
              <span className="text-sm text-muted-foreground">
                (vygenerované z vášho mena)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Číslo pacienta: {ambulanceCode && (userType === 'receiving' ? appointmentDate : selectedSlot) ? generatePatientNumber(ambulanceCode, userType === 'receiving' ? appointmentDate : selectedSlot) : "vyberte dátum"}
            </p>
          </div>

          {userType === 'receiving' ? (
            // Receiving doctor: datetime-local input with "Now" button
          <div className="space-y-2">
              <div className="flex items-center justify-between">
            <Label htmlFor="appointmentDate">Dátum a čas vyšetrenia *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSetNow}
                  className="gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Teraz
                </Button>
              </div>
            <Input
              id="appointmentDate"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />
          </div>
          ) : (
            // Sending doctor: calendar + slot selector
            <>
              <div className="space-y-2">
                <Label>Dátum vyšetrenia *</Label>
                <Calendar
                  mode="single"
                  selected={selectedDateObj}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setSelectedDate(`${year}-${month}-${day}`);
                      setSelectedSlot(""); // Reset slot when date changes
                    } else {
                      setSelectedDate("");
                      setSelectedSlot("");
                    }
                  }}
                  disabled={(date) => {
                    // Disable past dates
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    
                    // Check if date has available slots
                    const hasSlots = availableDatesForCalendar.some(
                      availableDate => 
                        availableDate.getFullYear() === date.getFullYear() &&
                        availableDate.getMonth() === date.getMonth() &&
                        availableDate.getDate() === date.getDate()
                    );
                    return !hasSlots;
                  }}
                  modifiers={{
                    available: availableDatesForCalendar
                  }}
                  modifiersClassNames={{
                    available: "bg-green-100 text-green-900 font-semibold hover:bg-green-200 dark:bg-green-900 dark:text-green-100"
                  }}
                  className="rounded-md border"
                />
                {selectedDate && timeSlots.length === 0 && (
                  <p className="text-xs text-red-500">
                    ⚠️ V tento deň nie sú dostupné žiadne voľné termíny
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeSlot">Dostupný slot *</Label>
                <Select 
                  value={selectedSlot} 
                  onValueChange={setSelectedSlot} 
                  required
                  disabled={!selectedDate || timeSlots.length === 0}
                >
                  <SelectTrigger id="timeSlot">
                    <SelectValue placeholder={
                      !selectedDate 
                        ? "Najprv vyberte dátum" 
                        : timeSlots.length === 0 
                          ? "Žiadne dostupné sloty" 
                          : "Vyberte dostupný slot"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot, index) => (
                      <SelectItem key={index} value={slot.time}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDate && timeSlots.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pre tento dátum nie sú dostupné žiadne ordinančné hodiny
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="procedureType">Typ procedúry *</Label>
            <Select value={procedureType} onValueChange={setProcedureType} required>
              <SelectTrigger id="procedureType">
                <SelectValue placeholder="Vyberte typ procedúry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operácia">Operácia</SelectItem>
                <SelectItem value="Sklerotizácia">Sklerotizácia</SelectItem>
                <SelectItem value="Iné">Iné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
            {createAppointment.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vytvárám...
              </>
            ) : (
              <>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Vytvoriť rezerváciu
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AppointmentForm;
