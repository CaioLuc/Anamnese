import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import ContaBloqueada from './components/ContaBloqueada';
import { subscribeToAuthChanges } from './services/authService';
import TitleBar from './components/TitleBar';
import DashboardSummary from './components/Dashboard';
import Pacientes from './components/Pacientes';
import SessaoEvolucao from './components/SessaoEvolucao';
import Agenda from './components/Agenda';
import Financas from './components/Financas';
import Questionarios from './components/Questionarios';
import Clinicas from './components/Clinicas';
import AgendaPublica from './components/AgendaPublica';
import { lerPacientes, lerAnamnesesDoPaciente, limparLixeiraPacientes, lerPerfilPsicologo, salvarPerfilPsicologo } from './services/patientService';
import { isAdminEmail, verificarOuCriarAdmin } from './services/adminService';

// ================================
// APP PRINCIPAL (Autenticado)
// ================================
function AppMain() {
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
  
  // Admin/Plano state
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);

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

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);

      if (currentUser) {
        setIsCheckingRole(true);
        console.log("Usuário logado:", currentUser.email);
        try {
          // Verificar se é admin
          const isAdm = isAdminEmail(currentUser.email);
          console.log("É admin?", isAdm);
          
          if (isAdm) {
            await verificarOuCriarAdmin();
            setIsAdmin(true);
            setIsCheckingRole(false);
            console.log("Acesso Admin concedido.");
            return; 
          }

          // Não é admin: verificar/criar perfil do psicólogo
          console.log("Iniciando fluxo de Psicólogo...");
          setIsAdmin(false);
          let perfil = await lerPerfilPsicologo();
          if (!perfil) {
            // Primeiro login: criar perfil com plano básico
            await salvarPerfilPsicologo({
              email: currentUser.email,
              nome: currentUser.displayName || '',
              plano: 'basico',
              ativo: true,
              max_locais: 1,
            });
            perfil = await lerPerfilPsicologo();
          } else {
            // Atualizar lastLogin
            await salvarPerfilPsicologo({ lastLogin: new Date() });
          }
          setPerfilPsicologo(perfil);

          // Carregar dados do psicólogo
          await fetchPatients();
          limparLixeiraPacientes(7);
        } catch (err) {
          console.error("Erro no fluxo de autenticação/perfil:", err);
        } finally {
          setIsCheckingRole(false);
        }
      } else {
        // Logout: limpar tudo
        setIsAdmin(false);
        setPerfilPsicologo(null);
        setPatients([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handlePatientAddedLocal = () => {
    fetchPatients();
  };

  const handleAtenderPaciente = async (patient) => {
    try {
      const anamneses = await lerAnamnesesDoPaciente(patient.id);
      if (anamneses.length === 0) {
        setAutoOpenPatientForProfile(patient);
        setAutoOpenTabForProfile('anamnese');
        setCurrentPath('pacientes');
      } else {
        setPreSelectedPatientForSessao({ ...patient });
        setCurrentPath('nova-sessao');
      }
    } catch (error) {
      console.error("Erro ao verificar anamnese:", error);
      setPreSelectedPatientForSessao({ ...patient });
      setCurrentPath('nova-sessao');
    }
  };

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={setCurrentPath} />;
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
        return <Agenda patients={patients} onAtender={handleAtenderPaciente} onRefreshPatients={fetchPatients} />;
      case 'financas':
        return <Financas patients={patients} isLoadingPatients={isLoadingPatients} />;
      case 'questionarios':
        return <Questionarios />;
      case 'clinicas':
        return <Clinicas />;
      default:
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} />;
    }
  };

  // 1. Loading auth
  if (isAuthChecking || isCheckingRole) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 items-center justify-center flex-col gap-3">
        <svg className="w-10 h-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400">Verificando credenciais...</p>
      </div>
    );
  }

  // 2. Not logged in
  if (!user) {
    return (
      <div className="h-screen overflow-auto bg-slate-50 dark:bg-zinc-950">
        <Login />
      </div>
    );
  }

  // 3. Admin
  if (isAdmin) {
    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <AdminPanel />
      </div>
    );
  }

  // 4. Psicólogo com conta bloqueada
  if (perfilPsicologo && perfilPsicologo.ativo === false) {
    return (
      <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
        <ContaBloqueada />
      </div>
    );
  }

  // 5. Psicólogo normal
  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950">
      <Layout currentPath={currentPath} onNavigate={setCurrentPath} userEmail={user.email} fullHeight={currentPath === 'questionarios'}>
        {renderContent()}
      </Layout>
    </div>
  );
}

// ================================
// APP ROOT (Router)
// ================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública — página de agendamento para pacientes */}
        <Route path="/agendar/:slug" element={<AgendaPublica />} />
        {/* App principal — tudo que já existe */}
        <Route path="/*" element={<AppMain />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
