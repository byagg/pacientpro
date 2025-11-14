import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Calendar, UserCheck, UserPlus, ClipboardList, FileText, Clock, Users, User as UserIcon } from "lucide-react";
import AppointmentForm from "@/components/AppointmentForm";
import AppointmentsList from "@/components/AppointmentsList";
import OfficeHoursSettings from "@/components/OfficeHoursSettings";
import WaitingPatientsList from "@/components/WaitingPatientsList";
import ExaminedPatientsList from "@/components/ExaminedPatientsList";
import InvoicedPatientsList from "@/components/InvoicedPatientsList";
import InvoiceDataSettings from "@/components/InvoiceDataSettings";
import SentInvoicesList from "@/components/SentInvoicesList";
import ReceivingInvoiceCreator from "@/components/ReceivingInvoiceCreator";
import IssuedInvoicesList from "@/components/IssuedInvoicesList";
import SendingDoctorInvoiceData from "@/components/SendingDoctorInvoiceData";
import ProfileSettings from "@/components/ProfileSettings";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await auth.getSession();
        if (session) {
          setUser(session.user);
        } else {
          navigate("/auth");
        }
      } catch (error) {
        console.error('Session check error:', error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Odhlásenie úspešné",
        description: "Dovidenia!",
      });
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Chyba pri odhlásení",
        description: "Skúste to prosím znova.",
      });
    }
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
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PACIENT-PRO</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors">
              <LogOut className="mr-2 h-4 w-4" />
              Odhlásiť sa
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Dashboard</h2>
            {user?.user_type === 'receiving' ? (
              <Badge className="gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-accent text-white shadow-md">
                <UserCheck className="h-4 w-4" />
                Prijímajúci lekár
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 shadow-md">
                <UserPlus className="h-4 w-4" />
                Odosielajúci lekár
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            {user?.user_type === 'receiving' 
              ? "Spravujte ordinančné hodiny a vyšetrených pacientov"
              : "Spravujte rezervácie a prijímajte manipulačné poplatky"
            }
          </p>
        </div>

        {user?.id && (
          <Tabs defaultValue="section1" className="w-full">
            <TabsList className={`grid w-full ${user.user_type === 'receiving' ? 'grid-cols-4' : 'grid-cols-3'} mb-6`}>
              {user.user_type === 'receiving' ? (
                <>
                  <TabsTrigger value="section1" className="gap-2">
                    <Users className="h-4 w-4" />
                    Pacienti
                  </TabsTrigger>
                  <TabsTrigger value="section2" className="gap-2">
                    <Clock className="h-4 w-4" />
                    Ordinačné hodiny
                  </TabsTrigger>
                  <TabsTrigger value="section3" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Faktúry
                  </TabsTrigger>
                  <TabsTrigger value="section4" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    Profil
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="section1" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Rezervácie
                  </TabsTrigger>
                  <TabsTrigger value="section2" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Faktúry
                  </TabsTrigger>
                  <TabsTrigger value="section3" className="gap-2">
                    <UserIcon className="h-4 w-4" />
                    Profil
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {user.user_type === 'receiving' ? (
              // Receiving doctor sections
              <>
                <TabsContent value="section1" className="space-y-3">
                  <WaitingPatientsList receivingDoctorId={user.id} />
                  <ExaminedPatientsList receivingDoctorId={user.id} />
                  <InvoicedPatientsList receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section2" className="space-y-3">
                  <OfficeHoursSettings receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section3" className="space-y-3">
                  <InvoiceDataSettings 
                    userId={user.id} 
                    title="Moje fakturačné údaje"
                    description="Údaje pre vystavovanie faktúr (dodávateľ)"
                    borderColor="border-l-green-500"
                  />
                  <SendingDoctorInvoiceData receivingDoctorId={user.id} />
                  <ReceivingInvoiceCreator receivingDoctorId={user.id} />
                  <IssuedInvoicesList receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section4" className="space-y-3">
                  <ProfileSettings userId={user.id} />
                </TabsContent>
              </>
            ) : (
              // Sending doctor sections
              <>
                <TabsContent value="section1" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 md:items-stretch">
                    <AppointmentForm userId={user.id} userType={user.user_type} />
                    <AppointmentsList userId={user.id} />
                  </div>
                </TabsContent>

                <TabsContent value="section2" className="space-y-3">
                  <SentInvoicesList userId={user.id} />
                </TabsContent>

                <TabsContent value="section3" className="space-y-3">
                  <ProfileSettings userId={user.id} />
                </TabsContent>
              </>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
