import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-profile";
import { User, Loader2, Save, Upload, X, AlertCircle } from "lucide-react";
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast({
        title: "Profil aktualizovaný",
        description: "Vaše údaje boli úspešne uložené.",
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
        ambulance_code: ambulanceCode || null,
        invoice_name: invoiceName || null,
        invoice_address: invoiceAddress || null,
        bank_account: bankAccount ? bankAccount.replace(/\s/g, '') : null,
        invoice_ico: invoiceIco || null,
        invoice_dic: invoiceDic || null,
        signature_image: signatureImage || null,
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
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              onChange={(e) => setAmbulanceCode(e.target.value)}
              placeholder="AG"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Používa sa v číslach pacientov (napr. AG-251109-1230)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefónne číslo</Label>
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
            <Label htmlFor="address">Adresa</Label>
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

          {/* Fakturačné údaje - separator */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Fakturačné údaje</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceName">Meno / Názov firmy na faktúre</Label>
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
                <Label htmlFor="invoiceAddress">Fakturačná adresa</Label>
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
                <Label htmlFor="bankAccount">Bankový účet (IBAN)</Label>
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
                  <Label htmlFor="invoiceIco">IČO</Label>
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

              {/* Podpis na faktúru */}
              <div className="space-y-2 border-t pt-4">
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
          </div>

          <div className="pt-4 border-t">
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

