import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { formatDoctorName } from "@/lib/utils-doctors";

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
  sending_doctor_id: string | null;
  receiving_doctor_id: string | null;
  
  // Sending doctor (odosielajúci lekár - ODBERATEĽ, platí za službu)
  sending_doctor_name: string | null;
  sending_doctor_address: string | null;
  sending_doctor_ico: string | null;
  sending_doctor_dic: string | null;
  sending_doctor_bank_account: string | null;
  sending_doctor_signature: string | null;
  
  // Receiving doctor (prijímajúci lekár - DODÁVATEĽ, poskytol službu vyšetrenia)
  receiving_doctor_name: string | null;
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
          i.sending_doctor_id,
          i.receiving_doctor_id,
          
          COALESCE(s.invoice_name, s.full_name) as sending_doctor_name,
          s.invoice_address as sending_doctor_address,
          s.invoice_ico as sending_doctor_ico,
          s.invoice_dic as sending_doctor_dic,
          s.bank_account as sending_doctor_bank_account,
          s.signature_image as sending_doctor_signature,
          
          COALESCE(r.invoice_name, r.full_name) as receiving_doctor_name,
          r.invoice_address as receiving_doctor_address,
          r.invoice_ico as receiving_doctor_ico,
          r.invoice_dic as receiving_doctor_dic,
          r.bank_account as receiving_doctor_bank_account,
          r.signature_image as receiving_doctor_signature
          
        FROM public.invoices i
        LEFT JOIN public.profiles s ON i.sending_doctor_id = s.id
        LEFT JOIN public.profiles r ON i.receiving_doctor_id = r.id
        WHERE i.id = ${invoiceId}
      `;
      
      console.log('Invoice data loaded:', result[0]);
      console.log('Sending doctor ID:', result[0]?.sending_doctor_id);
      console.log('Sending doctor name:', result[0]?.sending_doctor_name);
      console.log('Sending doctor data:', {
        name: result[0]?.sending_doctor_name,
        address: result[0]?.sending_doctor_address,
        ico: result[0]?.sending_doctor_ico,
        dic: result[0]?.sending_doctor_dic,
        bank: result[0]?.sending_doctor_bank_account
      });
      
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
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
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

        {/* Invoice Content - Compact for A4 */}
        <div className="space-y-3 p-6 bg-white text-black print:p-4" id="invoice-content" style={{ fontSize: '11px' }}>
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-2 mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 print:text-xl">FAKTÚRA</h1>
                <p className="text-sm text-gray-600 mt-0.5 print:text-xs">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          {/* Supplier and Customer Info - Compact */}
          <div className="grid grid-cols-2 gap-4 mb-3 print:gap-3">
            {/* Supplier (Receiving Doctor) */}
            <div className="border-r border-gray-200 pr-4">
              <h2 className="text-xs font-semibold text-gray-500 mb-1 print:text-[10px]">DODÁVATEĽ</h2>
              <div className="space-y-0.5 text-xs print:text-[10px]">
                <p className="font-bold">{formatDoctorName(invoice.receiving_doctor_name)}</p>
                {invoice.receiving_doctor_address && (
                  <p className="text-gray-700 whitespace-pre-line">{invoice.receiving_doctor_address}</p>
                )}
                <div className="flex gap-3 mt-1">
                  {invoice.receiving_doctor_ico && (
                    <span className="text-gray-700">IČO: {invoice.receiving_doctor_ico}</span>
                  )}
                  {invoice.receiving_doctor_dic && (
                    <span className="text-gray-700">DIČ: {invoice.receiving_doctor_dic}</span>
                  )}
                </div>
                {invoice.receiving_doctor_bank_account && (
                  <p className="text-gray-700 mt-1">IBAN: {invoice.receiving_doctor_bank_account}</p>
                )}
              </div>
            </div>

            {/* Customer (Sending Doctor) */}
            <div className="pl-4">
              <h2 className="text-xs font-semibold text-gray-500 mb-1 print:text-[10px]">ODBERATEĽ</h2>
              {!invoice.sending_doctor_name ? (
                <p className="text-xs text-yellow-600">⚠️ Chýbajú údaje</p>
              ) : (
                <div className="space-y-0.5 text-xs print:text-[10px]">
                  <p className="font-bold">{formatDoctorName(invoice.sending_doctor_name)}</p>
                  {invoice.sending_doctor_address && (
                    <p className="text-gray-700 whitespace-pre-line">{invoice.sending_doctor_address}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {invoice.sending_doctor_ico && (
                      <span className="text-gray-700">IČO: {invoice.sending_doctor_ico}</span>
                    )}
                    {invoice.sending_doctor_dic && (
                      <span className="text-gray-700">DIČ: {invoice.sending_doctor_dic}</span>
                    )}
                  </div>
                  {invoice.sending_doctor_bank_account && (
                    <p className="text-gray-700 mt-1">IBAN: {invoice.sending_doctor_bank_account}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dates - Grouped */}
          {(() => {
            const issueDate = new Date(invoice.issue_date);
            const deliveryDate = items.length > 0 ? new Date(items[items.length - 1].appointment_date) : issueDate;
            const dueDate = addDays(issueDate, 14);
            
            return (
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-2 rounded mb-3 print:p-1.5 print:gap-2">
                <div>
                  <p className="text-[10px] text-gray-500 print:text-[9px]">Dátum vystavenia</p>
                  <p className="text-xs font-semibold print:text-[10px]">
                    {format(issueDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 print:text-[9px]">Dátum dodania</p>
                  <p className="text-xs font-semibold print:text-[10px]">
                    {format(deliveryDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 print:text-[9px]">Dátum splatnosti</p>
                  <p className="text-xs font-semibold print:text-[10px]">
                    {format(dueDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Items Table - Compact */}
          <div className="mb-3">
            <h2 className="text-xs font-semibold text-gray-700 mb-1.5 print:text-[10px]">POLOŽKY FAKTÚRY</h2>
            <table className="w-full border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-left p-1.5 font-semibold print:p-1">Číslo pacienta</th>
                  <th className="text-left p-1.5 font-semibold print:p-1">Dátum vyšetrenia</th>
                  <th className="text-right p-1.5 font-semibold print:p-1">Suma</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-1.5 print:p-1">{item.patient_number}</td>
                    <td className="p-1.5 print:p-1">
                      {format(new Date(item.appointment_date), "d. M. yyyy", { locale: sk })}
                    </td>
                    <td className="p-1.5 text-right print:p-1">{item.amount} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total and Payment Details - Compact */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total */}
            <div className="flex justify-end">
              <div className="w-48">
                <div className="flex justify-between py-1.5 border-t-2 border-gray-400">
                  <span className="text-sm font-semibold print:text-xs">Celkom k úhrade:</span>
                  <span className="text-lg font-bold print:text-base">{invoice.total_amount} €</span>
                </div>
              </div>
            </div>

            {/* Payment Details - Compact */}
            {invoice.receiving_doctor_bank_account && (
              <div className="text-xs print:text-[10px]">
                <p className="font-semibold mb-0.5">Platobné údaje:</p>
                <p>IBAN: {invoice.receiving_doctor_bank_account}</p>
                <p>VS: {invoice.invoice_number.replace(/[^0-9]/g, '')}</p>
              </div>
            )}
          </div>

          {/* Signature - Compact */}
          {invoice.receiving_doctor_signature && (
            <div className="flex justify-end mt-4 mb-2 print:mt-3 print:mb-1">
              <div className="text-center">
                <img 
                  src={invoice.receiving_doctor_signature} 
                  alt="Podpis" 
                  className="max-h-12 mb-1 border-b border-gray-400 print:max-h-10"
                />
                <p className="text-[10px] text-gray-600 print:text-[9px]">Podpis dodávateľa</p>
              </div>
            </div>
          )}

          {/* Footer - Compact */}
          <div className="text-[10px] text-gray-500 text-center pt-2 border-t border-gray-200 print:text-[9px] print:pt-1">
            <p>
              {invoice.receiving_doctor_signature 
                ? "Faktúra bola vystavená elektronicky." 
                : "Faktúra bola vystavená elektronicky a je platná bez podpisu."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default InvoicePreview;

