import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Calendar } from "lucide-react";
import AppointmentForm from "@/components/AppointmentForm";
import AppointmentsList from "@/components/AppointmentsList";
import CommissionsCard from "@/components/CommissionsCard";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const session = auth.getSession();
    if (session) {
      setUser(session.user);
    } else {
      navigate("/auth");
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    auth.signOut();
    toast({
      title: "Odhlásenie úspešné",
      description: "Dovidenia!",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Načítavam...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">ANGIOPLUS</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásiť sa
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Spravujte rezervácie a sledujte svoje manipulačné poplatky
          </p>
        </div>

        {user?.id && (
          <>
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <AppointmentForm userId={user.id} />
              <CommissionsCard userId={user.id} />
            </div>

            <AppointmentsList userId={user.id} />
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
