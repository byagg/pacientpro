import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Check, X } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";

interface InvoiceDataSettingsProps {
  userId: string;
}

const InvoiceDataSettings = ({ userId }: InvoiceDataSettingsProps) => {
  const { data: profile, isLoading } = useProfile(userId);
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    invoice_name: "",
    invoice_address: "",
    bank_account: "",
    invoice_ico: "",
    invoice_dic: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        invoice_name: profile.invoice_name || "",
        invoice_address: profile.invoice_address || "",
        bank_account: profile.bank_account || "",
        invoice_ico: profile.invoice_ico || "",
        invoice_dic: profile.invoice_dic || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      userId,
      updates: formData,
    });
    setIsEditing(false);
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

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Fakturačné údaje</CardTitle>
        </div>
        <CardDescription>
          Údaje pre vystavovanie faktúr
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="invoice_name">Meno / Názov firmy *</Label>
              <Input
                id="invoice_name"
                value={formData.invoice_name}
                onChange={(e) => setFormData({ ...formData, invoice_name: e.target.value })}
                placeholder="napr. MUDr. Ján Novák alebo MEDI s.r.o."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_address">Adresa *</Label>
              <Textarea
                id="invoice_address"
                value={formData.invoice_address}
                onChange={(e) => setFormData({ ...formData, invoice_address: e.target.value })}
                placeholder="Ulica 123&#10;811 01 Bratislava"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_account">Bankový účet (IBAN) *</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder="SK31 1200 0000 1987 4263 7541"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_ico">IČO</Label>
                <Input
                  id="invoice_ico"
                  value={formData.invoice_ico}
                  onChange={(e) => setFormData({ ...formData, invoice_ico: e.target.value })}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice_dic">DIČ</Label>
                <Input
                  id="invoice_dic"
                  value={formData.invoice_dic}
                  onChange={(e) => setFormData({ ...formData, invoice_dic: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
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
    </Card>
  );
};

export default InvoiceDataSettings;

