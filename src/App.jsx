import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import ContaBloqueada from './components/ContaBloqueada';
import { subscribeToAuthChanges, logoutFirebaseUser, isSessaoMfaValida, liberarPorDispositivoConfiavel } from './services/authService';
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
const LiderClinicoDashboard = lazy(() => import('./components/lider/LiderClinicoDashboard'));
const PerfilEPlano = lazy(() => import('./components/PerfilEPlano'));
const AssinaturaPendente = lazy(() => import('./components/AssinaturaPendente'));
import { lerPacientes, lerAnamnesesDoPaciente, limparLixeiraPacientes, lerPerfilPsicologo, salvarPerfilPsicologo } from './services/patientService';
import { isAdminEmail, verificarOuCriarAdmin } from './services/adminService';
import { trackAction } from './services/logService';
import { verificarStatusAssinatura } from './services/paymentService';

// Mapeamento de path de URL → id interno de navegação
const PATH_MAP = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/pacientes': 'pacientes',
  '/nova-sessao': 'nova-sessao',
  '/agenda': 'agenda',
  '/financas': 'financas',
  '/perfil': 'perfil',
  '/lider': 'lider',
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
  'perfil': '/perfil',
  'lider': '/lider',
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

  // Auth state & 2FA ('verificando' | 'pendente' | 'ok')
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [mfaStatus, setMfaStatus] = useState('verificando');
  const is2FAVerified = mfaStatus === 'ok';

  // Admin/Plano state
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilPsicologo, setPerfilPsicologo] = useState(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [erroPerfil, setErroPerfil] = useState(false);
  // Líder Clínico = quem assinou o Plano Clínica & Equipe (definido na assinatura)
  const isLider = perfilPsicologo?.plano === 'clinica';

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

  const carregarDadosUsuario = useCallback(async (currentUser) => {
    if (!currentUser) return;
    setIsCheckingRole(true);
    setErroPerfil(false);
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
        // Primeiro login: perfil nasce pendente e cai na tela de pagamento (sem teste grátis)
        await salvarPerfilPsicologo({
          email: currentUser.email,
          nome: currentUser.displayName || '',
          plano: 'basico',
          statusPagamento: 'pendente',
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
      limparLixeiraPacientes(7).catch((err) => logger.error('Falha ao anonimizar lixeira:', err));
    } catch (err) {
      logger.error("Erro no fluxo de autenticação/perfil:", err);
      // Sem perfil não dá para checar bloqueio/assinatura: não abre o app "no escuro"
      setErroPerfil(true);
    } finally {
      setIsCheckingRole(false);
    }
  }, []);

  const handle2FASuccess = async () => {
    setMfaStatus('ok');
    if (user) {
      await carregarDadosUsuario(user);
    }
  };

  const ultimoUidRef = useRef(null);
  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges(async (currentUser) => {
      ultimoUidRef.current = currentUser?.uid || null;
      setUser(currentUser);

      if (currentUser) {
        setMfaStatus('verificando');
        let liberado = false;
        try {
          // shortcut: só em `npm run dev` com VITE_PULAR_2FA=true (.env.local) enquanto as Functions não estão publicadas; o build de produção remove este atalho
          liberado = (import.meta.env.DEV && import.meta.env.VITE_PULAR_2FA === 'true')
            || await isSessaoMfaValida(currentUser) || await liberarPorDispositivoConfiavel(currentUser);
        } catch (err) {
          logger.warn('Falha ao checar 2FA; pedindo código.', err);
        }
        // Outro login aconteceu durante a checagem: o resultado é dele, não deste
        if (ultimoUidRef.current !== currentUser.uid) return;
        setMfaStatus(liberado ? 'ok' : 'pendente');
        setIsAuthChecking(false);
        if (liberado) await carregarDadosUsuario(currentUser);
      } else {
        // Logout: limpar tudo
        setIsAdmin(false);
        setPerfilPsicologo(null);
        setPatients([]);
        setMfaStatus('verificando');
        setIsAuthChecking(false);
      }
    });

    return () => unsubscribeAuth();
  }, [carregarDadosUsuario]);

  // ===== SEMPRE ABRIR NO DASHBOARD AO LOGAR =====
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (user && is2FAVerified && !isAuthChecking && !isCheckingRole && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
    }
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user, is2FAVerified, isAuthChecking, isCheckingRole]);

  // ===== AUTO-LOGOUT APÓS 10 MIN DE INATIVIDADE =====
  const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
  const idleTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      if (user) {
        logger.info('Auto-logout: 10 minutos de inatividade.');
        trackAction('AUTO_LOGOUT', { reason: 'inactivity', timeoutMs: IDLE_TIMEOUT_MS });
        await logoutFirebaseUser('inatividade');
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
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={handleNavigate} perfil={perfilPsicologo} />;
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
      case 'perfil':
        return <PerfilEPlano onProfileUpdated={() => carregarDadosUsuario(user)} />;
      case 'lider':
        if (!isLider) {
          return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={handleNavigate} perfil={perfilPsicologo} />;
        }
        return <LiderClinicoDashboard />;
      case 'questionarios':
        return <Questionarios />;
      case 'clinicas':
        return <Clinicas />;
      case 'lixeira':
        return <Lixeira onPatientRestored={fetchPatients} />;
      default:
        return <DashboardSummary patients={patients} isLoading={isLoadingPatients} onNavigate={handleNavigate} perfil={perfilPsicologo} />;
    }
  };

  // 1. Loading auth
  if (isAuthChecking || isCheckingRole || (user && mfaStatus === 'verificando')) {
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

  // 2. Não autenticado ou Verificação em 2 Etapas (2FA) pendente
  if (!user || !is2FAVerified) {
    return (
      <div className="h-screen overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Login pending2FAUser={user} on2FASuccess={handle2FASuccess} />
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

  // 3b. Perfil não carregou (rede/permissão)
  if (erroPerfil) {
    return (
      <div className="flex h-screen items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="ds-card max-w-sm w-full p-6 text-center">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Não foi possível carregar sua conta</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Verifique sua conexão e tente de novo. Seus dados continuam seguros.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button className="ds-btn ds-btn-primary" onClick={() => carregarDadosUsuario(user)}>Tentar novamente</button>
            <button className="ds-btn ds-btn-ghost" onClick={() => logoutFirebaseUser()}>Sair</button>
          </div>
        </div>
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

  // 5. Psicólogo com assinatura inadimplente ou trial expirado (Paywall / Bloqueio de Acesso)
  const statusAssinatura = verificarStatusAssinatura(perfilPsicologo);
  if (perfilPsicologo && !statusAssinatura.emDia) {
    return (
      <div className="h-screen overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center">
            <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        }>
          <AssinaturaPendente 
            perfil={perfilPsicologo} 
            statusAssinatura={statusAssinatura} 
            onPagamentoRegularizado={() => carregarDadosUsuario(user)} 
          />
        </Suspense>
      </div>
    );
  }

  // 6. Psicólogo normal / Líder Clínico
  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Layout 
        currentPath={currentPath} 
        onNavigate={handleNavigate} 
        userEmail={user.email} 
        fullHeight={currentPath === 'questionarios'} 
        patients={patients}
        isLider={isLider}
        perfil={perfilPsicologo}
      >
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
