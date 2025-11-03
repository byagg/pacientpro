import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, Loader2 } from "lucide-react";
import { z } from "zod";

const appointmentSchema = z.object({
  patientNumber: z.string()
    .trim()
    .nonempty("Číslo pacienta je povinné")
    .max(50, "Číslo pacienta je príliš dlhé"),
  appointmentDate: z.string().nonempty("Dátum rezervácie je povinný"),
  notes: z.string().max(500, "Poznámky môžu mať maximálne 500 znakov").optional(),
});

interface AppointmentFormProps {
  userId: string;
}

const AppointmentForm = ({ userId }: AppointmentFormProps) => {
  const [patientNumber, setPatientNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      appointmentSchema.parse({
        patientNumber,
        appointmentDate,
        notes,
      });

      const { error } = await supabase.from("appointments").insert({
        angiologist_id: userId,
        patient_number: patientNumber.trim(),
        appointment_date: new Date(appointmentDate).toISOString(),
        notes: notes.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Rezervácia vytvorená",
        description: "Rezervácia bola úspešne pridaná do kalendára",
      });

      // Reset form
      setPatientNumber("");
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
          Vytvorte novú rezerváciu pre pacienta (používame len číslo pacienta pre GDPR)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientNumber">Číslo pacienta *</Label>
            <Input
              id="patientNumber"
              type="text"
              placeholder="napr. P-2024-001"
              value={patientNumber}
              onChange={(e) => setPatientNumber(e.target.value)}
              required
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Zadajte len identifikačné číslo pacienta, nie meno
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentDate">Dátum a čas rezervácie *</Label>
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
