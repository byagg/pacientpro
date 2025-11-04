import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, Calendar, User, Euro } from "lucide-react";
import { useSendingInvoices } from "@/hooks/use-invoices";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { formatDoctorName } from "@/lib/utils-doctors";

interface PaidInvoicesListProps {
  userId: string;
}

const PaidInvoicesList = ({ userId }: PaidInvoicesListProps) => {
  const { data: invoices = [], isLoading } = useSendingInvoices(userId);

  // Filter only paid invoices
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Načítavam vyplatené faktúry...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-green-600" />
          <CardTitle>Vyplatené faktúry</CardTitle>
        </div>
        <CardDescription>
          Faktúry, ktoré boli uhradené prijímajúcim lekárom
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paidInvoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ nemáte žiadne vyplatené faktúry
          </p>
        ) : (
          <div className="space-y-4">
            {paidInvoices.map((invoice) => (
              <Card key={invoice.id} className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {invoice.invoice_number}
                        </span>
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                          Zaplatená
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{formatDoctorName(invoice.receiving_doctor_name)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {invoice.issue_date
                              ? format(new Date(invoice.issue_date), "d. M. yyyy", { locale: sk })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {invoice.paid_at && (
                        <div className="text-sm text-green-600 flex items-center gap-1">
                          <FileCheck className="h-3 w-3" />
                          <span>
                            Uhradená:{" "}
                            {format(new Date(invoice.paid_at), "d. M. yyyy 'o' HH:mm", { locale: sk })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-green-700">
                        <Euro className="h-5 w-5" />
                        {invoice.total_amount?.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {invoice.patient_count || 0} pacientov
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaidInvoicesList;

