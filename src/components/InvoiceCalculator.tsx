import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, Loader2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useAppointments } from "@/hooks/use-appointments";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useProfile } from "@/hooks/use-profile";

interface InvoiceCalculatorProps {
  userId: string;
}

const InvoiceCalculator = ({ userId }: InvoiceCalculatorProps) => {
  const { data: appointments = [] } = useAppointments(userId);
  const { data: profile } = useProfile(userId);
  const createInvoice = useCreateInvoice();
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());

  // Filter only examined appointments that are not yet invoiced
  const examinedAppointments = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return apt.examined_at && 
             apt.status === 'completed' && 
             aptDate >= oneYearAgo;
    });
  }, [appointments]);

  const totalAmount = useMemo(() => {
    return selectedAppointments.size * 14; // 14 EUR per patient
  }, [selectedAppointments]);

  const toggleAppointment = (appointmentId: string) => {
    const newSelected = new Set(selectedAppointments);
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId);
    } else {
      newSelected.add(appointmentId);
    }
    setSelectedAppointments(newSelected);
  };

  const toggleAll = () => {
    if (selectedAppointments.size === examinedAppointments.length) {
      setSelectedAppointments(new Set());
    } else {
      setSelectedAppointments(new Set(examinedAppointments.map(apt => apt.id)));
    }
  };

  const handleCreateInvoice = async () => {
    if (selectedAppointments.size === 0) return;
    
    if (!profile?.invoice_name || !profile?.bank_account) {
      alert("Najprv nastavte fakturačné údaje v sekcii 'Fakturačné údaje'");
      return;
    }

    // Assuming all selected appointments have the same receiving_doctor_id
    const firstAppointment = examinedAppointments.find(apt => 
      selectedAppointments.has(apt.id)
    );
    
    if (!firstAppointment?.receiving_doctor_id) {
      alert("Vybraní pacienti nemajú priradeného prijímajúceho lekára");
      return;
    }

    await createInvoice.mutateAsync({
      sending_doctor_id: userId,
      receiving_doctor_id: firstAppointment.receiving_doctor_id,
      appointment_ids: Array.from(selectedAppointments),
      total_amount: totalAmount,
    });

    setSelectedAppointments(new Set());
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Kalkulačka faktúr</CardTitle>
        </div>
        <CardDescription>
          Vyberte vyšetrených pacientov pre vytvorenie faktúry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary and actions */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Vybraní pacienti</p>
              <p className="text-2xl font-bold">{selectedAppointments.size}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Celková suma</p>
              <p className="text-2xl font-bold text-primary">{totalAmount} €</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={toggleAll}
              className="flex-1"
              disabled={examinedAppointments.length === 0}
            >
              {selectedAppointments.size === examinedAppointments.length ? "Zrušiť výber" : "Vybrať všetkých"}
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={selectedAppointments.size === 0 || createInvoice.isPending}
              className="flex-1"
            >
              {createInvoice.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vytváram...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Vytvoriť faktúru
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Patient list */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Vyšetrení pacienti ({examinedAppointments.length})</h3>
          {examinedAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Žiadni vyšetrení pacienti z posledného roka
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {examinedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                    selectedAppointments.has(appointment.id)
                      ? "bg-primary/5 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => toggleAppointment(appointment.id)}
                >
                  <Checkbox
                    checked={selectedAppointments.has(appointment.id)}
                    onCheckedChange={() => toggleAppointment(appointment.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold truncate">{appointment.patient_number}</p>
                      <Badge variant="outline" className="ml-2">14 €</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(appointment.appointment_date), "PPp", { locale: sk })}
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {appointment.notes}
                      </p>
                    )}
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

export default InvoiceCalculator;

