import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, User, Euro, Loader2, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import InvoicePreview from "./InvoicePreview";
import { formatDoctorName } from "@/lib/utils-doctors";
import { useDeleteInvoice } from "@/hooks/use-invoices";

interface IssuedInvoicesListProps {
  receivingDoctorId: string;
}

interface IssuedInvoice {
  id: string;
  invoice_number: string;
  sending_doctor_id: string;
  sending_doctor_name: string;
  total_amount: string;
  patient_count: number;
  issue_date: string;
  status: string;
  paid_at: string | null;
}

const IssuedInvoicesList = ({ receivingDoctorId }: IssuedInvoicesListProps) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const deleteInvoice = useDeleteInvoice();

  // Fetch invoices issued by this receiving doctor (they are the recipient)
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["issued-invoices", receivingDoctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          sending_doctor_id,
          total_amount,
          patient_count,
          issue_date,
          status,
          paid_at,
          profiles!invoices_sending_doctor_id_fkey(full_name)
        `)
        .eq('receiving_doctor_id', receivingDoctorId)
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching issued invoices:', error);
        throw error;
      }

      return (data || []).map(invoice => ({
        ...invoice,
        sending_doctor_name: invoice.profiles?.full_name || '',
      })) as IssuedInvoice[];
    },
    enabled: !!receivingDoctorId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "paid":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Čaká na úhradu";
      case "paid":
        return "Uhradená";
      case "cancelled":
        return "Zrušená";
      default:
        return status;
    }
  };

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    console.log('Attempting to delete invoice:', invoiceId, invoiceNumber);
    
    if (!window.confirm(`Naozaj chcete vymazať faktúru ${invoiceNumber}? Táto akcia je nenávratná.`)) {
      console.log('Delete cancelled by user');
      return;
    }
    
    try {
      console.log('Deleting invoice...');
      await deleteInvoice.mutateAsync(invoiceId);
      console.log('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
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
          <CardTitle>Vystavené faktúry</CardTitle>
        </div>
        <CardDescription>
          Faktúry vystavené odosielajúcim lekárom za vyšetrených pacientov
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Zatiaľ ste nevystavili žiadne faktúry
          </p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{invoice.invoice_number}</span>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusText(invoice.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Pre: {formatDoctorName(invoice.sending_doctor_name)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(invoice.issue_date), "d. M. yyyy", { locale: sk })}
                          </span>
                        </div>
                      </div>

                      {invoice.paid_at && (
                        <div className="text-sm text-green-600">
                          Uhradená: {format(new Date(invoice.paid_at), "d. M. yyyy 'o' HH:mm", { locale: sk })}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <Euro className="h-5 w-5" />
                        {invoice.total_amount}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {invoice.patient_count} pacientov
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        console.log('Opening invoice preview for:', invoice.id);
                        setSelectedInvoiceId(invoice.id);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Zobraziť
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Delete button clicked for invoice:', invoice.id);
                        handleDelete(invoice.id, invoice.invoice_number);
                      }}
                      disabled={deleteInvoice.isPending}
                      title="Vymazať faktúru"
                    >
                      {deleteInvoice.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invoice Preview Dialog */}
        {selectedInvoiceId && (
          <InvoicePreview
            invoiceId={selectedInvoiceId}
            open={!!selectedInvoiceId}
            onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default IssuedInvoicesList;

