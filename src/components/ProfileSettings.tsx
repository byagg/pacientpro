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
  ambulance_code: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  invoice_name: z.string().optional(),
  invoice_address: z.string().optional(),
  bank_account: z.string()
    .regex(/^(SK\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4})?$/, "Neplatný formát IBAN (SK + 22 číslic)")
    .optional()
    .or(z.literal("")),
  invoice_ico: z.string()
    .regex(/^(\d{8})?$/, "IČO musí obsahovať presne 8 číslic")
    .optional()
    .or(z.literal("")),
  invoice_dic: z.string()
    .regex(/^(\d{10})?$/, "DIČ musí obsahovať presne 10 číslic")
    .optional()
    .or(z.literal("")),
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

          <div className="pt-4">
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

