import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useReceivedPatients, useMarkPatientExamined } from "@/hooks/use-received-patients";
import { useToast } from "@/hooks/use-toast";

interface ReceivedPatientsListProps {
  receivingDoctorId: string;
}

const ReceivedPatientsList = ({ receivingDoctorId }: ReceivedPatientsListProps) => {
  const { data: patients = [], isLoading } = useReceivedPatients(receivingDoctorId);
  const markExamined = useMarkPatientExamined();
  const { toast } = useToast();

  const [examinedTime, setExaminedTime] = useState<{ [key: string]: string }>({});

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

  const handleSetNow = (appointmentId: string) => {
    setExaminedTime({ ...examinedTime, [appointmentId]: getCurrentDateTime() });
  };

  const handleMarkExamined = async (appointmentId: string) => {
    const time = examinedTime[appointmentId] || getCurrentDateTime();
    const examinedAt = new Date(time).toISOString();

    await markExamined.mutateAsync({
      appointmentId,
      examinedAt,
      examinedBy: receivingDoctorId,
    });

    // Clear the time input
    setExaminedTime({ ...examinedTime, [appointmentId]: "" });
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Načítavam odoslaných pacientov...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>Odoslaní pacienti</CardTitle>
        </div>
        <CardDescription>
          Pacienti odoslaní na vyšetrenie - označte ich po vyšetrení
        </CardDescription>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ nemáte žiadnych odoslaných pacientov
          </p>
        ) : (
          <div className="space-y-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      Pacient: {patient.patient_number}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      <span>
                        Odosielajúci lekár: {patient.sending_doctor_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Naplánované: {format(new Date(patient.appointment_date), "PPp", { locale: sk })}
                      </span>
                    </div>
                    {patient.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Typ procedúry: {patient.notes}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-primary/10 text-primary">
                    Čaká na vyšetrenie
                  </Badge>
                </div>

                {/* Examination form */}
                <div className="border-t pt-3 mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`examined-time-${patient.id}`} className="text-sm font-medium">
                      Čas vyšetrenia:
                    </Label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        id={`examined-time-${patient.id}`}
                        type="datetime-local"
                        value={examinedTime[patient.id] || ""}
                        onChange={(e) =>
                          setExaminedTime({ ...examinedTime, [patient.id]: e.target.value })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetNow(patient.id)}
                        className="gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        Teraz
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleMarkExamined(patient.id)}
                    disabled={markExamined.isPending}
                    className="w-full"
                    size="sm"
                  >
                    {markExamined.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ukladám...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Označiť ako vyšetreného
                      </>
                    )}
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

export default ReceivedPatientsList;

