import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, DollarSign, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useAppointments, useDeleteAppointment } from "@/hooks/use-appointments";
import { useCommissions } from "@/hooks/use-commissions";

interface AppointmentsListProps {
  userId: string;
}

const AppointmentsList = ({ userId }: AppointmentsListProps) => {
  const { data: appointments = [], isLoading } = useAppointments(userId);
  const { data: commissions = [] } = useCommissions(userId);
  const deleteAppointment = useDeleteAppointment();

  // Filter appointments - keep only those from the last year
  const filteredAppointments = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      return appointmentDate >= oneYearAgo;
    });
  }, [appointments]);

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

  const handleDelete = async (appointmentId: string) => {
    if (!confirm("Naozaj chcete vymazať tohto pacienta? Táto akcia je nenávratná.")) {
      return;
    }
    await deleteAppointment.mutateAsync({ appointmentId, userId });
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
        {filteredAppointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ nemáte žiadne rezervácie z posledného roka
          </p>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const commission = getCommissionForAppointment(appointment.id);
              const isExamined = appointment.examined_at !== null;
              const isPaid = commission?.status === 'paid';

              return (
              <div
                key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors relative"
              >
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(appointment.id)}
                    disabled={deleteAppointment.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="flex justify-between items-start mb-2 pr-10">
                    <div className="flex-1">
                    <p className="font-semibold text-lg">
                      Pacient: {appointment.patient_number}
                    </p>
                    {appointment.receiving_doctor_name && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-1">
                        <User className="h-4 w-4" />
                        <span>
                          Prijímajúci lekár: {appointment.receiving_doctor_name}
                        </span>
                      </div>
                    )}
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

                  {/* Commission status display (read-only for sending doctor) */}
                  {commission && (
                    <div className="border-t pt-3 mt-3">
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
                    </div>
                  )}
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
