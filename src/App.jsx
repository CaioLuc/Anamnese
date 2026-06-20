import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import ContaBloqueada from './components/ContaBloqueada';
import { subscribeToAuthChanges, logoutFirebaseUser } from './services/authService';
import DashboardSummary from './components/Dashboard';
import Pacientes from './components/Pacientes';
import SessaoEvolucao from './components/SessaoEvolucao';
import AgendaPublica from './components/AgendaPublica';
import logger from './utils/logger';
import OnboardingOverlay from './components/OnboardingOverlay';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Agenda = lazy(() => import('./components/Agenda'));
const Financas = lazy(() => import('./components/Financas'));
const Questionarios = lazy(() => import('./components/Questionarios'));
const Clinicas = lazy(() => import('./components/Clinicas'));
const Lixeira = lazy(() => import('./components/Lixeira'));
import { lerPacientes, lerAnamnesesDoPaciente, limparLixeiraPacientes, lerPerfilPsicologo, salvarPerfilPsicologo } from './services/patientService';
import { isAdminEmail, verificarOuCriarAdmin } from './services/adminService';
import { trackAction } from './services/logService';

// Mapeamento de path de URL → id interno de navegação
const PATH_MAP = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/pacientes': 'pacientes',
  '/nova-sessao': 'nova-sessao',
  '/agenda': 'agenda',
  '/financas': 'financas',
  '/questionarios': 'questionarios',
  '/clinicas': 'clinicas',
  '/lixeira': 'lixeira',
};

const ID_TO_PATH = {
  'dashboard': '/dashboard',
  'pacientes': '/pacientes',
  'nova-sessao': '/nova-sessao',
  'agenda': '/agenda',
  'financas': '/financas',
  'questionarios': '/questionarios',
  'clinicas': '/clinicas',
  'lixeira': '/lixeira',
};

// ================================
// APP PRINCIPAL (Autenticado)
// ================================
function AppMain() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = PATH_MAP[location.pathname] || 'dashboard';

  const [patients, setPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  
  // Navigation states for 'Atender' flow
  const [autoOpenPatientForProfile, setAutoOpenPatientForProfile] = useState(null);
  const [autoOpenTabForProfile, setAutoOpenTabForProfile] = useState('');
  const [preSelectedPatientForSessao, setPreSelectedPatientForSessao] = useState(null);

  // Onboarding (H10)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('caritas_onboarding_done'));

  // Navegação com opções extras (para GlobalSearch)
  const handleNavigate = (path, opts) => {
    const urlPath = ID_TO_PATH[path] || '/dashboard';
    navigate(urlPath);
    trackAction('NAVIGATE', { from: currentPath, to: path });
    if (opts?.openPatient) {
      setAutoOpenPatientForProfile(opts.openPatient);
      setAutoOpenTabForProfile('evolucoes');
    }
    if (opts?.addPatient) {
      setAutoOpenPatientForProfile('__add__');
    }
  };

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
      logger.error("Failed to load patients", error);
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
        try {
          // Verificar se é admin
          const isAdm = isAdminEmail(currentUser.email);
          
          if (isAdm) {
            await verificarOuCriarAdmin();
            setIsAdmin(true);
            setIsCheckingRole(false);
            return; 
          }

          // Não é admin: verificar/criar perfil do psicólogo
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
          logger.error("Erro no fluxo de autenticação/perfil:", err);
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

  // ===== SEMPRE ABRIR NO DASHBOARD AO LOGAR =====
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (user && !isAuthChecking && !isCheckingRole && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
    }
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user, isAuthChecking, isCheckingRole]);

  // ===== AUTO-LOGOUT APÓS 10 MIN DE INATIVIDADE =====
  const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
  const idleTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      if (user) {
        logger.info('Auto-logout: 10 minutos de inatividade.');
        trackAction('AUTO_LOGOUT', { reason: 'inactivity', timeoutMs: IDLE_TIMEOUT_MS });
        await logoutFirebaseUser();
      }
    }, IDLE_TIMEOUT_MS);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // iniciar timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const handlePatientAddedLocal = () => {
    fetchPatients();
  };

  const handleAtenderPaciente = async (patient) => {
    try {
      const anamneses = await lerAnamnesesDoPaciente(patient.id);
      if (anamneses.length === 0) {
        setAutoOpenPatientForProfile(patient);
        setAutoOpenTabForProfile('anamnese');
        navigate('/pacientes');
      } else {
        setPreSelectedPatientForSessao({ ...patient });
        navigate('/nova-sessao');
      }
    } catch (error) {
      logger.error("Erro ao verificar anamnese:", error);
      setPreSelectedPatientForSessao({ ...patient });
      navigate('/nova-sessao');
    }
  };

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={handleNavigate} />;
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
      case 'lixeira':
        return <Lixeira onPatientRestored={fetchPatients} />;
      default:
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={handleNavigate} />;
    }
  };

  // 1. Loading auth
  if (isAuthChecking || isCheckingRole) {
    return (
      <div className="flex h-screen overflow-hidden items-center justify-center flex-col gap-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <svg className="w-10 h-10 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando credenciais...</p>
      </div>
    );
  }

  // 2. Not logged in
  if (!user) {
    return (
      <div className="h-screen overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Login />
      </div>
    );
  }

  // 3. Admin
  if (isAdmin) {
    return (
      <div className="h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        }>
          <AdminPanel />
        </Suspense>
      </div>
    );
  }

  // 4. Psicólogo com conta bloqueada
  if (perfilPsicologo && perfilPsicologo.ativo === false) {
    return (
      <div className="h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <ContaBloqueada />
      </div>
    );
  }

  // 5. Psicólogo normal
  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Layout currentPath={currentPath} onNavigate={handleNavigate} userEmail={user.email} fullHeight={currentPath === 'questionarios'} patients={patients}>
        <Suspense fallback={
          <div className="flex h-full items-center justify-center">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        }>
          {renderContent()}
        </Suspense>
      </Layout>

      {/* Onboarding para primeiro acesso (H10) */}
      {showOnboarding && (
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} />
      )}
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
