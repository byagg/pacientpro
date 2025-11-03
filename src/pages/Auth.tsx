import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Neplatná emailová adresa").max(255),
  password: z.string().min(6, "Heslo musí mať minimálne 6 znakov").max(100),
});

const registerSchema = loginSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, "Meno musí mať minimálne 2 znaky")
    .max(100),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { email: parsedEmail, password: parsedPassword } = loginSchema.parse({
          email,
          password,
        });

        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail,
          password: parsedPassword,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Nesprávny email alebo heslo");
          }
          throw error;
        }

        toast({
          title: "Prihlásenie úspešné",
          description: "Vitajte späť!",
        });
      } else {
        const {
          email: parsedEmail,
          password: parsedPassword,
          fullName: parsedFullName,
        } = registerSchema.parse({
          email,
          password,
          fullName,
        });

        const redirectUrl = `${window.location.origin}/dashboard`;
        
        const { error } = await supabase.auth.signUp({
          email: parsedEmail,
          password: parsedPassword,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: parsedFullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error("Tento email je už registrovaný");
          }
          throw error;
        }

        toast({
          title: "Registrácia úspešná",
          description: "Váš účet bol vytvorený. Môžete sa prihlásiť.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: error.errors[0].message,
        });
      } else if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Chyba",
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Prihlásenie" : "Registrácia"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Prihláste sa do systému rezervácií"
              : "Vytvorte si nový účet angiológa"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Celé meno</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ing. Peter Novák"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  maxLength={100}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vas.email@priklad.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={100}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Spracovávam...
                </>
              ) : isLogin ? (
                "Prihlásiť sa"
              ) : (
                "Registrovať sa"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? "Ešte nemáte účet? Registrujte sa"
                : "Už máte účet? Prihláste sa"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
