import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useSendingInvoices } from "@/hooks/use-invoices";
import { formatDoctorName } from "@/lib/utils-doctors";

interface SentInvoicesListProps {
  userId: string;
}

const SentInvoicesList = ({ userId }: SentInvoicesListProps) => {
  const { data: invoices = [], isLoading } = useSendingInvoices(userId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Čaká na úhradu";
      case "paid":
        return "Uhradené";
      case "cancelled":
        return "Zrušené";
      default:
        return status;
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
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Prijaté faktúry</CardTitle>
        </div>
        <CardDescription>
          Faktúry vystavené prijímajúcim lekárom za vyšetrených pacientov
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ nemáte žiadne prijaté faktúry
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{invoice.invoice_number}</p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusText(invoice.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      <span>Pre: {formatDoctorName(invoice.receiving_doctor_name)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vystavené: {format(new Date(invoice.issue_date), "PPp", { locale: sk })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Suma</p>
                    <p className="text-xl font-bold text-primary">{invoice.total_amount} €</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.patient_count} {invoice.patient_count === 1 ? 'pacient' : invoice.patient_count < 5 ? 'pacienti' : 'pacientov'}
                    </p>
                  </div>
                </div>
                {invoice.notes && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SentInvoicesList;

