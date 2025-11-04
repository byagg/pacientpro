import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, X } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";

interface InvoicePreviewProps {
  invoiceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string;
  status: string;
  total_amount: string;
  patient_count: number;
  notes: string | null;
  
  // Sending doctor (odosielajúci lekár - ODBERATEĽ, platí za službu)
  sending_doctor_name: string;
  sending_doctor_address: string | null;
  sending_doctor_ico: string | null;
  sending_doctor_dic: string | null;
  
  // Receiving doctor (prijímajúci lekár - DODÁVATEĽ, poskytol službu vyšetrenia)
  receiving_doctor_name: string;
  receiving_doctor_address: string | null;
  receiving_doctor_ico: string | null;
  receiving_doctor_dic: string | null;
  receiving_doctor_bank_account: string | null; // IBAN dodávateľa (kam platiť)
  receiving_doctor_signature: string | null; // Podpis dodávateľa
}

interface InvoiceItem {
  patient_number: string;
  appointment_date: string;
  amount: string;
}

const InvoicePreview = ({ invoiceId, open, onOpenChange }: InvoicePreviewProps) => {
  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: async () => {
      const result = await sql<InvoiceData[]>`
        SELECT 
          i.id,
          i.invoice_number,
          i.issue_date,
          i.status,
          i.total_amount,
          i.patient_count,
          i.notes,
          
          COALESCE(s.invoice_name, s.full_name) as sending_doctor_name,
          s.invoice_address as sending_doctor_address,
          s.invoice_ico as sending_doctor_ico,
          s.invoice_dic as sending_doctor_dic,
          
          COALESCE(r.invoice_name, r.full_name) as receiving_doctor_name,
          r.invoice_address as receiving_doctor_address,
          r.invoice_ico as receiving_doctor_ico,
          r.invoice_dic as receiving_doctor_dic,
          r.bank_account as receiving_doctor_bank_account,
          r.signature_image as receiving_doctor_signature
          
        FROM public.invoices i
        JOIN public.profiles s ON i.sending_doctor_id = s.id
        JOIN public.profiles r ON i.receiving_doctor_id = r.id
        WHERE i.id = ${invoiceId}
      `;
      
      console.log('Invoice data loaded:', result[0]);
      
      return result[0];
    },
    enabled: !!invoiceId && open,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      const result = await sql<InvoiceItem[]>`
        SELECT 
          a.patient_number,
          a.appointment_date,
          ii.amount
        FROM public.invoice_items ii
        JOIN public.appointments a ON ii.appointment_id = a.id
        WHERE ii.invoice_id = ${invoiceId}
        ORDER BY a.appointment_date
      `;
      
      return result;
    },
    enabled: !!invoiceId && open,
  });

  const handlePrint = () => {
    window.print();
  };

  if (loadingInvoice || loadingItems || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Načítavam faktúru...</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Prosím počkajte...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Faktúra {invoice.invoice_number}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Tlačiť
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Content */}
        <div className="space-y-6 p-8 bg-white text-black" id="invoice-content">
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">FAKTÚRA</h1>
            <p className="text-xl text-gray-600 mt-1">{invoice.invoice_number}</p>
          </div>

          {/* Supplier and Customer Info */}
          <div className="grid grid-cols-2 gap-8">
            {/* Supplier (Receiving Doctor - poskytol službu vyšetrenia) */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">DODÁVATEĽ</h2>
              <div className="space-y-1">
                <p className="font-bold text-lg">{invoice.receiving_doctor_name}</p>
                {invoice.receiving_doctor_address && (
                  <p className="text-sm text-gray-700">{invoice.receiving_doctor_address}</p>
                )}
                {invoice.receiving_doctor_ico && (
                  <p className="text-sm text-gray-700">IČO: {invoice.receiving_doctor_ico}</p>
                )}
                {invoice.receiving_doctor_dic && (
                  <p className="text-sm text-gray-700">DIČ: {invoice.receiving_doctor_dic}</p>
                )}
              </div>
            </div>

            {/* Customer (Sending Doctor - platí za službu) */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">ODBERATEĽ</h2>
              <div className="space-y-1">
                <p className="font-bold text-lg">{invoice.sending_doctor_name}</p>
                {invoice.sending_doctor_address && (
                  <p className="text-sm text-gray-700">{invoice.sending_doctor_address}</p>
                )}
                {invoice.sending_doctor_ico && (
                  <p className="text-sm text-gray-700">IČO: {invoice.sending_doctor_ico}</p>
                )}
                {invoice.sending_doctor_dic && (
                  <p className="text-sm text-gray-700">DIČ: {invoice.sending_doctor_dic}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
            <div>
              <p className="text-xs text-gray-500">Dátum vystavenia</p>
              <p className="font-semibold">
                {format(new Date(invoice.issue_date), "d. M. yyyy", { locale: sk })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Počet položiek</p>
              <p className="font-semibold">{invoice.patient_count} pacientov</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Spôsob úhrady</p>
              <p className="font-semibold">Bankový prevod</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">POLOŽKY FAKTÚRY</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-left p-2 text-sm font-semibold">Číslo pacienta</th>
                  <th className="text-left p-2 text-sm font-semibold">Dátum vyšetrenia</th>
                  <th className="text-right p-2 text-sm font-semibold">Suma</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2 text-sm">{item.patient_number}</td>
                    <td className="p-2 text-sm">
                      {format(new Date(item.appointment_date), "d. M. yyyy", { locale: sk })}
                    </td>
                    <td className="p-2 text-sm text-right">{item.amount} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="font-semibold">Celkom k úhrade:</span>
                <span className="text-xl font-bold">{invoice.total_amount} €</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {invoice.receiving_doctor_bank_account && (
            <div className="bg-gray-50 p-4 rounded">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">PLATOBNÉ ÚDAJE</h2>
              <p className="text-sm">
                <span className="font-semibold">Číslo účtu (dodávateľa):</span> {invoice.receiving_doctor_bank_account}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Variabilný symbol:</span> {invoice.invoice_number.replace(/[^0-9]/g, '')}
              </p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="text-sm text-gray-600">
              <p className="font-semibold">Poznámka:</p>
              <p>{invoice.notes}</p>
            </div>
          )}

          {/* Signature */}
          {invoice.receiving_doctor_signature && (
            <div className="flex justify-end mt-8 mb-4">
              <div className="text-center">
                <img 
                  src={invoice.receiving_doctor_signature} 
                  alt="Podpis" 
                  className="max-h-16 mb-2 border-b border-gray-400"
                />
                <p className="text-xs text-gray-600">Podpis dodávateľa</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
            <p>
              {invoice.receiving_doctor_signature 
                ? "Faktúra bola vystavená elektronicky." 
                : "Faktúra bola vystavená elektronicky a je platná bez podpisu."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;

