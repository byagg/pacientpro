import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CheckCircle2, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useAppointments, useMarkAppointmentExamined } from "@/hooks/use-appointments";
import { useCommissions, useMarkCommissionPaid } from "@/hooks/use-commissions";

interface AppointmentsListProps {
  userId: string;
}

const AppointmentsList = ({ userId }: AppointmentsListProps) => {
  const { data: appointments = [], isLoading } = useAppointments(userId);
  const { data: commissions = [] } = useCommissions(userId);
  const markExamined = useMarkAppointmentExamined();
  const markPaid = useMarkCommissionPaid();

  const [examinedTime, setExaminedTime] = useState<{ [key: string]: string }>({});
  const [paidTime, setPaidTime] = useState<{ [key: string]: string }>({});

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

  const handleSetNow = (appointmentId: string, type: 'examined' | 'paid') => {
    if (type === 'examined') {
      setExaminedTime({ ...examinedTime, [appointmentId]: getCurrentDateTime() });
    } else {
      setPaidTime({ ...paidTime, [appointmentId]: getCurrentDateTime() });
    }
  };

  const handleMarkExamined = async (appointmentId: string) => {
    const time = examinedTime[appointmentId] || getCurrentDateTime();
    const examinedAt = new Date(time).toISOString();

    await markExamined.mutateAsync({
      appointmentId,
      examinedAt,
      examinedBy: userId,
    });

    setExaminedTime({ ...examinedTime, [appointmentId]: "" });
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

  // Get commission for appointment
  const getCommissionForAppointment = (appointmentId: string) => {
    return commissions.find((c) => c.appointment_id === appointmentId);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "scheduled":
        return "bg-primary/10 text-primary";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "scheduled":
        return "Naplánované";
      case "completed":
        return "Dokončené";
      case "cancelled":
        return "Zrušené";
      default:
        return status || "Neznámy";
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          Načítavam rezervácie...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Moje rezervácie</CardTitle>
        </div>
        <CardDescription>
          História všetkých vašich rezervácií
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ nemáte žiadne rezervácie
          </p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const commission = getCommissionForAppointment(appointment.id);
              const isExamined = appointment.examined_at !== null;
              const isPaid = commission?.status === 'paid';

              return (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        Pacient: {appointment.patient_number}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          Naplánované: {format(new Date(appointment.appointment_date), "PPp", {
                            locale: sk,
                          })}
                        </span>
                      </div>
                      {appointment.examined_at && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Vyšetrené: {format(new Date(appointment.examined_at), "PPp", {
                              locale: sk,
                            })}
                          </span>
                        </div>
                      )}
                      {isPaid && commission?.paid_at && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-1">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            Vyplatené: {format(new Date(commission.paid_at), "PPp", {
                              locale: sk,
                            })} ({commission.amount} €)
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Typ procedúry: {appointment.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="border-t pt-3 mt-3 space-y-3">
                    {/* Mark as examined */}
                    {!isExamined && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`examined-time-${appointment.id}`} className="text-sm font-medium">
                            Čas vyšetrenia:
                          </Label>
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              id={`examined-time-${appointment.id}`}
                              type="datetime-local"
                              value={examinedTime[appointment.id] || ""}
                              onChange={(e) =>
                                setExaminedTime({ ...examinedTime, [appointment.id]: e.target.value })
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetNow(appointment.id, 'examined')}
                              className="gap-1"
                            >
                              <Clock className="h-3 w-3" />
                              Teraz
                            </Button>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleMarkExamined(appointment.id)}
                          disabled={markExamined.isPending}
                          className="w-full"
                          size="sm"
                          variant="outline"
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
                    )}

                    {/* Mark commission as paid */}
                    {commission && !isPaid && isExamined && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`paid-time-${appointment.id}`} className="text-sm font-medium">
                            Čas vyplatenia ({commission.amount} €):
                          </Label>
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              id={`paid-time-${appointment.id}`}
                              type="datetime-local"
                              value={paidTime[appointment.id] || ""}
                              onChange={(e) =>
                                setPaidTime({ ...paidTime, [appointment.id]: e.target.value })
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetNow(appointment.id, 'paid')}
                              className="gap-1"
                            >
                              <Clock className="h-3 w-3" />
                              Teraz
                            </Button>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleMarkPaid(commission.id, appointment.id)}
                          disabled={markPaid.isPending}
                          className="w-full"
                          size="sm"
                          variant="default"
                        >
                          {markPaid.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Ukladám...
                            </>
                          ) : (
                            <>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Označiť poplatok ako vyplatený
                            </>
                          )}
                        </Button>
                      </div>
                    )}
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

export default AppointmentsList;
