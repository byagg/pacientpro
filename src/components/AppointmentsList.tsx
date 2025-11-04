import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useAppointments } from "@/hooks/use-appointments";

interface AppointmentsListProps {
  userId: string;
}

const AppointmentsList = ({ userId }: AppointmentsListProps) => {
  const { data: appointments = [], isLoading } = useAppointments(userId);

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
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-lg">
                      Pacient: {appointment.patient_number}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(appointment.appointment_date), "PPp", {
                          locale: sk,
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>
                    {getStatusText(appointment.status)}
                  </Badge>
                </div>
                {appointment.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {appointment.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsList;
