import { useState, useEffect } from "react";
import { djangoAPI, DjangoUser } from "@/lib/django-api";
import { DjangoAuth } from "@/components/DjangoAuth";
import { StripePayment } from "@/components/StripePayment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, CreditCard, CheckCircle } from "lucide-react";

export default function DjangoDemo() {
  const [user, setUser] = useState<DjangoUser | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const existingUser = djangoAPI.getUser();
    const token = djangoAPI.getAccessToken();
    
    if (existingUser && token) {
      setUser(existingUser);
    }
  }, []);

  const handleLogout = () => {
    djangoAPI.logout();
    setUser(null);
    setShowPayment(false);
    setPaymentSuccess(null);
    toast({
      title: "Odhlásenie úspešné",
      description: "Boli ste úspešne odhlásení.",
    });
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setPaymentSuccess(paymentIntentId);
    setShowPayment(false);
    toast({
      title: "Platba úspešná! 🎉",
      description: `Payment Intent: ${paymentIntentId}`,
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Platba zlyhala",
      description: error,
    });
  };

  // Show auth component if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Django + React Integration Demo</h1>
            <p className="text-muted-foreground">
              Testovacia stránka pre Django REST API s autentifikáciou a platbami
            </p>
          </div>
          <div className="flex justify-center">
            <DjangoAuth />
          </div>
        </div>
      </div>
    );
  }

  // Show main dashboard if logged in
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Django Demo Dashboard</h1>
            <p className="text-muted-foreground">
              Úspešne pripojený k Django REST API
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Odhlásiť sa
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profil používateľa
              </CardTitle>
              <CardDescription>Informácie z Django API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meno</p>
                <p className="text-base">{user.first_name} {user.last_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Používateľské meno</p>
                <p className="text-base">{user.username}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Registrovaný</p>
                <p className="text-base">{new Date(user.date_joined).toLocaleDateString('sk-SK')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Prihlásený
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>JWT Autentifikácia</CardTitle>
              <CardDescription>Status Django REST API autentifikácie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Access Token</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  ✓ Aktívny
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Refresh Token</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  ✓ Dostupný
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                <p>🔐 Automatické obnovenie tokenu</p>
                <p>🛡️ Bezpečné uloženie v localStorage</p>
                <p>⚡ Auto-retry s token refresh</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Success Status */}
          {paymentSuccess && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Platba úspešná
                </CardTitle>
                <CardDescription className="text-green-700">
                  Stripe platba bola úspešne spracovaná
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-green-800">Payment Intent ID</p>
                    <p className="text-xs font-mono text-green-700 break-all">
                      {paymentSuccess}
                    </p>
                  </div>
                  <Button
                    onClick={() => setPaymentSuccess(null)}
                    variant="outline"
                    size="sm"
                    className="border-green-300 text-green-800 hover:bg-green-100"
                  >
                    Skryť
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Integration */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Stripe Platby
              </CardTitle>
              <CardDescription>Testovacia platobná brána</CardDescription>
            </CardHeader>
            <CardContent>
              {!showPayment ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Testujte Stripe integráciu s Django API
                  </p>
                  <Button
                    onClick={() => setShowPayment(true)}
                    className="w-full"
                  >
                    Spustiť test platby
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <StripePayment
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                  <Button
                    onClick={() => setShowPayment(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Zrušiť
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Endpoints Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Dostupné API Endpoints</CardTitle>
              <CardDescription>Django REST API endpointy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Autentifikácia</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• POST /api/auth/register/</p>
                    <p>• POST /api/auth/login/</p>
                    <p>• GET /api/auth/profile/</p>
                    <p>• PUT /api/auth/profile/update/</p>
                    <p>• POST /api/auth/token/refresh/</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Platby</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• POST /api/payments/create-payment-intent/</p>
                    <p>• POST /api/payments/confirm-payment/</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Base URL:</strong> http://localhost:8000/api/
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Uistite sa, že Django server beží na porte 8000
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}