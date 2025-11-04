import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useReceivedPatients, useMarkPatientExamined } from "@/hooks/use-received-patients";
import { useDeleteAppointment } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";

interface WaitingPatientsListProps {
  receivingDoctorId: string;
}

const WaitingPatientsList = ({ receivingDoctorId }: WaitingPatientsListProps) => {
  const { data: allPatients = [], isLoading } = useReceivedPatients(receivingDoctorId);
  const markExamined = useMarkPatientExamined();
  const deleteAppointment = useDeleteAppointment();
  const { toast } = useToast();

  // Filter only waiting patients
  const waitingPatients = useMemo(() => {
    return allPatients.filter(p => !p.examined_at);
  }, [allPatients]);

  const handleMarkExamined = async (appointmentId: string) => {
    const now = new Date().toISOString();
    await markExamined.mutateAsync({
      appointmentId,
      examinedAt: now,
      examinedBy: receivingDoctorId,
    });
  };

  const handleDelete = async (appointmentId: string, patientNumber: string) => {
    if (confirm(`Naozaj chcete vymazať pacienta ${patientNumber}?`)) {
      await deleteAppointment.mutateAsync(appointmentId);
      toast({
        title: "Pacient vymazaný",
        description: `Pacient ${patientNumber} bol odstránený`,
      });
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
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Čakajúci pacienti</CardTitle>
        </div>
        <CardDescription>
          Pacienti čakajúci na vyšetrenie
        </CardDescription>
      </CardHeader>
      <CardContent>
        {waitingPatients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Žiadni čakajúci pacienti
          </p>
        ) : (
          <div className="space-y-3">
            {waitingPatients.map((patient) => (
              <div
                key={patient.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">{patient.patient_number}</p>
                      <Badge variant="secondary">Čaká na vyšetrenie</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      <span>Od: {patient.sending_doctor_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(patient.appointment_date), "PPp", { locale: sk })}
                      </span>
                    </div>
                    {patient.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {patient.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleMarkExamined(patient.id)}
                    disabled={markExamined.isPending}
                    className="flex-1"
                  >
                    {markExamined.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Označujem...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-3 w-3" />
                        Označiť ako vyšetreného (teraz)
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(patient.id, patient.patient_number)}
                    disabled={deleteAppointment.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitingPatientsList;

