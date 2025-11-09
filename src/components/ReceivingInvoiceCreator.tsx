import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, FileText, Loader2, Euro, Search, Filter, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { PATIENT_FEE } from "@/lib/constants";
import { formatDoctorName } from "@/lib/utils-doctors";

interface ReceivingInvoiceCreatorProps {
  receivingDoctorId: string;
}

interface ExaminedPatient {
  id: string;
  patient_number: string;
  angiologist_id: string;
  sending_doctor_name: string;
  appointment_date: string;
  examined_at: string;
  procedure_type: string;
}

// PATIENT_FEE is now centralized in src/lib/constants.ts

const ReceivingInvoiceCreator = ({ receivingDoctorId }: ReceivingInvoiceCreatorProps) => {
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");
  const createInvoice = useCreateInvoice();

  // Fetch examined patients from last year that haven't been invoiced yet
  // Auto-refresh every 20 seconds to detect newly examined patients
  const { data: patients = [], isLoading, error } = useQuery({
    queryKey: ["examined-patients-for-invoice", receivingDoctorId],
    queryFn: async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // First, get invoiced appointment IDs
      const { data: invoicedItems } = await supabase
        .from('invoice_items')
        .select('appointment_id');

      const invoicedAppointmentIds = new Set((invoicedItems || []).map(item => item.appointment_id));

      // Then get appointments
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_number,
          angiologist_id,
          appointment_date,
          examined_at,
          notes,
          profiles!appointments_angiologist_id_fkey(full_name)
        `)
        .eq('status', 'completed')
        .not('examined_at', 'is', null)
        .gte('examined_at', oneYearAgo.toISOString())
        .or(`examined_by.eq.${receivingDoctorId},receiving_doctor_id.eq.${receivingDoctorId}`)
        .order('examined_at', { ascending: false });

      if (error) {
        console.error('Error fetching examined patients:', error);
        throw error;
      }

      // Filter out invoiced appointments
      const result = (data || [])
        .filter(appointment => !invoicedAppointmentIds.has(appointment.id))
        .map(appointment => ({
          id: appointment.id,
          patient_number: appointment.patient_number,
          angiologist_id: appointment.angiologist_id,
          sending_doctor_name: appointment.profiles?.full_name || '',
          appointment_date: appointment.appointment_date,
          examined_at: appointment.examined_at,
          procedure_type: appointment.notes || '',
        })) as ExaminedPatient[];
      
      return result;
    },
    enabled: !!receivingDoctorId,
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 20000, // Refresh every 20 seconds
  });

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        patient.patient_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.sending_doctor_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Doctor filter
      const matchesDoctor = selectedDoctorFilter === "all" || 
        patient.angiologist_id === selectedDoctorFilter;
      
      return matchesSearch && matchesDoctor;
    });
  }, [patients, searchTerm, selectedDoctorFilter]);

  // Group filtered patients by sending doctor (memoized for performance)
  const patientsBySendingDoctor = useMemo(() => {
    return filteredPatients.reduce((acc, patient) => {
      if (!acc[patient.angiologist_id]) {
        acc[patient.angiologist_id] = {
          doctorName: patient.sending_doctor_name,
          patients: [],
        };
      }
      acc[patient.angiologist_id].patients.push(patient);
      return acc;
    }, {} as Record<string, { doctorName: string; patients: ExaminedPatient[] }>);
  }, [filteredPatients]);

  // Get unique doctors for filter dropdown
  const uniqueDoctors = useMemo(() => {
    const doctorsMap = new Map<string, string>();
    patients.forEach(patient => {
      doctorsMap.set(patient.angiologist_id, patient.sending_doctor_name);
    });
    return Array.from(doctorsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [patients]);

  const handleTogglePatient = (patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map(p => p.id));
    }
  };

  const handleCreateInvoice = async (sendingDoctorId: string) => {
    console.log('Creating invoice for doctor:', sendingDoctorId);
    console.log('Receiving doctor ID:', receivingDoctorId);
    
    const patientsForDoctor = patients.filter(
      p => p.angiologist_id === sendingDoctorId && selectedPatients.includes(p.id)
    );

    console.log('Selected patients for doctor:', patientsForDoctor.length);
    console.log('Patients:', patientsForDoctor);

    if (patientsForDoctor.length === 0) {
      console.warn('No patients selected for invoice creation');
      return;
    }

    const totalAmount = patientsForDoctor.length * PATIENT_FEE;
    const appointmentIds = patientsForDoctor.map(p => p.id);

    console.log('Invoice data:', {
      sending_doctor_id: sendingDoctorId,
      receiving_doctor_id: receivingDoctorId,
      appointment_ids: appointmentIds,
      total_amount: totalAmount,
    });

    try {
      const result = await createInvoice.mutateAsync({
        sending_doctor_id: sendingDoctorId,
        receiving_doctor_id: receivingDoctorId,
        appointment_ids: appointmentIds,
        total_amount: totalAmount,
        notes: `Manipulačné poplatky za ${patientsForDoctor.length} vyšetrených pacientov`,
      });

      console.log('Invoice created successfully:', result);

      // Clear selection after successful invoice creation
      setSelectedPatients(prev => prev.filter(id => !appointmentIds.includes(id)));
    } catch (error) {
      console.error('Error creating invoice:', error);
      // Error is already handled by the mutation's onError
    }
  };

  const calculateTotal = () => {
    return selectedPatients.length * PATIENT_FEE;
  };

  // Listen for doctor filter events from SendingDoctorInvoiceData
  useEffect(() => {
    const handleSetDoctorFilter = (event: any) => {
      console.log('Received set-doctor-filter event:', event);
      const doctorId = event.detail?.doctorId;
      console.log('Doctor ID from event:', doctorId);
      
      if (doctorId) {
        console.log('Setting doctor filter to:', doctorId);
        setSelectedDoctorFilter(doctorId);
        setSearchTerm(""); // Clear search when filter is set
      } else {
        console.warn('No doctorId in event detail');
      }
    };

    console.log('Setting up set-doctor-filter event listener');
    window.addEventListener('set-doctor-filter', handleSetDoctorFilter);
    return () => {
      console.log('Cleaning up set-doctor-filter event listener');
      window.removeEventListener('set-doctor-filter', handleSetDoctorFilter);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-card border-l-4 border-l-red-500">
        <CardContent className="py-8">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Chyba pri načítaní údajov</h3>
              <p className="text-sm text-red-700 mt-1">
                {error instanceof Error ? error.message : 'Nepodarilo sa načítať zoznam pacientov'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card" data-invoice-creator>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Vystavenie faktúry</CardTitle>
        </div>
        <CardDescription>
          Vyberte vyšetrených pacientov a vytvorte faktúru pre odosielajúceho lekára
        </CardDescription>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Žiadni vyšetrení pacienti bez faktúry
          </p>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Hľadať pacienta alebo lekára..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-64">
                <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Všetci lekári" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetci lekári</SelectItem>
                    {uniqueDoctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {formatDoctorName(doctor.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Žiadni pacienti nevyhovujú filtru
              </p>
            ) : (
              <div className="space-y-6">
                {/* Calculator */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Kalkulačka</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedPatients.length === filteredPatients.length ? "Zrušiť výber" : "Vybrať všetkých"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-muted-foreground">
                      {selectedPatients.length} pacientov × {PATIENT_FEE} €
                    </span>
                    <div className="flex items-center gap-1 font-bold text-primary text-2xl">
                      <Euro className="h-6 w-6" />
                      {calculateTotal().toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Results info */}
                <div className="text-sm text-muted-foreground">
                  Zobrazených: {filteredPatients.length} z {patients.length} pacientov
                </div>

                {/* Patients grouped by sending doctor */}
                {Object.entries(patientsBySendingDoctor).map(([doctorId, { doctorName, patients: doctorPatients }]) => {
                  const selectedFromThisDoctor = doctorPatients.filter(p => 
                    selectedPatients.includes(p.id)
                  ).length;
                  const totalForDoctor = selectedFromThisDoctor * PATIENT_FEE;

                  return (
                    <div key={doctorId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{formatDoctorName(doctorName)}</h3>
                        {selectedFromThisDoctor > 0 && (
                          <Button
                            type="button"
                            onClick={() => handleCreateInvoice(doctorId)}
                            disabled={createInvoice.isPending}
                            size="sm"
                          >
                            {createInvoice.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="mr-2 h-4 w-4" />
                            )}
                            Vytvoriť faktúru ({totalForDoctor.toFixed(2)} €)
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {doctorPatients.map((patient) => (
                          <div
                            key={patient.id}
                            className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              checked={selectedPatients.includes(patient.id)}
                              onCheckedChange={() => handleTogglePatient(patient.id)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{patient.patient_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Vyšetrený: {format(new Date(patient.examined_at), "d. M. yyyy 'o' HH:mm", { locale: sk })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{PATIENT_FEE} €</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceivingInvoiceCreator;

