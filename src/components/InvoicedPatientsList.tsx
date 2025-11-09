import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, Clock, FileText, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteAppointment } from "@/hooks/use-appointments";

interface InvoicedPatientsListProps {
  receivingDoctorId: string;
}

interface InvoicedPatient {
  id: string;
  patient_number: string;
  angiologist_id: string;
  sending_doctor_name: string;
  appointment_date: string;
  examined_at: string;
  procedure_type: string;
  invoice_number: string;
  invoice_date: string;
  invoice_id: string;
}

const InvoicedPatientsList = ({ receivingDoctorId }: InvoicedPatientsListProps) => {
  const deleteAppointment = useDeleteAppointment();

  // Fetch invoiced patients - those who are in invoice_items
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["invoiced-patients", receivingDoctorId],
    queryFn: async () => {
      // Get all invoice items for this receiving doctor
      const { data: invoiceData, error } = await supabase
        .from('invoice_items')
        .select(`
          appointment_id,
          amount,
          invoices!inner(
            id,
            invoice_number,
            issue_date,
            receiving_doctor_id
          ),
          appointments!inner(
            id,
            patient_number,
            angiologist_id,
            appointment_date,
            examined_at,
            notes,
            profiles!appointments_angiologist_id_fkey(full_name)
          )
        `)
        .eq('invoices.receiving_doctor_id', receivingDoctorId);

      if (error) {
        console.error('Error fetching invoiced patients:', error);
        throw error;
      }

      // Map data to InvoicedPatient format and sort by invoice date (newest first)
      const result: InvoicedPatient[] = (invoiceData || [])
        .map((item: any) => ({
          id: item.appointments.id,
          patient_number: item.appointments.patient_number,
          angiologist_id: item.appointments.angiologist_id,
          sending_doctor_name: item.appointments.profiles?.full_name || 'Neznámy',
          appointment_date: item.appointments.appointment_date,
          examined_at: item.appointments.examined_at,
          procedure_type: item.appointments.notes || '',
          invoice_number: item.invoices.invoice_number,
          invoice_date: item.invoices.issue_date,
          invoice_id: item.invoices.id,
        }))
        .sort((a, b) => {
          // Sort by invoice date, newest first
          return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
        });

      console.log('Invoiced patients query result:', result.length, 'patients');
      return result;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Group patients by invoice
  const groupedByInvoice = useMemo(() => {
    const groups = new Map<string, InvoicedPatient[]>();
    
    patients.forEach(patient => {
      const key = patient.invoice_id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(patient);
    });

    return Array.from(groups.entries()).map(([invoiceId, patients]) => ({
      invoiceId,
      invoiceNumber: patients[0].invoice_number,
      invoiceDate: patients[0].invoice_date,
      patients,
    }));
  }, [patients]);

  const handleDelete = async (appointmentId: string, patientNumber: string, angiologistId: string) => {
    if (confirm(`Naozaj chcete vymazať pacienta ${patientNumber}? Táto akcia je nenávratná.`)) {
      await deleteAppointment.mutateAsync({ appointmentId, userId: angiologistId });
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <CardTitle>Vyfakturovaní pacienti</CardTitle>
        </div>
        <CardDescription>
          Pacienti, ktorí už boli zahrnutí do faktúr ({patients.length} celkovo)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groupedByInvoice.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Zatiaľ nemáte žiadnych vyfakturovaných pacientov</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByInvoice.map((group) => (
              <div key={group.invoiceId} className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-3 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{group.invoiceNumber}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(group.invoiceDate), "d. M. yyyy", { locale: sk })}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {group.patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="border rounded-md p-2 bg-card hover:bg-accent/50 transition-colors text-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{patient.patient_number}</p>
                            <Badge variant="secondary" className="text-xs">Vyfakturovaný</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Od: {patient.sending_doctor_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Termín: {format(new Date(patient.appointment_date), "d. M. yyyy HH:mm", { locale: sk })}
                            </span>
                          </div>
                          {patient.examined_at && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                Vyšetrený: {format(new Date(patient.examined_at), "d. M. yyyy HH:mm", { locale: sk })}
                              </span>
                            </div>
                          )}
                          {patient.procedure_type && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              {patient.procedure_type}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(patient.id, patient.patient_number, patient.angiologist_id)}
                          disabled={deleteAppointment.isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoicedPatientsList;

