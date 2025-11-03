import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Heart, TrendingUp, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Heart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Angiologický rezervačný systém
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Profesionálny systém pre správu rezervácií a provízií angiológov
            v súlade s GDPR
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="shadow-elegant"
          >
            Prihlásiť sa
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 rounded-lg bg-card shadow-card">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Rezervácie</h3>
            <p className="text-muted-foreground">
              Jednoduchá správa rezervácií v Google kalendári
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card shadow-card">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-accent/10">
                <Shield className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">GDPR súlad</h3>
            <p className="text-muted-foreground">
              Používanie len čísel pacientov bez osobných údajov
            </p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card shadow-card">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Provízie</h3>
            <p className="text-muted-foreground">
              Automatické sledovanie provízií za odoslaných pacientov
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
