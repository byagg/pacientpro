import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Calendar, UserCheck, UserPlus, ClipboardList, FileText, Settings, Clock, Users, Code } from "lucide-react";
import AppointmentForm from "@/components/AppointmentForm";
import AppointmentsList from "@/components/AppointmentsList";
import OfficeHoursSettings from "@/components/OfficeHoursSettings";
import WaitingPatientsList from "@/components/WaitingPatientsList";
import ExaminedPatientsList from "@/components/ExaminedPatientsList";
import InvoiceDataSettings from "@/components/InvoiceDataSettings";
import SentInvoicesList from "@/components/SentInvoicesList";
import ReceivingInvoiceCreator from "@/components/ReceivingInvoiceCreator";
import IssuedInvoicesList from "@/components/IssuedInvoicesList";
import SendingDoctorInvoiceData from "@/components/SendingDoctorInvoiceData";
import ProfileSettings from "@/components/ProfileSettings";

// 🔧 DEV MODE - Dočasne vypnutá autentifikácia pre testovanie
const DEV_MODE = true;

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [devUserType, setDevUserType] = useState<'sending' | 'receiving'>('sending');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (DEV_MODE) {
      // DEV MODE: Vytvor mock používateľa s UUID formátovaným ID
      const mockUser: User = {
        id: devUserType === 'sending' 
          ? '00000000-0000-0000-0000-000000000001'  // Mock UUID pre odosielajúceho
          : '00000000-0000-0000-0000-000000000002', // Mock UUID pre prijímajúceho
        email: devUserType === 'sending' ? 'odosielajuci@dev.sk' : 'prijimajuci@dev.sk',
        full_name: devUserType === 'sending' ? 'DEV Odosielajúci Lekár' : 'DEV Prijímajúci Lekár',
        user_type: devUserType,
        ambulance_code: devUserType === 'sending' ? 'OD' : 'PJ',
      };
      setUser(mockUser);
      setLoading(false);
    } else {
      // Normálny režim: Kontrola session
      const session = auth.getSession();
      if (session) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    }
  }, [navigate, devUserType]);

  const handleLogout = () => {
    if (DEV_MODE) {
      toast({
        title: "DEV MODE ukončený",
        description: "Presmerovanie na prihlásenie...",
      });
      navigate("/auth");
    } else {
      auth.signOut();
      toast({
        title: "Odhlásenie úspešné",
        description: "Dovidenia!",
      });
      navigate("/auth");
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
      {/* 🔧 DEV MODE Panel */}
      {DEV_MODE && (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-semibold">
          <div className="container mx-auto flex items-center justify-center gap-4">
            <Code className="h-4 w-4" />
            <span>DEV MODE</span>
            <span className="text-orange-200">|</span>
            <span>Prepnúť rolu:</span>
            <Button
              size="sm"
              variant={devUserType === 'sending' ? 'secondary' : 'outline'}
              onClick={() => setDevUserType('sending')}
              className={devUserType === 'sending' ? 'bg-white text-orange-500 hover:bg-white/90' : 'bg-orange-600 hover:bg-orange-700 border-white/20'}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Odosielajúci
            </Button>
            <Button
              size="sm"
              variant={devUserType === 'receiving' ? 'secondary' : 'outline'}
              onClick={() => setDevUserType('receiving')}
              className={devUserType === 'receiving' ? 'bg-white text-orange-500 hover:bg-white/90' : 'bg-orange-600 hover:bg-orange-700 border-white/20'}
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Prijímajúci
            </Button>
          </div>
        </div>
      )}

      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">ANGIOPLUS</h1>
            {DEV_MODE && (
              <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-700 border-orange-300">
                DEV
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {DEV_MODE ? 'Zavrieť DEV' : 'Odhlásiť sa'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            {user?.user_type === 'receiving' ? (
              <Badge variant="default" className="gap-1.5 px-3 py-1">
                <UserCheck className="h-4 w-4" />
                Prijímajúci lekár
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <UserPlus className="h-4 w-4" />
                Odosielajúci lekár
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {user?.user_type === 'receiving' 
              ? "Spravujte ordinančné hodiny a vyšetrených pacientov"
              : "Spravujte rezervácie a prijímajte manipulačné poplatky"
            }
          </p>
        </div>

        {user?.id && (
          <Tabs defaultValue="section1" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
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
                    <Settings className="h-4 w-4" />
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
                    <Settings className="h-4 w-4" />
                    Nastavenia
                  </TabsTrigger>
                  <TabsTrigger value="section4" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Profil
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {user.user_type === 'receiving' ? (
              // Receiving doctor sections
              <>
                <TabsContent value="section1" className="space-y-6">
                  <WaitingPatientsList receivingDoctorId={user.id} />
                  <ExaminedPatientsList receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section2" className="space-y-6">
                  <OfficeHoursSettings receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section3" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <InvoiceDataSettings 
                      userId={user.id}
                      title="Vaše fakturačné údaje"
                      description="Údaje prijímajúceho lekára (odberateľ)"
                      borderColor="border-l-green-500"
                    />
                    <SendingDoctorInvoiceData receivingDoctorId={user.id} />
                  </div>
                  <ReceivingInvoiceCreator receivingDoctorId={user.id} />
                  <IssuedInvoicesList receivingDoctorId={user.id} />
                </TabsContent>

                <TabsContent value="section4" className="space-y-6">
                  <ProfileSettings userId={user.id} />
                </TabsContent>
              </>
            ) : (
              // Sending doctor sections
              <>
                <TabsContent value="section1" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <AppointmentForm userId={user.id} userType={user.user_type} />
                    <AppointmentsList userId={user.id} />
                  </div>
                </TabsContent>

                <TabsContent value="section2" className="space-y-6">
                  <SentInvoicesList userId={user.id} />
                </TabsContent>

                <TabsContent value="section3" className="space-y-6">
                  <InvoiceDataSettings userId={user.id} />
                </TabsContent>

                <TabsContent value="section4" className="space-y-6">
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
