import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOfficeHours, useCreateOfficeHour, useUpdateOfficeHour, useDeleteOfficeHour } from "@/hooks/use-office-hours";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OfficeHoursSettingsProps {
  receivingDoctorId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Nedeľa" },
  { value: 1, label: "Pondelok" },
  { value: 2, label: "Utorok" },
  { value: 3, label: "Streda" },
  { value: 4, label: "Štvrtok" },
  { value: 5, label: "Piatok" },
  { value: 6, label: "Sobota" },
];

// Generate time options (every 30 minutes from 00:00 to 23:30)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      times.push(timeString);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

const OfficeHoursSettings = ({ receivingDoctorId }: OfficeHoursSettingsProps) => {
  const { data: officeHours = [], isLoading } = useOfficeHours(receivingDoctorId);
  const createHour = useCreateOfficeHour();
  const updateHour = useUpdateOfficeHour();
  const deleteHour = useDeleteOfficeHour();
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotDuration, setSlotDuration] = useState("30");
  const [breakStartTime, setBreakStartTime] = useState("");
  const [breakEndTime, setBreakEndTime] = useState("");

  const handleAddSlot = async () => {
    if (!selectedDay || !startTime || !endTime) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Vyplňte všetky povinné polia",
      });
      return;
    }

    // Validate break times if provided
    if (breakStartTime || breakEndTime) {
      if (!breakStartTime || !breakEndTime) {
        toast({
          variant: "destructive",
          title: "Chyba",
          description: "Ak zadáte pauzu, musíte vyplniť začiatok aj koniec",
        });
        return;
      }
      
      // Validate break is within working hours
      if (breakStartTime < startTime || breakEndTime > endTime || breakStartTime >= breakEndTime) {
        toast({
          variant: "destructive",
          title: "Chyba",
          description: "Pauza musí byť v rámci pracovných hodín a začiatok musí byť pred koncom",
        });
        return;
      }
    }

    await createHour.mutateAsync({
      receiving_doctor_id: receivingDoctorId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,  // Hook pridá :00
      end_time: endTime,      // Hook pridá :00
      slot_duration_minutes: parseInt(slotDuration),
      break_start_time: breakStartTime || null,  // Hook pridá :00
      break_end_time: breakEndTime || null,      // Hook pridá :00
    });

    // Reset form
    setSelectedDay("");
    setStartTime("");
    setEndTime("");
    setBreakStartTime("");
    setBreakEndTime("");
  };

  const handleToggleActive = async (hour: { id: string; receiving_doctor_id: string; is_active: boolean }) => {
    await updateHour.mutateAsync({
      id: hour.id,
      is_active: !hour.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete odstrániť tento slot?")) return;
    await deleteHour.mutateAsync({ id, receivingDoctorId });
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || "";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Načítavam ordinančné hodiny...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Ordinančné hodiny</CardTitle>
        </div>
        <CardDescription>
          Nastavte dostupné sloty pre vyšetrenia. Jeden slot = 30 minút (operácia/skleroterapia).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new slot form */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Pridať nový slot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day">Deň *</Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger id="day">
                  <SelectValue placeholder="Vyberte deň" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Začiatok *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger id="startTime">
                  <SelectValue placeholder="Vyberte čas" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Koniec *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger id="endTime">
                  <SelectValue placeholder="Vyberte čas" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.filter(time => !startTime || time > startTime).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Dĺžka (min) *</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Vyberte dĺžku" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minút</SelectItem>
                  <SelectItem value="60">60 minút</SelectItem>
                  <SelectItem value="90">90 minút</SelectItem>
                  <SelectItem value="120">120 minút</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Break times (optional) */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Pauza (voliteľné)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakStartTime">Začiatok pauzy</Label>
                <Select 
                  value={breakStartTime} 
                  onValueChange={setBreakStartTime}
                  disabled={!startTime || !endTime}
                >
                  <SelectTrigger id="breakStartTime">
                    <SelectValue placeholder="Vyberte čas" />
                  </SelectTrigger>
                  <SelectContent>
                    {startTime && endTime ? (
                      TIME_OPTIONS.filter(time => time > startTime && time < endTime).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Najprv vyberte pracovné hodiny</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakEndTime">Koniec pauzy</Label>
                <Select 
                  value={breakEndTime} 
                  onValueChange={setBreakEndTime}
                  disabled={!breakStartTime || !startTime || !endTime}
                >
                  <SelectTrigger id="breakEndTime">
                    <SelectValue placeholder="Vyberte čas" />
                  </SelectTrigger>
                  <SelectContent>
                    {breakStartTime && startTime && endTime ? (
                      TIME_OPTIONS.filter(time => time > breakStartTime && time <= endTime).map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Najprv vyberte začiatok pauzy</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Pauza sa použije na vylúčenie času z dostupných slotov (napr. obedná pauza)
            </p>
          </div>

          <Button
            onClick={handleAddSlot}
            disabled={createHour.isPending}
            className="w-full md:w-auto"
          >
            {createHour.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pridávam...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Pridať slot
              </>
            )}
          </Button>
        </div>

        {/* Existing slots */}
        <div className="space-y-3">
          <h3 className="font-semibold">Aktuálne sloty</h3>
          {officeHours.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Zatiaľ nemáte nastavené žiadne ordinančné hodiny
            </p>
          ) : (
            <div className="space-y-2">
              {officeHours.map((hour) => (
                <div
                  key={hour.id}
                  className={`border rounded-lg p-4 flex items-center justify-between ${
                    !hour.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {getDayName(hour.day_of_week)}: {hour.start_time.substring(0, 5)} - {hour.end_time.substring(0, 5)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Dĺžka slotu: {hour.slot_duration_minutes} minút
                      {hour.break_start_time && hour.break_end_time && (
                        <span className="ml-2 text-orange-600">
                          • Pauza: {hour.break_start_time.substring(0, 5)} - {hour.break_end_time.substring(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={hour.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(hour)}
                      disabled={updateHour.isPending}
                    >
                      {hour.is_active ? "Deaktivovať" : "Aktivovať"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(hour.id)}
                      disabled={deleteHour.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfficeHoursSettings;

