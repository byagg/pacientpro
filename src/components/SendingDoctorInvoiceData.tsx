import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, CreditCard, Building2, FileText, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDoctorName } from "@/lib/utils-doctors";
import { useNavigate } from "react-router-dom";

interface SendingDoctorInvoiceDataProps {
  receivingDoctorId: string;
}

interface DoctorProfile {
  id: string;
  full_name: string;
  email: string;
  invoice_name: string | null;
  invoice_address: string | null;
  bank_account: string | null;
  invoice_ico: string | null;
  invoice_dic: string | null;
}

interface SendingDoctor {
  id: string;
  full_name: string;
}

const SendingDoctorInvoiceData = ({ receivingDoctorId }: SendingDoctorInvoiceDataProps) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all sending doctors who have sent patients to this receiving doctor
  // Auto-refresh every 30 seconds to get updated list
  const { data: sendingDoctors = [], isLoading: loadingDoctors, error: loadingError } = useQuery({
    queryKey: ["sending-doctors-list", receivingDoctorId],
    queryFn: async () => {
      console.log('Fetching sending doctors for receiving doctor:', receivingDoctorId);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('angiologist_id, profiles!appointments_angiologist_id_fkey(id, full_name)')
        .or(`examined_by.eq.${receivingDoctorId},receiving_doctor_id.eq.${receivingDoctorId}`);

      if (error) {
        console.error('Error fetching sending doctors:', error);
        throw error;
      }

      // Get unique doctors
      const uniqueDoctors = new Map();
      (data || []).forEach(appointment => {
        if (appointment.profiles) {
          uniqueDoctors.set(appointment.profiles.id, {
            id: appointment.profiles.id,
            full_name: appointment.profiles.full_name,
          });
        }
      });

      const result = Array.from(uniqueDoctors.values()).sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
      ) as SendingDoctor[];
      
      console.log('Found sending doctors:', result.length);
      console.log('Sending doctors list:', result);
      
      return result;
    },
    enabled: !!receivingDoctorId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch profile of selected sending doctor
  // Auto-refresh every 15 seconds to get updated invoice data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ["sending-doctor-profile", selectedDoctorId],
    queryFn: async () => {
      console.log('Fetching profile for sending doctor:', selectedDoctorId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, invoice_name, invoice_address, bank_account, invoice_ico, invoice_dic')
        .eq('id', selectedDoctorId)
        .single();

      if (error) {
        console.error('Error fetching doctor profile:', error);
        throw error;
      }
      
      console.log('Profile loaded:', data);
      
      return data || null;
    },
    enabled: !!selectedDoctorId,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const hasCompleteData = profile?.invoice_name && profile?.invoice_address && profile?.bank_account;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Fakturačné údaje odosielateľa</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasCompleteData ? (
                <Badge className="bg-green-100 text-green-700">Kompletné</Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                  Nekompletné
                </Badge>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription>
            Údaje odosielajúceho lekára pre faktúru (dodávateľ)
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {/* Error message */}
        {loadingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-semibold">❌ Chyba pri načítavaní lekárov</p>
            <p className="text-xs text-red-700 mt-1">
              {loadingError instanceof Error ? loadingError.message : 'Nepodarilo sa načítať zoznam lekárov'}
            </p>
          </div>
        )}
        
        {/* Doctor selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vyberte odosielajúceho lekára</label>
          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte lekára..." />
            </SelectTrigger>
            <SelectContent>
              {loadingDoctors ? (
                <SelectItem value="loading" disabled>
                  Načítavam...
                </SelectItem>
              ) : sendingDoctors.length === 0 ? (
                <SelectItem value="empty" disabled>
                  {loadingError ? 'Chyba pri načítavaní' : 'Žiadni lekári'}
                </SelectItem>
              ) : (
                sendingDoctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {formatDoctorName(doctor.full_name)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {!loadingError && sendingDoctors.length === 0 && !loadingDoctors && (
            <p className="text-xs text-muted-foreground">
              💡 Odosielajúci lekári sa zobrazia po tom, čo k vám niekto odošle pacienta.
            </p>
          )}
        </div>

        {/* Action button to create invoice - always visible */}
        <div className="border-t pt-4 mt-4">
          <Button
            type="button"
            onClick={() => {
              console.log('Creating invoice for doctor:', selectedDoctorId);
              // Scroll to the invoice creator section
              const invoiceCreator = document.querySelector('[data-invoice-creator]');
              console.log('Invoice creator element found:', !!invoiceCreator);
              
              if (invoiceCreator) {
                invoiceCreator.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Small delay to ensure scroll completes
                setTimeout(() => {
                  // Dispatch custom event to set the doctor filter
                  console.log('Dispatching set-doctor-filter event with doctorId:', selectedDoctorId);
                  window.dispatchEvent(new CustomEvent('set-doctor-filter', { 
                    detail: { doctorId: selectedDoctorId } 
                  }));
                }, 500);
              } else {
                console.error('Invoice creator section not found!');
                alert('Sekcia vytvorenia faktúry nebola nájdená. Prosím, skrolujte manuálne nižšie.');
              }
            }}
            className="w-full gap-2"
            variant="default"
            disabled={!selectedDoctorId}
          >
            <Plus className="h-4 w-4" />
            Vytvoriť faktúru pre tohto lekára
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {!selectedDoctorId 
              ? "Najprv vyberte lekára z dropdownu vyššie" 
              : "Prejde na sekciu vytvorenia faktúry nižšie"}
          </p>
        </div>

        {!selectedDoctorId ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Vyberte lekára pre zobrazenie údajov</p>
          </div>
        ) : profileError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-semibold">❌ Chyba pri načítavaní profilu</p>
            <p className="text-xs text-red-700 mt-1">
              {profileError instanceof Error ? profileError.message : 'Nepodarilo sa načítať profil lekára'}
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Načítavam údaje...</p>
          </div>
        ) : !profile ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Lekár nebol nájdený</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Meno / Názov</p>
                <p className="text-base font-semibold">
                  {profile.invoice_name || profile.full_name || "—"}
                </p>
              </div>
            </div>

            {profile.invoice_address && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Adresa</p>
                  <p className="text-base">{profile.invoice_address}</p>
                </div>
              </div>
            )}

            {profile.bank_account && (
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">IBAN</p>
                  <p className="text-base font-mono">{profile.bank_account}</p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {profile.invoice_ico && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">IČO</p>
                    <p className="text-base font-mono">{profile.invoice_ico}</p>
                  </div>
                </div>
              )}

              {profile.invoice_dic && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">DIČ</p>
                    <p className="text-base font-mono">{profile.invoice_dic}</p>
                  </div>
                </div>
              )}
            </div>

            {!hasCompleteData && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Odosielajúci lekár ešte nevyplnil všetky fakturačné údaje.
                </p>
              </div>
            )}
          </div>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default SendingDoctorInvoiceData;

