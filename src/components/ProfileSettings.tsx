import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProfile } from "@/hooks/use-profile";
import { User, Loader2, Save, Upload, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

interface ProfileSettingsProps {
  userId: string;
}

// Validačná schéma
const profileSchema = z.object({
  full_name: z.string().min(3, "Meno musí mať aspoň 3 znaky"),
  ambulance_code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  invoice_name: z.string().nullable().optional(),
  invoice_address: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional().refine(
    (val) => !val || val.length === 0 || /^SK\d{22}$/.test(val.replace(/\s/g, '')),
    { message: "Neplatný formát IBAN (SK + 22 číslic)" }
  ),
  invoice_ico: z.string().nullable().optional().refine(
    (val) => !val || val.length === 0 || /^\d{8}$/.test(val),
    { message: "IČO musí obsahovať presne 8 číslic" }
  ),
  invoice_dic: z.string().nullable().optional().refine(
    (val) => !val || val.length === 0 || /^\d{10}$/.test(val),
    { message: "DIČ musí obsahovať presne 10 číslic" }
  ),
  signature_image: z.string().nullable().optional(),
  vat_payer_status: z.enum(['yes', 'no', 'not_applicable']).nullable().optional(),
});

const ProfileSettings = ({ userId }: ProfileSettingsProps) => {
  const { data: profile, isLoading } = useProfile(userId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ambulanceCode, setAmbulanceCode] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceAddress, setInvoiceAddress] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [invoiceIco, setInvoiceIco] = useState("");
  const [invoiceDic, setInvoiceDic] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [vatPayerStatus, setVatPayerStatus] = useState<'yes' | 'no' | 'not_applicable'>('not_applicable');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInvoiceDataOpen, setIsInvoiceDataOpen] = useState(false);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
      setAmbulanceCode(profile.ambulance_code || "");
      setInvoiceName(profile.invoice_name || "");
      setInvoiceAddress(profile.invoice_address || "");
      setBankAccount(profile.bank_account || "");
      setInvoiceIco(profile.invoice_ico || "");
      setInvoiceDic(profile.invoice_dic || "");
      setSignatureImage(profile.signature_image || "");
      setVatPayerStatus((profile.vat_payer_status as 'yes' | 'no' | 'not_applicable') || 'not_applicable');
    }
  }, [profile]);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Neplatný súbor",
        description: "Môžete nahrať len obrázky (JPG, PNG)",
      });
      return;
    }

    if (file.size > 500 * 1024) {
      toast({
        variant: "destructive",
        title: "Súbor je príliš veľký",
        description: "Maximálna veľkosť podpisu je 500KB",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSignatureImage(base64);
      toast({
        title: "Podpis nahraný",
        description: "Nezabudnite uložiť zmeny",
      });
    };
    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodarilo sa načítať obrázok",
      });
    };
    reader.readAsDataURL(file);
  };

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      console.log('ProfileSettings: Updating profile for userId:', userId);
      console.log('ProfileSettings: Update data:', data);
      
      // Verify current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('ProfileSettings: Current auth user:', currentUser?.id);
      console.log('ProfileSettings: userId matches auth.uid():', currentUser?.id === userId);
      
      if (currentUser?.id !== userId) {
        const error = new Error('User ID mismatch. Cannot update profile.');
        console.error('ProfileSettings: User ID mismatch!', {
          userId,
          authUserId: currentUser?.id
        });
        throw error;
      }
      
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select('id, email, full_name, address, phone, bank_account, ambulance_code, invoice_name, invoice_address, invoice_ico, invoice_dic, signature_image, vat_payer_status, created_at, updated_at')
        .maybeSingle(); // Use maybeSingle() to handle missing profiles gracefully

      if (error) {
        console.error('ProfileSettings: Update error:', error);
        console.error('ProfileSettings: Error code:', error.code);
        console.error('ProfileSettings: Error message:', error.message);
        console.error('ProfileSettings: Error details:', error.details);
        console.error('ProfileSettings: Error hint:', error.hint);
        
        // More specific error message
        let errorMessage = error.message || 'Nepodarilo sa aktualizovať profil.';
        if (error.code === '42501') {
          errorMessage = 'Nemáte oprávnenie na úpravu tohto profilu. Skontrolujte RLS policies.';
        } else if (error.code === 'PGRST116') {
          errorMessage = 'Profil nebol nájdený alebo sa nezmenil.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('ProfileSettings: Update successful:', updated);
      return updated;
    },
    onSuccess: async (updated) => {
      console.log('ProfileSettings: onSuccess - updated data:', updated);
      
      // Update local state immediately from updated response
      if (updated) {
        setFullName(updated.full_name || "");
        setAddress(updated.address || "");
        setPhone(updated.phone || "");
        setAmbulanceCode(updated.ambulance_code || "");
        setInvoiceName(updated.invoice_name || "");
        setInvoiceAddress(updated.invoice_address || "");
        setBankAccount(updated.bank_account || "");
        setInvoiceIco(updated.invoice_ico || "");
        setInvoiceDic(updated.invoice_dic || "");
        setSignatureImage(updated.signature_image || "");
        setVatPayerStatus((updated.vat_payer_status as 'yes' | 'no' | 'not_applicable') || 'not_applicable');
        console.log('ProfileSettings: Local state updated from response');
      }
      
      // Invalidate and refetch profile immediately
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      await queryClient.refetchQueries({ queryKey: ["profile", userId] });
      
      // Invalidate and refetch available slots to refresh doctor names
      // This ensures that when a receiving doctor changes their name,
      // it updates in the slot selection for sending doctors
      await queryClient.invalidateQueries({ queryKey: ["available-slots"] });
      await queryClient.refetchQueries({ queryKey: ["available-slots"] });
      
      // Invalidate and refetch appointments to refresh receiving_doctor_name in appointment lists
      // This ensures that when a receiving doctor changes their name,
      // it updates in all appointment lists for sending doctors
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.refetchQueries({ queryKey: ["appointments"] });
      
      // Invalidate and refetch invoices to refresh doctor names in invoice lists
      // This ensures that when a doctor changes their name,
      // it updates in all invoice lists
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["invoices-sending"] });
      await queryClient.invalidateQueries({ queryKey: ["invoices-receiving"] });
      await queryClient.refetchQueries({ queryKey: ["invoices"] });
      await queryClient.refetchQueries({ queryKey: ["invoices-sending"] });
      await queryClient.refetchQueries({ queryKey: ["invoices-receiving"] });
      
      toast({
        title: "Profil aktualizovaný",
        description: updated?.ambulance_code 
          ? `Vaše údaje boli uložené. Nový kód ambulancie: ${updated.ambulance_code}`
          : "Vaše údaje boli úspešne uložené. Mená lekárov sa aktualizujú...",
      });
      setErrors({});
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: error.message || "Nepodarilo sa aktualizovať profil.",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const formData = {
        full_name: fullName,
        address: address || null,
        phone: phone || null,
        // Note: ambulance_code is NOT included here - it's auto-generated by database trigger
        invoice_name: invoiceName || null,
        invoice_address: invoiceAddress || null,
        bank_account: bankAccount ? bankAccount.replace(/\s/g, '') : null,
        invoice_ico: invoiceIco || null,
        invoice_dic: invoiceDic || null,
        signature_image: signatureImage || null,
        vat_payer_status: vatPayerStatus,
      };

      // Validácia
      profileSchema.parse(formData);

      await updateProfile.mutateAsync(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: "Skontrolujte správnosť zadaných údajov",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Načítavam profil...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>Môj profil</CardTitle>
        </div>
        <CardDescription>
          Spravujte svoje osobné údaje, kontakt a fakturačné informácie
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fullName">Celé meno *</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="MUDr. Peter Novák"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email nemožno zmeniť
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ambulanceCode">Kód ambulancie</Label>
            <Input
              id="ambulanceCode"
              type="text"
              value={ambulanceCode}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Automaticky generovaný z vášho mena (napr. {fullName ? fullName.split(' ').filter(n => n).slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'AG'})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefónne číslo (voliteľné)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+421 XXX XXX XXX"
              maxLength={20}
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              Kontaktné telefónne číslo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresa (voliteľné)</Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ulica 123, 811 01 Bratislava"
              maxLength={255}
              autoComplete="street-address"
            />
            <p className="text-xs text-muted-foreground">
              Adresa ambulancie alebo pracoviska
            </p>
          </div>

          {/* Fakturačné údaje - collapsible section */}
          <Collapsible open={isInvoiceDataOpen} onOpenChange={setIsInvoiceDataOpen} className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold">Fakturačné údaje</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isInvoiceDataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Zobraziť/Skryť fakturačné údaje</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent>
              <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="invoiceName">Meno / Názov firmy na faktúre (voliteľné)</Label>
                <Input
                  id="invoiceName"
                  type="text"
                  value={invoiceName}
                  onChange={(e) => {
                    setInvoiceName(e.target.value);
                    if (errors.invoice_name) {
                      const newErrors = { ...errors };
                      delete newErrors.invoice_name;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="MUDr. Ján Novák alebo MEDI s.r.o."
                  className={errors.invoice_name ? "border-red-500" : ""}
                />
                {errors.invoice_name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.invoice_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceAddress">Fakturačná adresa (voliteľné)</Label>
                <Textarea
                  id="invoiceAddress"
                  value={invoiceAddress}
                  onChange={(e) => {
                    setInvoiceAddress(e.target.value);
                    if (errors.invoice_address) {
                      const newErrors = { ...errors };
                      delete newErrors.invoice_address;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Ulica 123&#10;811 01 Bratislava"
                  rows={3}
                  className={errors.invoice_address ? "border-red-500" : ""}
                />
                {errors.invoice_address && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.invoice_address}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bankový účet (IBAN) (voliteľné)</Label>
                <Input
                  id="bankAccount"
                  value={bankAccount}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    const withoutSpaces = value.replace(/\s/g, '');
                    if (withoutSpaces.length <= 24) {
                      setBankAccount(value);
                      if (errors.bank_account) {
                        const newErrors = { ...errors };
                        delete newErrors.bank_account;
                        setErrors(newErrors);
                      }
                    }
                  }}
                  placeholder="SK31 1200 0000 1987 4263 7541"
                  maxLength={29}
                  className={errors.bank_account ? "border-red-500" : ""}
                />
                {errors.bank_account && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.bank_account}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Formát: SK + 22 číslic (medzery sú voliteľné)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceIco">IČO (voliteľné)</Label>
                  <Input
                    id="invoiceIco"
                    value={invoiceIco}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setInvoiceIco(value);
                      if (errors.invoice_ico) {
                        const newErrors = { ...errors };
                        delete newErrors.invoice_ico;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="12345678"
                    maxLength={8}
                    className={errors.invoice_ico ? "border-red-500" : ""}
                  />
                  {errors.invoice_ico && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.invoice_ico}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">8 číslic</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceDic">DIČ</Label>
                  <Input
                    id="invoiceDic"
                    value={invoiceDic}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setInvoiceDic(value);
                      if (errors.invoice_dic) {
                        const newErrors = { ...errors };
                        delete newErrors.invoice_dic;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="1234567890"
                    maxLength={10}
                    className={errors.invoice_dic ? "border-red-500" : ""}
                  />
                  {errors.invoice_dic && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.invoice_dic}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">10 číslic</p>
                </div>
              </div>

              {/* Platca DPH */}
              <div className="space-y-2 border-t pt-2 mt-2">
                <Label htmlFor="vatPayerStatus">Platca DPH</Label>
                <Select value={vatPayerStatus} onValueChange={(value: 'yes' | 'no' | 'not_applicable') => setVatPayerStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Áno - Platca DPH</SelectItem>
                    <SelectItem value="no">Nie - Nie platca DPH</SelectItem>
                    <SelectItem value="not_applicable">Neaplikovateľné</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Tento údaj sa zobrazí na faktúre</p>
              </div>

              {/* Podpis na faktúru */}
              <div className="space-y-2 border-t pt-2 mt-2">
                <Label>Podpis na faktúru</Label>
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Nahrať podpis
                  </Button>
                  {signatureImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSignatureImage("")}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Odstrániť
                    </Button>
                  )}
                </div>
                {signatureImage && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Náhľad podpisu:</p>
                    <img 
                      src={signatureImage} 
                      alt="Podpis" 
                      className="max-h-20 border rounded"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Odporúčaný formát: JPG/PNG, max. 500KB. Podpis sa zobrazí na faktúre.
                </p>
              </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="pt-3 border-t mt-3">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="w-full md:w-auto"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukladám...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Uložiť zmeny
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;

