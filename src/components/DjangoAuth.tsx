import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { djangoAPI } from "@/lib/django-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Používateľské meno je povinné"),
  password: z.string().min(1, "Heslo je povinné"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Používateľské meno musí mať minimálne 3 znaky"),
  email: z.string().email("Neplatná emailová adresa"),
  password: z.string().min(8, "Heslo musí mať minimálne 8 znakov"),
  password_confirm: z.string(),
  first_name: z.string().min(1, "Meno je povinné"),
  last_name: z.string().min(1, "Priezvisko je povinné"),
}).refine((data) => data.password === data.password_confirm, {
  message: "Heslá sa nezhodujú",
  path: ["password_confirm"],
});

export const DjangoAuth = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // Register form state  
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = loginSchema.parse(loginData);
      const response = await djangoAPI.login(validatedData);

      toast({
        title: "Prihlásenie úspešné",
        description: `Vitajte, ${response.user.first_name}!`,
      });

      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Chyba prihlásenia",
          description: error instanceof Error ? error.message : "Neznáma chyba",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = registerSchema.parse(registerData);
      const response = await djangoAPI.register(validatedData);

      toast({
        title: "Registrácia úspešná",
        description: `Účet pre ${response.user.first_name} ${response.user.last_name} bol vytvorený!`,
      });

      // Automatically switch to login tab or redirect to dashboard
      setActiveTab("login");
      setRegisterData({
        username: "",
        email: "",
        password: "",
        password_confirm: "",
        first_name: "",
        last_name: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Chyba validácie",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Chyba registrácie",
          description: error instanceof Error ? error.message : "Neznáma chyba",
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
            Django Auth System
          </CardTitle>
          <CardDescription>
            Prihlásenie cez Django REST API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("login")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "login"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Prihlásenie
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "register"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Registrácia
              </button>
            </div>

            {activeTab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Používateľské meno</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="john_doe"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Heslo</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Prihlasujem...
                    </>
                  ) : (
                    "Prihlásiť sa"
                  )}
                </Button>
              </form>
            )}

            {activeTab === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Meno</Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="Ján"
                      value={registerData.first_name}
                      onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Priezvisko</Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Novák"
                      value={registerData.last_name}
                      onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg_username">Používateľské meno</Label>
                  <Input
                    id="reg_username"
                    type="text"
                    placeholder="jan_novak"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jan@priklad.sk"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg_password">Heslo</Label>
                  <Input
                    id="reg_password"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirm">Potvrdiť heslo</Label>
                  <Input
                    id="password_confirm"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password_confirm}
                    onChange={(e) => setRegisterData({ ...registerData, password_confirm: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrujem...
                    </>
                  ) : (
                    "Registrovať sa"
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};