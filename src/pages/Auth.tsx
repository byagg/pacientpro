import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, Eye, EyeOff } from "lucide-react";
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
  const [userType, setUserType] = useState<'sending' | 'receiving'>('sending');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const session = auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
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

        // SECURITY: Don't pass userType to signIn - it's always taken from database
        await auth.signIn(parsedEmail, parsedPassword);

        toast({
          title: "Prihlásenie úspešné",
          description: "Vitajte späť!",
        });
        
        navigate("/dashboard");
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

        await auth.signUp(parsedEmail, parsedPassword, parsedFullName, userType);

        toast({
          title: "Registrácia úspešná",
          description: "Váš účet bol vytvorený. Môžete sa prihlásiť.",
        });
        
        setIsLogin(true);
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
            {/* SECURITY: Only show user type selector during registration, not login */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="userType">Typ používateľa *</Label>
                <Select value={userType} onValueChange={(value: 'sending' | 'receiving') => setUserType(value)} required>
                  <SelectTrigger id="userType">
                    <SelectValue placeholder="Vyberte typ používateľa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sending">Odosielajúci lekár</SelectItem>
                    <SelectItem value="receiving">Prijímajúci lekár</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Celé meno</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ing. Peter Novák"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
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
                autoComplete="email"
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  maxLength={100}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
