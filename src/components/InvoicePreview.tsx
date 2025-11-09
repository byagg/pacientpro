import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { format, addDays } from "date-fns";
import { sk } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDoctorName } from "@/lib/utils-doctors";
import html2pdf from "html2pdf.js";

// Function to convert number to Slovak words
const numberToWords = (num: number): string => {
  if (num === 0) return "nula";
  
  const ones = ["", "jeden", "dva", "tri", "štyri", "päť", "šesť", "sedem", "osem", "deväť"];
  const teens = ["desať", "jedenásť", "dvanásť", "trinásť", "štrnásť", "pätnásť", "šestnásť", "sedemnásť", "osemnásť", "devätnásť"];
  const tens = ["", "", "dvadsať", "tridsať", "štyridsať", "päťdesiat", "šesťdesiat", "sedemdesiat", "osemdesiat", "deväťdesiat"];
  const hundreds = ["", "sto", "dvesto", "tristo", "štyristo", "päťsto", "šesťsto", "sedemsto", "osemsto", "deväťsto"];
  const thousands = ["", "tisíc", "tisíc", "tisíc"];
  
  const convertHundreds = (n: number): string => {
    if (n === 0) return "";
    
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    
    if (h > 0) result += hundreds[h];
    
    if (t === 1) {
      result += (result ? "" : "") + teens[o];
    } else {
      if (t > 0) result += (result ? "" : "") + tens[t];
      if (o > 0) result += (result ? "" : "") + ones[o];
    }
    
    return result;
  };
  
  const intPart = Math.floor(num);
  const th = Math.floor(intPart / 1000);
  const hund = intPart % 1000;
  
  let result = "";
  
  if (th > 0) {
    if (th === 1) {
      result = "tisíc";
    } else if (th < 5) {
      result = convertHundreds(th) + "tisíc";
    } else {
      result = convertHundreds(th) + "tisíc";
    }
  }
  
  if (hund > 0) {
    result += convertHundreds(hund);
  }
  
  return result || "nula";
};

const amountToWords = (amount: string): string => {
  const num = parseFloat(amount);
  const euros = Math.floor(num);
  const cents = Math.round((num - euros) * 100);
  
  let result = numberToWords(euros) + " eur";
  if (cents > 0) {
    result += " a " + numberToWords(cents) + " " + (cents === 1 ? "cent" : cents < 5 ? "centy" : "centov");
  }
  
  return result;
};

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
  sending_doctor_vat_payer: string | null;
  
  // Receiving doctor (prijímajúci lekár - DODÁVATEĽ, poskytol službu vyšetrenia)
  receiving_doctor_name: string | null;
  receiving_doctor_address: string | null;
  receiving_doctor_ico: string | null;
  receiving_doctor_dic: string | null;
  receiving_doctor_bank_account: string | null; // IBAN dodávateľa (kam platiť)
  receiving_doctor_signature: string | null; // Podpis dodávateľa
  receiving_doctor_vat_payer: string | null;
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
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          status,
          total_amount,
          patient_count,
          notes,
          sending_doctor_id,
          receiving_doctor_id,
          sending_doctor:profiles!invoices_sending_doctor_id_fkey(
            full_name,
            invoice_name,
            invoice_address,
            invoice_ico,
            invoice_dic,
            bank_account,
            signature_image,
            vat_payer_status
          ),
          receiving_doctor:profiles!invoices_receiving_doctor_id_fkey(
            full_name,
            invoice_name,
            invoice_address,
            invoice_ico,
            invoice_dic,
            bank_account,
            signature_image,
            vat_payer_status
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error('Error loading invoice:', error);
        throw error;
      }

      const result = {
        ...data,
        sending_doctor_name: data.sending_doctor?.invoice_name || data.sending_doctor?.full_name,
        sending_doctor_address: data.sending_doctor?.invoice_address,
        sending_doctor_ico: data.sending_doctor?.invoice_ico,
        sending_doctor_dic: data.sending_doctor?.invoice_dic,
        sending_doctor_bank_account: data.sending_doctor?.bank_account,
        sending_doctor_signature: data.sending_doctor?.signature_image,
        sending_doctor_vat_payer: data.sending_doctor?.vat_payer_status,
        receiving_doctor_name: data.receiving_doctor?.invoice_name || data.receiving_doctor?.full_name,
        receiving_doctor_address: data.receiving_doctor?.invoice_address,
        receiving_doctor_ico: data.receiving_doctor?.invoice_ico,
        receiving_doctor_dic: data.receiving_doctor?.invoice_dic,
        receiving_doctor_bank_account: data.receiving_doctor?.bank_account,
        receiving_doctor_signature: data.receiving_doctor?.signature_image,
        receiving_doctor_vat_payer: data.receiving_doctor?.vat_payer_status,
      };
      
      console.log('Invoice data loaded:', result);
      
      return result;
    },
    enabled: !!invoiceId && open,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          amount,
          appointments(patient_number, appointment_date)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at');

      if (error) {
        console.error('Error loading invoice items:', error);
        throw error;
      }

      return (data || []).map(item => ({
        patient_number: item.appointments?.patient_number || '',
        appointment_date: item.appointments?.appointment_date || '',
        amount: item.amount,
      })) as InvoiceItem[];
    },
    enabled: !!invoiceId && open,
  });

  const handleDownloadPDF = () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    const opt = {
      margin: [8, 8, 8, 8], // mm
      filename: `${invoice?.invoice_number || 'faktura'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
      },
    };

    html2pdf().set(opt).from(element).save();
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
            margin: 0.8cm;
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
            padding: 0 !important;
            margin: 0 !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
          #invoice-content h1 {
            font-size: 16px !important;
            margin-bottom: 4px !important;
          }
          #invoice-content h2 {
            font-size: 9px !important;
            margin-bottom: 2px !important;
          }
          #invoice-content table {
            font-size: 9px !important;
            margin-bottom: 4px !important;
          }
          #invoice-content table th,
          #invoice-content table td {
            padding: 2px 4px !important;
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
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Stiahnuť PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Invoice Content - Compact for A4 */}
        <div className="space-y-2 p-4 bg-white text-black print:p-3 print:space-y-1" id="invoice-content" style={{ fontSize: '10px' }}>
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-1.5 mb-2 print:pb-1 print:mb-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-900 print:text-lg">FAKTÚRA</h1>
                <p className="text-xs text-gray-600 mt-0.5 print:text-[10px]">{invoice.invoice_number}</p>
              </div>
            </div>
          </div>

          {/* Supplier and Customer Info - Compact */}
          <div className="grid grid-cols-2 gap-3 mb-2 print:gap-2 print:mb-1">
            {/* Supplier (Receiving Doctor) */}
            <div className="border-r border-gray-200 pr-3 print:pr-2">
              <h2 className="text-[10px] font-semibold text-gray-500 mb-0.5 print:text-[9px]">DODÁVATEĽ</h2>
              <div className="space-y-0 text-[10px] print:text-[9px] leading-tight">
                <p className="font-bold">{formatDoctorName(invoice.receiving_doctor_name)}</p>
                {invoice.receiving_doctor_address && (
                  <p className="text-gray-700 whitespace-pre-line leading-tight">{invoice.receiving_doctor_address}</p>
                )}
                <div className="flex gap-2 mt-0.5 print:gap-1">
                  {invoice.receiving_doctor_ico && (
                    <span className="text-gray-700">IČO: {invoice.receiving_doctor_ico}</span>
                  )}
                  {invoice.receiving_doctor_dic && (
                    <span className="text-gray-700">DIČ: {invoice.receiving_doctor_dic}</span>
                  )}
                </div>
                {invoice.receiving_doctor_vat_payer && (
                  <p className="text-gray-700 mt-0.5">
                    {invoice.receiving_doctor_vat_payer === 'yes' ? 'Platca DPH' : invoice.receiving_doctor_vat_payer === 'no' ? 'Nie platca DPH' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Customer (Sending Doctor) */}
            <div className="pl-3 print:pl-2">
              <h2 className="text-[10px] font-semibold text-gray-500 mb-0.5 print:text-[9px]">ODBERATEĽ</h2>
              {!invoice.sending_doctor_name ? (
                <p className="text-[10px] text-yellow-600 print:text-[9px]">⚠️ Chýbajú údaje</p>
              ) : (
                <div className="space-y-0 text-[10px] print:text-[9px] leading-tight">
                  <p className="font-bold">{formatDoctorName(invoice.sending_doctor_name)}</p>
                  {invoice.sending_doctor_address && (
                    <p className="text-gray-700 whitespace-pre-line leading-tight">{invoice.sending_doctor_address}</p>
                  )}
                  <div className="flex gap-2 mt-0.5 print:gap-1">
                    {invoice.sending_doctor_ico && (
                      <span className="text-gray-700">IČO: {invoice.sending_doctor_ico}</span>
                    )}
                    {invoice.sending_doctor_dic && (
                      <span className="text-gray-700">DIČ: {invoice.sending_doctor_dic}</span>
                    )}
                  </div>
                  {invoice.sending_doctor_vat_payer && (
                    <p className="text-gray-700 mt-0.5">
                      {invoice.sending_doctor_vat_payer === 'yes' ? 'Platca DPH' : invoice.sending_doctor_vat_payer === 'no' ? 'Nie platca DPH' : ''}
                    </p>
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
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded mb-2 print:p-1 print:gap-1 print:mb-1">
                <div>
                  <p className="text-[9px] text-gray-500 print:text-[8px]">Dátum vystavenia</p>
                  <p className="text-[10px] font-semibold print:text-[9px]">
                    {format(issueDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 print:text-[8px]">Dátum dodania</p>
                  <p className="text-[10px] font-semibold print:text-[9px]">
                    {format(deliveryDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 print:text-[8px]">Dátum splatnosti</p>
                  <p className="text-[10px] font-semibold print:text-[9px]">
                    {format(dueDate, "d. M. yyyy", { locale: sk })}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Items Table - Compact */}
          <div className="mb-2 print:mb-1">
            <h2 className="text-[10px] font-semibold text-gray-700 mb-1 print:text-[9px] print:mb-0.5">POLOŽKY FAKTÚRY</h2>
            <table className="w-full border-collapse text-[10px] print:text-[9px]">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="text-left p-1 font-semibold print:p-0.5">Číslo pacienta</th>
                  <th className="text-left p-1 font-semibold print:p-0.5">Dátum vyšetrenia</th>
                  <th className="text-right p-1 font-semibold print:p-0.5">Suma</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-1 print:p-0.5">{item.patient_number}</td>
                    <td className="p-1 print:p-0.5">
                      {format(new Date(item.appointment_date), "d. M. yyyy", { locale: sk })}
                    </td>
                    <td className="p-1 text-right print:p-0.5">{item.amount} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total - Compact */}
          <div className="flex justify-end mb-2 print:mb-1">
            <div className="w-full max-w-md print:max-w-sm">
              <div className="flex justify-between py-1 border-t-2 border-gray-400 print:py-0.5">
                <span className="text-xs font-semibold print:text-[10px]">Celkom k úhrade:</span>
                <span className="text-base font-bold print:text-sm">{invoice.total_amount} €</span>
              </div>
              <div className="text-[9px] text-gray-600 text-right mt-0.5 italic print:text-[8px]">
                Slovom: {amountToWords(invoice.total_amount)}
              </div>
            </div>
          </div>

          {/* Signatures - Compact */}
          {(invoice.receiving_doctor_signature || invoice.sending_doctor_signature) && (
            <div className="flex justify-end gap-8 mt-2 mb-1 print:mt-1.5 print:mb-0.5 print:gap-4">
              {/* Receiving Doctor Signature (Dodávateľ) */}
              {invoice.receiving_doctor_signature && (
                <div className="text-center">
                  <img 
                    src={invoice.receiving_doctor_signature} 
                    alt="Podpis dodávateľa" 
                    className="max-h-10 mb-0.5 mx-auto border-b border-gray-400 print:max-h-8"
                  />
                  <p className="text-[9px] text-gray-600 print:text-[8px]">Podpis dodávateľa</p>
                </div>
              )}
              
              {/* Sending Doctor Signature (Odberateľ) */}
              {invoice.sending_doctor_signature && (
                <div className="text-center">
                  <img 
                    src={invoice.sending_doctor_signature} 
                    alt="Podpis odberateľa" 
                    className="max-h-10 mb-0.5 mx-auto border-b border-gray-400 print:max-h-8"
                  />
                  <p className="text-[9px] text-gray-600 print:text-[8px]">Podpis odberateľa</p>
                </div>
              )}
            </div>
          )}

          {/* Footer - Compact */}
          <div className="text-[9px] text-gray-500 text-center pt-1 border-t border-gray-200 print:text-[8px] print:pt-0.5">
            <p>
              {invoice.receiving_doctor_signature || invoice.sending_doctor_signature
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

