import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import { subscribeToAuthChanges } from './services/authService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebaseConfig';
import TitleBar from './components/TitleBar';
import DashboardSummary from './components/Dashboard';
import Pacientes from './components/Pacientes';
import SessaoEvolucao from './components/SessaoEvolucao';
import Agenda from './components/Agenda';
import Financas from './components/Financas';
import Questionarios from './components/Questionarios';
import { lerPacientes, lerAnamnesesDoPaciente } from './services/patientService';

function App() {
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  
  // Navigation states for 'Atender' flow
  const [autoOpenPatientForProfile, setAutoOpenPatientForProfile] = useState(null);
  const [autoOpenTabForProfile, setAutoOpenTabForProfile] = useState('');
  const [preSelectedPatientForSessao, setPreSelectedPatientForSessao] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const fetchPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const data = await lerPacientes();
      setPatients(data);
    } catch (error) {
      console.error("Failed to load patients", error);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const testFirebaseConnection = async () => {
    try {
      console.log("TESTING FIREBASE CONNECTION...");
      const docRef = await addDoc(collection(db, "test_connection"), {
        timestamp: new Date().toISOString(),
        message: "Hello from React!"
      });
      console.log("✅ FIREBASE CONNECTION SUCCESS! Inserted Document ID:", docRef.id);
    } catch (e) {
      console.error("❌ FIREBASE CONNECTION FAILED:");
      console.error(e.code);
      console.error(e.message);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (currentUser) {
        // Only fetch database data if the user is authenticated
        testFirebaseConnection();
        fetchPatients();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handlePatientAddedLocal = () => {
    // Recarrega a lista completa do banco — funciona tanto para adições quanto para deleções
    fetchPatients();
  };

  const handleAtenderPaciente = async (patient) => {
    // Check if patient already has Anamnesis
    try {
      const anamneses = await lerAnamnesesDoPaciente(patient.id);
      if (anamneses.length === 0) {
        // No anamnesis: Open profile modal in 'anamnese' tab
        setAutoOpenPatientForProfile(patient);
        setAutoOpenTabForProfile('anamnese');
        setCurrentPath('pacientes');
      } else {
        // Has anamnesis: Go directly to 'nova-sessao' form prefilled
        setPreSelectedPatientForSessao(patient);
        setCurrentPath('nova-sessao');
      }
    } catch (error) {
      console.error("Erro ao verificar anamnese:", error);
    }
  };

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} />;
      case 'pacientes':
        return <Pacientes 
                 patients={patients} 
                 isLoading={isLoadingPatients} 
                 onPatientAddedLocal={handlePatientAddedLocal} 
                 autoOpenPatient={autoOpenPatientForProfile}
                 autoOpenTab={autoOpenTabForProfile}
                 onAutoOpenDone={() => {
                   setAutoOpenPatientForProfile(null);
                   setAutoOpenTabForProfile('');
                 }}
               />;
      case 'nova-sessao':
        return <SessaoEvolucao 
                 patients={patients} 
                 isLoadingPatients={isLoadingPatients} 
                 preSelectedPatient={preSelectedPatientForSessao}
               />;
      case 'agenda':
        return <Agenda patients={patients} onAtender={handleAtenderPaciente} />;
      case 'financas':
        return <Financas patients={patients} isLoadingPatients={isLoadingPatients} />;
      case 'questionarios':
        return <Questionarios />;
      default:
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} />;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <TitleBar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <svg className="w-10 h-10 animate-spin text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-600 dark:text-slate-400 font-medium tracking-widest text-sm uppercase">Verificando segurança...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <TitleBar />
        <div className="flex-1 overflow-auto">
          <Login />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Layout currentPath={currentPath} onNavigate={setCurrentPath} userEmail={user.email} fullHeight={currentPath === 'questionarios'}>
          {renderContent()}
        </Layout>
      </div>
    </div>
  );
}

export default App;
