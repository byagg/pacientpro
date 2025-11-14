import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Check, X, AlertCircle, Upload, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface InvoiceDataSettingsProps {
  userId: string;
  title?: string;
  description?: string;
  borderColor?: string;
}

// Validačná schéma
const invoiceDataSchema = z.object({
  invoice_name: z.string().min(3, "Meno musí mať aspoň 3 znaky").max(200, "Meno je príliš dlhé"),
  invoice_address: z.string().min(10, "Adresa musí mať aspoň 10 znakov").max(500, "Adresa je príliš dlhá"),
  bank_account: z.string()
    .regex(/^SK\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}$/, "Neplatný formát IBAN (SK + 22 číslic)")
    .transform(val => val.replace(/\s/g, '')), // Odstráni medzery
  invoice_ico: z.string()
    .regex(/^\d{8}$/, "IČO musí obsahovať presne 8 číslic")
    .optional()
    .or(z.literal("")),
  invoice_dic: z.string()
    .regex(/^\d{10}$/, "DIČ musí obsahovať presne 10 číslic")
    .optional()
    .or(z.literal("")),
});

const InvoiceDataSettings = ({ 
  userId,
  title = "Fakturačné údaje",
  description = "Údaje pre vystavovanie faktúr",
  borderColor = "border-l-primary"
}: InvoiceDataSettingsProps) => {
  const { data: profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_name: "",
    invoice_address: "",
    bank_account: "",
    invoice_ico: "",
    invoice_dic: "",
    signature_image: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        invoice_name: profile.invoice_name || "",
        invoice_address: profile.invoice_address || "",
        bank_account: profile.bank_account || "",
        invoice_ico: profile.invoice_ico || "",
        invoice_dic: profile.invoice_dic || "",
        signature_image: profile.signature_image || "",
      });
    }
  }, [profile]);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validácia typu súboru
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Neplatný súbor",
        description: "Môžete nahrať len obrázky (JPG, PNG)",
      });
      return;
    }

    // Validácia veľkosti (max 500KB)
    if (file.size > 500 * 1024) {
      toast({
        variant: "destructive",
        title: "Súbor je príliš veľký",
        description: "Maximálna veľkosť podpisu je 500KB",
      });
      return;
    }

    // Konverzia na base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, signature_image: base64 }));
      toast({
        title: "Podpis nahraný",
        description: "Uložte zmeny pre aplikovanie podpisu",
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

  const handleSave = async () => {
    try {
      // Validácia údajov
      const validatedData = invoiceDataSchema.parse(formData);
      
      // Uloženie do databázy (vrátane podpisu)
      const result = await updateProfile.mutateAsync({
        userId,
        updates: {
          ...validatedData,
          signature_image: formData.signature_image || null,
        },
      });
      
      setIsEditing(false);
      setErrors({});
      
      // Aktualizujeme formData z výsledku
      if (result) {
        setFormData({
          invoice_name: result.invoice_name || "",
          invoice_address: result.invoice_address || "",
          bank_account: result.bank_account || "",
          invoice_ico: result.invoice_ico || "",
          invoice_dic: result.invoice_dic || "",
          signature_image: result.signature_image || "",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Spracovanie validačných chýb
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
      } else {
        console.error('Error saving invoice data:', error);
        toast({
          variant: "destructive",
          title: "Chyba",
          description: "Nepodarilo sa uložiť údaje",
        });
      }
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        invoice_name: profile.invoice_name || "",
        invoice_address: profile.invoice_address || "",
        bank_account: profile.bank_account || "",
        invoice_ico: profile.invoice_ico || "",
        invoice_dic: profile.invoice_dic || "",
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  const hasCompleteData = formData.invoice_name && formData.invoice_address && formData.bank_account;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`shadow-card border-l-4 ${borderColor}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>{title}</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="invoice_name">Meno / Názov firmy *</Label>
              <Input
                id="invoice_name"
                value={formData.invoice_name}
                onChange={(e) => {
                  setFormData({ ...formData, invoice_name: e.target.value });
                  if (errors.invoice_name) {
                    const newErrors = { ...errors };
                    delete newErrors.invoice_name;
                    setErrors(newErrors);
                  }
                }}
                placeholder="napr. MUDr. Ján Novák alebo MEDI s.r.o."
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
              <Label htmlFor="invoice_address">Adresa *</Label>
              <Textarea
                id="invoice_address"
                value={formData.invoice_address}
                onChange={(e) => {
                  setFormData({ ...formData, invoice_address: e.target.value });
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
              <Label htmlFor="bank_account">Bankový účet (IBAN) *</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => {
                  // Povoliť max 24 znakov bez medzier alebo 29 s medzerami
                  const value = e.target.value.toUpperCase();
                  const withoutSpaces = value.replace(/\s/g, '');
                  if (withoutSpaces.length <= 24) {
                    setFormData({ ...formData, bank_account: value });
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
                <Label htmlFor="invoice_ico">IČO</Label>
                <Input
                  id="invoice_ico"
                  value={formData.invoice_ico}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setFormData({ ...formData, invoice_ico: value });
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
                <Label htmlFor="invoice_dic">DIČ</Label>
                <Input
                  id="invoice_dic"
                  value={formData.invoice_dic}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, invoice_dic: value });
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
                {formData.signature_image && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, signature_image: "" })}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Odstrániť
                  </Button>
                )}
              </div>
              {formData.signature_image && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Náhľad podpisu:</p>
                  <img 
                    src={formData.signature_image} 
                    alt="Podpis" 
                    className="max-h-20 border rounded"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Odporúčaný formát: JPG/PNG, max. 500KB. Podpis sa zobrazí na faktúre.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="flex-1"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukladám...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Uložiť
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateProfile.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Zrušiť
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 text-sm">
              {formData.invoice_name ? (
                <>
                  <div>
                    <span className="font-semibold">Meno / Názov:</span>
                    <p className="text-muted-foreground">{formData.invoice_name}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Adresa:</span>
                    <p className="text-muted-foreground whitespace-pre-line">{formData.invoice_address}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Bankový účet:</span>
                    <p className="text-muted-foreground">{formData.bank_account || "—"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold">IČO:</span>
                      <p className="text-muted-foreground">{formData.invoice_ico || "—"}</p>
                    </div>
                    <div>
                      <span className="font-semibold">DIČ:</span>
                      <p className="text-muted-foreground">{formData.invoice_dic || "—"}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Zatiaľ nemáte nastavené fakturačné údaje
                </p>
              )}
            </div>

            <Button onClick={() => setIsEditing(true)} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              {formData.invoice_name ? "Upraviť údaje" : "Nastaviť fakturačné údaje"}
            </Button>
          </>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default InvoiceDataSettings;

