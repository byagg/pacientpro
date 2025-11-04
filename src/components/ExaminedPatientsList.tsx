import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, DollarSign, Loader2, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useReceivedPatients } from "@/hooks/use-received-patients";
import { useCommissions, useMarkCommissionPaid } from "@/hooks/use-commissions";
import { useDeleteAppointment } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";

interface ExaminedPatientsListProps {
  receivingDoctorId: string;
}

const ExaminedPatientsList = ({ receivingDoctorId }: ExaminedPatientsListProps) => {
  const { data: allPatients = [], isLoading } = useReceivedPatients(receivingDoctorId);
  const { data: allCommissions = [] } = useCommissions(receivingDoctorId);
  const markPaid = useMarkCommissionPaid();
  const deleteAppointment = useDeleteAppointment();
  const { toast } = useToast();

  // Filter only examined patients from last year
  const { examinedPatients, commissions } = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const examined = allPatients.filter(p => {
      if (!p.examined_at) return false;
      const examDate = new Date(p.examined_at);
      return examDate >= oneYearAgo;
    });

    // Create commission map
    const commissionMap = new Map();
    allCommissions.forEach(c => {
      commissionMap.set(c.appointment_id, c);
    });

    return { examinedPatients: examined, commissions: commissionMap };
  }, [allPatients, allCommissions]);

  const handlePayCommission = async (appointmentId: string) => {
    const commission = commissions.get(appointmentId);
    if (!commission) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Provízia pre tohto pacienta neexistuje",
      });
      return;
    }

    const now = new Date().toISOString();
    await markPaid.mutateAsync({ 
      commissionId: commission.id, 
      paidAt: now 
    });
  };

  const handleDelete = async (appointmentId: string, patientNumber: string, userId: string) => {
    if (confirm(`Naozaj chcete vymazať pacienta ${patientNumber}?`)) {
      await deleteAppointment.mutateAsync({ appointmentId, userId });
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
          <CheckCircle className="h-5 w-5 text-primary" />
          <CardTitle>Vyšetrení pacienti</CardTitle>
        </div>
        <CardDescription>
          Pacienti vyšetrení v poslednom roku
        </CardDescription>
      </CardHeader>
      <CardContent>
        {examinedPatients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Žiadni vyšetrení pacienti z posledného roka
          </p>
        ) : (
          <div className="space-y-3">
            {examinedPatients.map((patient) => {
              const commission = commissions.get(patient.id);
              const isPaid = commission?.status === 'paid';
              
              return (
                <div
                  key={patient.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">{patient.patient_number}</p>
                        <Badge variant={isPaid ? "default" : "secondary"}>
                          {isPaid ? "Zaplatené" : "Čaká na platbu"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-4 w-4" />
                        <span>Od: {patient.sending_doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Termín: {format(new Date(patient.appointment_date), "PPp", { locale: sk })}
                        </span>
                      </div>
                      {patient.examined_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            Vyšetrený: {format(new Date(patient.examined_at), "PPp", { locale: sk })}
                          </span>
                        </div>
                      )}
                      {patient.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {patient.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Poplatok</p>
                      <p className="text-xl font-bold text-primary">14 €</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t">
                    {!isPaid && (
                      <Button
                        size="sm"
                        onClick={() => handlePayCommission(patient.id)}
                        disabled={markPaid.isPending}
                        className="flex-1"
                      >
                        {markPaid.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Označujem...
                          </>
                        ) : (
                          <>
                            <DollarSign className="mr-2 h-3 w-3" />
                            Zaplatiť poplatok odosielajúcemu lekárovi
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(patient.id, patient.patient_number, patient.angiologist_id)}
                      disabled={deleteAppointment.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExaminedPatientsList;

