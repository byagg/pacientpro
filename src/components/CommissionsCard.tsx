import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, CreditCard, Loader2 } from "lucide-react";
import { useCommissions } from "@/hooks/use-commissions";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";

interface CommissionsCardProps {
  userId: string;
}

const CommissionsCard = ({ userId }: CommissionsCardProps) => {
  const { data: commissions = [], isLoading } = useCommissions(userId);
  const { data: profile, isLoading: isLoadingProfile } = useProfile(userId);
  const updateProfile = useUpdateProfile();
  const [bankAccount, setBankAccount] = useState("");
  const [isEditingBankAccount, setIsEditingBankAccount] = useState(false);

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingCommissions = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const paidCommissions = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // Initialize bank account from profile
  useEffect(() => {
    if (profile) {
      setBankAccount(profile.bank_account || "");
    }
  }, [profile]);

  const handleSaveBankAccount = async () => {
    if (!userId) return;
    
    await updateProfile.mutateAsync({
      userId,
      updates: { bank_account: bankAccount.trim() || null },
    });
    setIsEditingBankAccount(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          Načítavam manipulačné poplatky...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>Moje manipulačné poplatky</CardTitle>
        </div>
        <CardDescription>
          Prehľad vašich manipulačných poplatkov za odoslaných pacientov
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové manipulačné poplatky</p>
                <p className="text-3xl font-bold text-primary">
                  {totalCommissions.toFixed(2)} €
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Čakajúce</p>
              <p className="text-xl font-semibold text-warning">
                {pendingCommissions.toFixed(2)} €
              </p>
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Vyplatené</p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                {paidCommissions.toFixed(2)} €
              </p>
            </div>
          </div>

          {commissions.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Zatiaľ nemáte žiadne manipulačné poplatky
            </p>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Nastaviť platobnú bránu</Label>
            </div>
            
            {isEditingBankAccount ? (
              <div className="space-y-2">
                <Label htmlFor="bankAccount" className="text-xs text-muted-foreground">
                  Bankový účet (IBAN)
                </Label>
                <Input
                  id="bankAccount"
                  type="text"
                  placeholder="SK12 3456 7890 1234 5678 9012"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  maxLength={34}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveBankAccount}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Ukladám...
                      </>
                    ) : (
                      "Uložiť"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingBankAccount(false);
                      setBankAccount(profile?.bank_account ?? "");
                    }}
                  >
                    Zrušiť
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bankový účet</p>
                    <p className="text-sm font-mono">
                      {bankAccount || "Nie je nastavený"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingBankAccount(true)}
                  >
                    {bankAccount ? "Zmeniť" : "Pridať"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionsCard;
