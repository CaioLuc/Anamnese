import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import { subscribeToAuthChanges } from './services/authService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './services/firebaseConfig';
import DashboardSummary from './components/Dashboard';
import Pacientes from './components/Pacientes';
import SessaoEvolucao from './components/SessaoEvolucao';
import { lerPacientes } from './services/patientService';

function App() {
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  
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

  const handlePatientAddedLocal = (newPatient) => {
    // Add dynamically to local state immediately without loading screen
    setPatients(prev => [newPatient, ...prev]);
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
               />;
      case 'nova-sessao':
        return <SessaoEvolucao patients={patients} isLoadingPatients={isLoadingPatients} />;
      default:
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} />;
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <svg className="w-10 h-10 animate-spin text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-slate-400 font-medium tracking-widest text-sm uppercase">Verificando segurança...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath} userEmail={user.email}>
      {renderContent()}
    </Layout>
  );
}

export default App;
