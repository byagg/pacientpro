import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PATIENT_FEE } from "@/lib/constants";

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
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          profiles!invoices_receiving_doctor_id_fkey(full_name)
        `)
        .eq('sending_doctor_id', userId)
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching sending invoices:', error);
        throw error;
      }

      return (data || []).map(invoice => ({
        ...invoice,
        receiving_doctor_name: invoice.profiles?.full_name || '',
      })) as InvoiceWithDetails[];
    },
    enabled: !!userId,
  });
};

// Fetch invoices for receiving doctor (incoming invoices)
export const useReceivingInvoices = (userId: string) => {
  return useQuery({
    queryKey: ["invoices-receiving", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          profiles!invoices_sending_doctor_id_fkey(
            full_name,
            invoice_name,
            invoice_address,
            bank_account,
            invoice_ico,
            invoice_dic
          )
        `)
        .eq('receiving_doctor_id', userId)
        .order('issue_date', { ascending: false });

      if (error) {
        console.error('Error fetching receiving invoices:', error);
        throw error;
      }

      return (data || []).map(invoice => ({
        ...invoice,
        sending_doctor_name: invoice.profiles?.full_name || '',
        sending_doctor_invoice_data: {
          name: invoice.profiles?.invoice_name || null,
          address: invoice.profiles?.invoice_address || null,
          bank_account: invoice.profiles?.bank_account || null,
          ico: invoice.profiles?.invoice_ico || null,
          dic: invoice.profiles?.invoice_dic || null,
        }
      })) as InvoiceWithDetails[];
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

      console.log('Creating invoice with data:', {
        sending_doctor_id: data.sending_doctor_id,
        receiving_doctor_id: data.receiving_doctor_id,
        patient_count: data.appointment_ids.length,
        total_amount: data.total_amount,
      });
      
      try {
        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            sending_doctor_id: data.sending_doctor_id,
            receiving_doctor_id: data.receiving_doctor_id,
            total_amount: data.total_amount.toString(),
            patient_count: data.appointment_ids.length,
            notes: data.notes || null,
            status: 'pending',
          })
          .select()
          .single();
        
        if (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
          throw new Error(invoiceError.message);
        }
        
        console.log('Invoice created successfully:', invoice);

        // Create invoice items
        console.log('Creating invoice items for', data.appointment_ids.length, 'appointments...');
        const invoiceItems = data.appointment_ids.map(appointmentId => ({
          invoice_id: invoice.id,
          appointment_id: appointmentId,
          amount: PATIENT_FEE.toString(),
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) {
          console.error('Error creating invoice items:', itemsError);
          throw new Error(`Failed to create invoice items: ${itemsError.message}`);
        }
        
        console.log('All invoice items created successfully');
        return invoice as Invoice;
      } catch (error) {
        console.error('Error in useCreateInvoice mutationFn:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-sending"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-receiving"] });
      queryClient.invalidateQueries({ queryKey: ["issued-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["examined-patients-for-invoice"] });
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
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          appointments(patient_number, appointment_date, notes)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at');

      if (error) {
        console.error('Error fetching invoice items:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        patient_number: item.appointments?.patient_number,
        appointment_date: item.appointments?.appointment_date,
        procedure_type: item.appointments?.notes,
      }));
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
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        console.error('Error marking invoice as paid:', error);
        throw error;
      }

      return data;
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

// Delete invoice
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      console.log('useDeleteInvoice: Starting deletion for invoice:', invoiceId);
      
      try {
        // First delete invoice items (cascading delete)
        console.log('Deleting invoice items...');
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        if (itemsError) {
          console.error('Error deleting invoice items:', itemsError);
          throw new Error(itemsError.message);
        }
        
        // Then delete the invoice
        console.log('Deleting invoice...');
        const { error: invoiceError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', invoiceId);

        if (invoiceError) {
          console.error('Error deleting invoice:', invoiceError);
          throw new Error(invoiceError.message);
        }
        
        console.log('Invoice deleted successfully');
        return invoiceId;
      } catch (error) {
        console.error('Error in useDeleteInvoice mutationFn:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-sending"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-receiving"] });
      queryClient.invalidateQueries({ queryKey: ["issued-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["examined-patients-for-invoice"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-items"] });
      toast({
        title: "Faktúra vymazaná",
        description: "Faktúra bola úspešne odstránená",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa vymazať faktúru",
      });
    },
  });
};
