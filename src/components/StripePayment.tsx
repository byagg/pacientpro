import { useState } from "react";
import { djangoAPI } from "@/lib/django-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";

interface StripePaymentProps {
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: string) => void;
}

export const StripePayment = ({ onPaymentSuccess, onPaymentError }: StripePaymentProps) => {
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("eur");
  const [loading, setLoading] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<{ client_secret: string; payment_intent_id: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleCreatePaymentIntent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentStatus('processing');

    try {
      if (!djangoAPI.getAccessToken()) {
        throw new Error('Musíte sa prihlásiť pre vytvorenie platby');
      }

      const amountInCents = Math.round(parseFloat(amount) * 100);
      if (amountInCents < 50) {
        throw new Error('Minimálna suma je 0.50 EUR');
      }

      const response = await djangoAPI.createPaymentIntent(amountInCents, currency);
      setPaymentIntent(response);

      toast({
        title: "Payment Intent vytvorený",
        description: `Suma: ${(amountInCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
      });

      // V reálnej implementácii by tu bolo Stripe Elements pre kartu
      // Pre demo účely simulujeme úspešnú platbu
      setTimeout(() => {
        simulateSuccessfulPayment(response.payment_intent_id);
      }, 2000);

    } catch (error) {
      setPaymentStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Neznáma chyba";
      toast({
        variant: "destructive",
        title: "Chyba platby",
        description: errorMessage,
      });
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const simulateSuccessfulPayment = async (paymentIntentId: string) => {
    try {
      const response = await djangoAPI.confirmPayment(paymentIntentId);
      
      if (response.status === 'success') {
        setPaymentStatus('success');
        toast({
          title: "Platba úspešná!",
          description: response.message,
        });
        onPaymentSuccess?.(paymentIntentId);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      setPaymentStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Platba zlyhala";
      toast({
        variant: "destructive",
        title: "Platba zlyhala",
        description: errorMessage,
      });
      onPaymentError?.(errorMessage);
    }
  };

  const resetPayment = () => {
    setPaymentIntent(null);
    setPaymentStatus('idle');
    setAmount("");
  };

  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">Platba úspešná!</CardTitle>
          <CardDescription>
            Vaša platba bola úspešne spracovaná.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={resetPayment} className="w-full">
            Vykonať novú platbu
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CreditCard className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-xl">Stripe Platba</CardTitle>
        <CardDescription>
          Testovacia platobná brána cez Django API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreatePaymentIntent} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Suma</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.50"
              placeholder="10.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading || paymentStatus === 'processing'}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Mena</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              disabled={loading || paymentStatus === 'processing'}
            >
              <option value="eur">EUR - Euro</option>
              <option value="usd">USD - US Dollar</option>
              <option value="gbp">GBP - British Pound</option>
            </select>
          </div>

          {!djangoAPI.getAccessToken() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ Musíte sa prihlásiť pre vytvorenie platby
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || paymentStatus === 'processing' || !djangoAPI.getAccessToken()}
          >
            {loading || paymentStatus === 'processing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {paymentStatus === 'processing' ? 'Spracovávam platbu...' : 'Vytváram platbu...'}
              </>
            ) : (
              "Vytvoriť platbu"
            )}
          </Button>
        </form>

        {paymentIntent && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Payment Intent Details:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>ID:</strong> {paymentIntent.payment_intent_id}</p>
              <p><strong>Client Secret:</strong> {paymentIntent.client_secret.substring(0, 20)}...</p>
              <p className="text-xs text-blue-600 mt-2">
                💡 V produkčnom prostredí by tu boli Stripe Elements pre zadanie karty
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>🔒 Testovací režim - žiadne skutočne peniaze nebudú stiahnuté</p>
          <p>🎯 Django API endpoint: /api/payments/create-payment-intent/</p>
        </div>
      </CardContent>
    </Card>
  );
};