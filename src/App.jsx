import { useState, useEffect } from 'react';
import Layout from './components/Layout';
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
    testFirebaseConnection();
    fetchPatients();
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

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      {renderContent()}
    </Layout>
  );
}

export default App;
