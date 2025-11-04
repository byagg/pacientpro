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

  const handleAddSlot = async () => {
    if (!selectedDay || !startTime || !endTime) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Vyplňte všetky povinné polia",
      });
      return;
    }

    await createHour.mutateAsync({
      receiving_doctor_id: receivingDoctorId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,
      end_time: endTime,
      slot_duration_minutes: parseInt(slotDuration),
    });

    // Reset form
    setSelectedDay("");
    setStartTime("");
    setEndTime("");
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
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Koniec *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Dĺžka (min) *</Label>
              <Input
                id="duration"
                type="number"
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                min="30"
                step="30"
              />
            </div>
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

