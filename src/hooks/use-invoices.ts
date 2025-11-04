import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  invoice_number: string;
  sending_doctor_id: string;
  receiving_doctor_id: string;
  total_amount: string;
  patient_count: number;
  issue_date: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceWithDetails extends Invoice {
  sending_doctor_name: string;
  receiving_doctor_name: string;
  sending_doctor_invoice_data?: {
    name: string | null;
    address: string | null;
    bank_account: string | null;
    ico: string | null;
    dic: string | null;
  };
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  appointment_id: string;
  amount: string;
  created_at: string;
}

export interface CreateInvoiceData {
  sending_doctor_id: string;
  receiving_doctor_id: string;
  appointment_ids: string[];
  total_amount: number;
  notes?: string;
}

// Fetch invoices for sending doctor (outgoing invoices)
export const useSendingInvoices = (userId: string) => {
  return useQuery({
    queryKey: ["invoices-sending", userId],
    queryFn: async () => {
      const invoices = await sql<InvoiceWithDetails[]>`
        SELECT 
          i.*,
          p.full_name as receiving_doctor_name
        FROM public.invoices i
        JOIN public.profiles p ON i.receiving_doctor_id = p.id
        WHERE i.sending_doctor_id = ${userId}
        ORDER BY i.issue_date DESC
      `;
      return invoices;
    },
    enabled: !!userId,
  });
};

// Fetch invoices for receiving doctor (incoming invoices)
export const useReceivingInvoices = (userId: string) => {
  return useQuery({
    queryKey: ["invoices-receiving", userId],
    queryFn: async () => {
      const invoices = await sql<InvoiceWithDetails[]>`
        SELECT 
          i.*,
          p.full_name as sending_doctor_name,
          p.invoice_name,
          p.invoice_address,
          p.bank_account,
          p.invoice_ico,
          p.invoice_dic
        FROM public.invoices i
        JOIN public.profiles p ON i.sending_doctor_id = p.id
        WHERE i.receiving_doctor_id = ${userId}
        ORDER BY i.issue_date DESC
      `;
      
      return invoices.map(inv => ({
        ...inv,
        sending_doctor_invoice_data: {
          name: inv.invoice_name,
          address: inv.invoice_address,
          bank_account: inv.bank_account,
          ico: inv.invoice_ico,
          dic: inv.invoice_dic,
        }
      }));
    },
    enabled: !!userId,
  });
};

// Create invoice
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      // Generate invoice number (format: INV-YYMMDD-XXXX)
      const now = new Date();
      const year = String(now.getFullYear() % 100).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const invoiceNumber = `INV-${year}${month}${day}-${random}`;

      // Create invoice
      const [invoice] = await sql<Invoice[]>`
        INSERT INTO public.invoices (
          invoice_number, 
          sending_doctor_id, 
          receiving_doctor_id, 
          total_amount, 
          patient_count,
          notes,
          status
        )
        VALUES (
          ${invoiceNumber},
          ${data.sending_doctor_id},
          ${data.receiving_doctor_id},
          ${data.total_amount},
          ${data.appointment_ids.length},
          ${data.notes || null},
          'pending'
        )
        RETURNING *
      `;

      // Create invoice items
      for (const appointmentId of data.appointment_ids) {
        await sql`
          INSERT INTO public.invoice_items (invoice_id, appointment_id, amount)
          VALUES (${invoice.id}, ${appointmentId}, 14.00)
        `;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices-sending"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-receiving"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["received-patients"] });
      toast({
        title: "Faktúra vytvorená",
        description: "Faktúra bola úspešne vytvorená",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa vytvoriť faktúru",
      });
    },
  });
};

// Get invoice items (appointments in invoice)
export const useInvoiceItems = (invoiceId: string) => {
  return useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      const items = await sql`
        SELECT 
          ii.*,
          a.patient_number,
          a.appointment_date,
          a.notes as procedure_type
        FROM public.invoice_items ii
        JOIN public.appointments a ON ii.appointment_id = a.id
        WHERE ii.invoice_id = ${invoiceId}
        ORDER BY a.appointment_date
      `;
      return items;
    },
    enabled: !!invoiceId,
  });
};

// Mark invoice as paid
export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const result = await sql`
        UPDATE public.invoices
        SET status = 'paid',
            paid_at = NOW()
        WHERE id = ${invoiceId}
        RETURNING *
      `;
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices-sending"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-receiving"] });
      toast({
        title: "Faktúra uhradená",
        description: "Faktúra bola označená ako uhradená",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa označiť faktúru ako uhradenú",
      });
    },
  });
};

