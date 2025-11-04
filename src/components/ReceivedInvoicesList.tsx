import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, User, DollarSign, Loader2, Eye, Check } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useReceivingInvoices, useInvoiceItems, useMarkInvoicePaid, type InvoiceWithDetails } from "@/hooks/use-invoices";

interface ReceivedInvoicesListProps {
  receivingDoctorId: string;
}

const ReceivedInvoicesList = ({ receivingDoctorId }: ReceivedInvoicesListProps) => {
  const { data: invoices = [], isLoading } = useReceivingInvoices(receivingDoctorId);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const { data: invoiceItems = [] } = useInvoiceItems(selectedInvoice?.id || "");
  const markPaid = useMarkInvoicePaid();

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
    <>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Prijaté faktúry</CardTitle>
          </div>
          <CardDescription>
            Faktúry od odosielajúcich lekárov na úhradu
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
                        <span>Od: {invoice.sending_doctor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Vystavené: {format(new Date(invoice.issue_date), "PPp", { locale: sk })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Suma na úhradu</p>
                      <p className="text-xl font-bold text-primary">{invoice.total_amount} €</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.patient_count} {invoice.patient_count === 1 ? 'pacient' : invoice.patient_count < 5 ? 'pacienti' : 'pacientov'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Detail
                    </Button>
                    {invoice.status === 'pending' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => markPaid.mutate(invoice.id)}
                        disabled={markPaid.isPending}
                      >
                        {markPaid.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Uhradiť
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail faktúry</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-3">Dodávateľ</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{selectedInvoice.sending_doctor_invoice_data?.name || selectedInvoice.sending_doctor_name}</p>
                  {selectedInvoice.sending_doctor_invoice_data?.address && (
                    <p className="text-muted-foreground whitespace-pre-line">
                      {selectedInvoice.sending_doctor_invoice_data.address}
                    </p>
                  )}
                  {selectedInvoice.sending_doctor_invoice_data?.bank_account && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">IBAN:</span> {selectedInvoice.sending_doctor_invoice_data.bank_account}
                    </p>
                  )}
                  <div className="flex gap-4 pt-1">
                    {selectedInvoice.sending_doctor_invoice_data?.ico && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">IČO:</span> {selectedInvoice.sending_doctor_invoice_data.ico}
                      </p>
                    )}
                    {selectedInvoice.sending_doctor_invoice_data?.dic && (
                      <p className="text-muted-foreground">
                        <span className="font-medium">DIČ:</span> {selectedInvoice.sending_doctor_invoice_data.dic}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-3">Položky faktúry</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Číslo pacienta</th>
                        <th className="text-left p-3">Dátum vyšetrenia</th>
                        <th className="text-left p-3">Procedúra</th>
                        <th className="text-right p-3">Suma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item: any) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">{item.patient_number}</td>
                          <td className="p-3">
                            {format(new Date(item.appointment_date), "P", { locale: sk })}
                          </td>
                          <td className="p-3 text-muted-foreground">{item.procedure_type || "—"}</td>
                          <td className="text-right p-3 font-medium">{item.amount} €</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted border-t-2">
                      <tr>
                        <td colSpan={3} className="p-3 font-semibold">Celková suma</td>
                        <td className="text-right p-3 font-bold text-lg">{selectedInvoice.total_amount} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Dátum vystavenia:</span>{" "}
                  {format(new Date(selectedInvoice.issue_date), "PPp", { locale: sk })}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {getStatusText(selectedInvoice.status)}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReceivedInvoicesList;

