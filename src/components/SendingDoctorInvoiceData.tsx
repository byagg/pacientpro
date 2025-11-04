import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, CreditCard, Building2, FileText, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { sql } from "@/integrations/neon/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // Fetch all sending doctors who have sent patients to this receiving doctor
  const { data: sendingDoctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ["sending-doctors-list", receivingDoctorId],
    queryFn: async () => {
      const result = await sql<SendingDoctor[]>`
        SELECT DISTINCT
          p.id,
          p.full_name
        FROM public.profiles p
        INNER JOIN public.appointments a ON a.angiologist_id = p.id
        WHERE a.examined_at IS NOT NULL
          AND (a.examined_by = ${receivingDoctorId} OR a.receiving_doctor_id = ${receivingDoctorId})
        ORDER BY p.full_name
      `;
      return result;
    },
    enabled: !!receivingDoctorId,
  });

  // Fetch profile of selected sending doctor
  const { data: profile, isLoading } = useQuery({
    queryKey: ["sending-doctor-profile", selectedDoctorId],
    queryFn: async () => {
      const result = await sql<DoctorProfile[]>`
        SELECT 
          id,
          full_name,
          email,
          invoice_name,
          invoice_address,
          bank_account,
          invoice_ico,
          invoice_dic
        FROM public.profiles
        WHERE id = ${selectedDoctorId}
      `;
      return result[0] || null;
    },
    enabled: !!selectedDoctorId,
  });

  const hasCompleteData = profile?.invoice_name && profile?.invoice_address && profile?.bank_account;

  return (
    <Card className="shadow-card border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle>Fakturačné údaje odosielateľa</CardTitle>
          </div>
          {hasCompleteData ? (
            <Badge className="bg-green-100 text-green-700">Kompletné</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
              Nekompletné
            </Badge>
          )}
        </div>
        <CardDescription>
          Údaje odosielajúceho lekára pre faktúru (dodávateľ)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  Žiadni lekári
                </SelectItem>
              ) : (
                sendingDoctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {!selectedDoctorId ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Vyberte lekára pre zobrazenie údajov</p>
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
    </Card>
  );
};

export default SendingDoctorInvoiceData;

