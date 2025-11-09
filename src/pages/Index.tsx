import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Heart, TrendingUp, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-16 animate-in fade-in duration-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 shadow-elegant hover-lift">
              <Heart className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in slide-in-from-bottom-4 duration-1000">
            PACIENT-PRO
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-in fade-in duration-1000 delay-200">
            Profesionálny systém pre správu rezervácií a manipulačných poplatkov angiológov
            v súlade s GDPR
          </p>
          <div className="space-x-4 animate-in fade-in duration-1000 delay-300">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="shadow-elegant hover:shadow-luxury transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              Prihlásiť sa
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 rounded-xl bg-card/80 backdrop-blur-sm shadow-card hover-lift border border-border/50 group transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300">
                <Calendar className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Rezervácie</h3>
            <p className="text-muted-foreground text-sm">
              Jednoduchá správa rezervácií v Google kalendári
            </p>
          </div>

          <div className="text-center p-8 rounded-xl bg-card/80 backdrop-blur-sm shadow-card hover-lift border border-border/50 group transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-accent/10 to-accent/20 group-hover:from-accent/20 group-hover:to-accent/30 transition-all duration-300">
                <Shield className="h-8 w-8 text-accent group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-accent transition-colors">GDPR súlad</h3>
            <p className="text-muted-foreground text-sm">
              Používanie len čísel pacientov bez osobných údajov
            </p>
          </div>

          <div className="text-center p-8 rounded-xl bg-card/80 backdrop-blur-sm shadow-card hover-lift border border-border/50 group transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/40 group-hover:from-green-200 group-hover:to-green-300 dark:group-hover:from-green-800/40 dark:group-hover:to-green-700/50 transition-all duration-300">
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Manipulačné poplatky</h3>
            <p className="text-muted-foreground text-sm">
              Automatické sledovanie manipulačných poplatkov za odoslaných pacientov
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
