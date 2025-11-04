import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, CheckCircle2, Loader2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useReceivedPatients, useMarkPatientExamined } from "@/hooks/use-received-patients";
import { useCommissions, useMarkCommissionPaid } from "@/hooks/use-commissions";
import { useToast } from "@/hooks/use-toast";

interface ReceivedPatientsListProps {
  receivingDoctorId: string;
}

const ReceivedPatientsList = ({ receivingDoctorId }: ReceivedPatientsListProps) => {
  const { data: allPatients = [], isLoading } = useReceivedPatients(receivingDoctorId);
  const { data: allCommissions = [] } = useCommissions(receivingDoctorId);
  const markExamined = useMarkPatientExamined();
  const markPaid = useMarkCommissionPaid();
  const { toast } = useToast();

  const [examinedTime, setExaminedTime] = useState<{ [key: string]: string }>({});
  const [paidTime, setPaidTime] = useState<{ [key: string]: string }>({});

  // Filter patients - separate waiting and examined
  const { waitingPatients, examinedPatients, commissions } = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const waiting = allPatients.filter(p => !p.examined_at);
    const examined = allPatients.filter(p => {
      if (!p.examined_at) return false;
      const examDate = new Date(p.examined_at);
      return examDate >= oneYearAgo;
    });

    // Filter commissions for examined patients from last year
    const recentExaminedIds = examined.map(p => p.id);
    const recentCommissions = allCommissions.filter(c => 
      recentExaminedIds.includes(c.appointment_id)
    );

    return {
      waitingPatients: waiting,
      examinedPatients: examined,
      commissions: recentCommissions,
    };
  }, [allPatients, allCommissions]);

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

  const handleSetNowPaid = (appointmentId: string) => {
    setPaidTime({ ...paidTime, [appointmentId]: getCurrentDateTime() });
  };

  const handleMarkPaid = async (commissionId: string, appointmentId: string) => {
    const time = paidTime[appointmentId] || getCurrentDateTime();
    const paidAt = new Date(time).toISOString();

    await markPaid.mutateAsync({
      commissionId,
      paidAt,
    });

    setPaidTime({ ...paidTime, [appointmentId]: "" });
  };

  const getCommissionForAppointment = (appointmentId: string) => {
    return commissions.find((c) => c.appointment_id === appointmentId);
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
          Spravujte čakajúcich pacientov a vyplatené poplatky
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="waiting" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="waiting">
              Čakajúci ({waitingPatients.length})
            </TabsTrigger>
            <TabsTrigger value="examined">
              Vyšetrení ({examinedPatients.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Waiting for examination */}
          <TabsContent value="waiting" className="space-y-4 mt-4">
            {waitingPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Žiadni pacienti nečakajú na vyšetrenie
              </p>
            ) : (
              <div className="space-y-4">
                {waitingPatients.map((patient) => (
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
          </TabsContent>

          {/* Tab: Examined patients */}
          <TabsContent value="examined" className="space-y-4 mt-4">
            {examinedPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Zatiaľ nemáte žiadnych vyšetrených pacientov z posledného roka
              </p>
            ) : (
              <div className="space-y-4">
                {examinedPatients.map((patient) => {
                  const commission = getCommissionForAppointment(patient.id);
                  const isPaid = commission?.status === 'paid';

                  return (
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
                          {patient.examined_at && (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Vyšetrené: {format(new Date(patient.examined_at), "PPp", { locale: sk })}
                              </span>
                            </div>
                          )}
                          {patient.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Typ procedúry: {patient.notes}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Vyšetrený
                        </Badge>
                      </div>

                      {/* Commission payment section */}
                      {commission && (
                        <div className="border-t pt-3 mt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Manipulačný poplatok:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{commission.amount} €</span>
                              {isPaid ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Vyplatené
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Čaká na vyplatenie
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Pay commission button */}
                          {!isPaid && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`paid-time-${patient.id}`} className="text-sm font-medium">
                                  Čas vyplatenia:
                                </Label>
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    id={`paid-time-${patient.id}`}
                                    type="datetime-local"
                                    value={paidTime[patient.id] || ""}
                                    onChange={(e) =>
                                      setPaidTime({ ...paidTime, [patient.id]: e.target.value })
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSetNowPaid(patient.id)}
                                    className="gap-1"
                                  >
                                    <Clock className="h-3 w-3" />
                                    Teraz
                                  </Button>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleMarkPaid(commission.id, patient.id)}
                                disabled={markPaid.isPending}
                                className="w-full"
                                size="sm"
                              >
                                {markPaid.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Ukladám...
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Zaplatiť poplatok odosielajúcemu lekárovi
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ReceivedPatientsList;

