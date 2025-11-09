import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-profile";
import { User, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ProfileSettingsProps {
  userId: string;
}

const ProfileSettings = ({ userId }: ProfileSettingsProps) => {
  const { data: profile, isLoading } = useProfile(userId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ambulanceCode, setAmbulanceCode] = useState("");

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
      setAmbulanceCode(profile.ambulance_code || "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: {
      full_name?: string;
      address?: string;
      phone?: string;
      ambulance_code?: string;
    }) => {
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

    await updateProfile.mutateAsync({
      full_name: fullName,
      address: address,
      phone: phone,
      ambulance_code: ambulanceCode,
    });
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
          Spravujte svoje osobné údaje a nastavenia účtu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

