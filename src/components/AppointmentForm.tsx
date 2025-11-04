import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Loader2, Clock } from "lucide-react";
import { z } from "zod";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useAvailableSlots, generateTimeSlotsForDate } from "@/hooks/use-available-slots";
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
  const [ambulanceCode, setAmbulanceCode] = useState("AA");
  const [selectedDate, setSelectedDate] = useState(""); // For sending doctor - date only
  const [selectedSlot, setSelectedSlot] = useState(""); // For sending doctor - time slot
  const [appointmentDate, setAppointmentDate] = useState(""); // For receiving doctor - datetime-local
  const [procedureType, setProcedureType] = useState("");
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();
  const { data: availableSlots = [] } = useAvailableSlots();

  // Generate time slots for selected date (for sending doctor)
  const timeSlots = useMemo(() => {
    if (!selectedDate || userType === 'receiving') return [];
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) return [];
    return generateTimeSlotsForDate(date, availableSlots);
  }, [selectedDate, availableSlots, userType]);

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
      setAmbulanceCode("AA");
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
            <Label htmlFor="ambulanceCode">Kód ambulancie *</Label>
            <Select value={ambulanceCode} onValueChange={setAmbulanceCode} required>
              <SelectTrigger id="ambulanceCode">
                <SelectValue placeholder="Vyberte kód ambulancie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AA">AA</SelectItem>
                <SelectItem value="AB">AB</SelectItem>
                <SelectItem value="AC">AC</SelectItem>
                <SelectItem value="AD">AD</SelectItem>
                <SelectItem value="AE">AE</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Číslo pacienta: {ambulanceCode && (userType === 'receiving' ? appointmentDate : selectedSlot) ? generatePatientNumber(ambulanceCode, userType === 'receiving' ? appointmentDate : selectedSlot) : "vyberte kód a dátum"}
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
            // Sending doctor: date picker + slot selector
            <>
              <div className="space-y-2">
                <Label htmlFor="selectedDate">Dátum vyšetrenia *</Label>
                <Input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(""); // Reset slot when date changes
                  }}
                  required
                  min={new Date().toISOString().split('T')[0]} // Minimum today
                />
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
