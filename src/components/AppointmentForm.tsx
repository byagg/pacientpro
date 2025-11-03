import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Loader2 } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

const appointmentSchema = z.object({
  ambulanceCode: z.string().nonempty("Kód ambulancie je povinný"),
  appointmentDate: z.string().nonempty("Dátum rezervácie je povinný"),
  notes: z.string().max(500, "Poznámky môžu mať maximálne 500 znakov").optional(),
});

interface AppointmentFormProps {
  userId: string;
}

const AppointmentForm = ({ userId }: AppointmentFormProps) => {
  const [ambulanceCode, setAmbulanceCode] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePatientNumber = (code: string, datetime: string) => {
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${code}-${year}-${month}-${day}-${hours}${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      appointmentSchema.parse({
        ambulanceCode,
        appointmentDate,
        notes,
      });

      const patientNumber = generatePatientNumber(ambulanceCode, appointmentDate);

      const { error } = await supabase.from("appointments").insert({
        angiologist_id: userId,
        patient_number: patientNumber,
        appointment_date: new Date(appointmentDate).toISOString(),
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Rezervácia vytvorená",
        description: `Rezervácia s číslom ${patientNumber} bola úspešne pridaná`,
      });

      // Reset form
      setAmbulanceCode("");
      setAppointmentDate("");
      setNotes("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: error.errors[0].message,
        });
      } else if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Chyba",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
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
              Číslo pacienta: {ambulanceCode && appointmentDate ? generatePatientNumber(ambulanceCode, appointmentDate) : "vyberte kód a dátum"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentDate">Dátum a čas vyšetrenia *</Label>
            <Input
              id="appointmentDate"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Poznámky (voliteľné)</Label>
            <Textarea
              id="notes"
              placeholder="Doplňujúce informácie..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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
