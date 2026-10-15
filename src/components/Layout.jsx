import logger from '../utils/logger';
import { useState } from 'react';
import { logoutFirebaseUser } from '../services/authService';
import { verificarStatusAssinatura } from '../services/paymentService';
import ConfirmDialog from './ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';
import HelpPanel from './HelpPanel';
import GlobalSearch from './GlobalSearch';
import { useKeyboard } from '../hooks/useKeyboard';
import logo from '../assets/logo.svg';
import {
  LayoutDashboard, Users, FilePlus2, Calendar, Wallet,
  Building2, ClipboardList, Trash2, Search, HelpCircle,
  Sun, Moon, LogOut, Menu, X, ShieldCheck, UserRound, MoreHorizontal
} from 'lucide-react';

const GRUPOS = [
  {
    titulo: 'Atendimento',
    itens: [
      { name: 'Início', id: 'dashboard', icon: LayoutDashboard },
      { name: 'Pacientes', id: 'pacientes', icon: Users },
      { name: 'Agenda', id: 'agenda', icon: Calendar },
      { name: 'Questionários', id: 'questionarios', icon: ClipboardList },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { name: 'Financeiro', id: 'financas', icon: Wallet },
      { name: 'Equipe clínica', id: 'lider', icon: ShieldCheck, onlyLider: true },
      { name: 'Locais de atendimento', id: 'clinicas', icon: Building2 },
      { name: 'Lixeira', id: 'lixeira', icon: Trash2 },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { name: 'Meu plano e perfil', id: 'perfil', icon: UserRound },
    ],
  },
];

// Barra inferior do celular: os destinos do dia a dia
const ABAS_MOBILE = [
  { name: 'Início', id: 'dashboard', icon: LayoutDashboard },
  { name: 'Pacientes', id: 'pacientes', icon: Users },
  { name: 'Sessão', id: 'nova-sessao', icon: FilePlus2, destaque: true },
  { name: 'Agenda', id: 'agenda', icon: Calendar },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

function Marca({ compacta = false }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img src={logo} alt="" className={compacta ? 'w-7 h-7' : 'w-8 h-8'} />
      <div className="min-w-0">
        <p className="font-heading font-semibold tracking-[0.06em] leading-none" style={{ color: 'var(--text-primary)', fontSize: compacta ? '1rem' : '1.075rem' }}>
          CARITAS
        </p>
        {!compacta && (
          <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--text-muted)' }}>Prontuário clínico</p>
        )}
      </div>
    </div>
  );
}

export default function Layout({
  children,
  currentPath,
  onNavigate,
  userEmail,
  fullHeight = false,
  patients = [],
  isLider = false,
  perfil = null,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Atalhos de teclado globais (H7)
  useKeyboard([
    { key: 'k', ctrl: true, action: () => setShowSearch(true) },
    { key: 'Escape', action: () => { setShowSearch(false); setShowHelp(false); } },
  ]);

  const status = perfil ? verificarStatusAssinatura(perfil) : null;
  const nomeExibicao = perfil?.nome?.trim() || userEmail || 'Usuário';
  const inicial = nomeExibicao.charAt(0).toUpperCase();

  const irPara = (id) => {
    onNavigate(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logoutFirebaseUser();
    } catch (err) {
      logger.error('Erro ao sair:', err);
    }
  };

  const ThemeIcon = theme === 'dark' ? Sun : Moon;

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Fundo escuro do menu (celular) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden animate-in"
          style={{ backgroundColor: 'var(--overlay)' }}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          fixed md:static inset-y-0 left-0 z-40 flex flex-col w-[264px] md:w-[248px] shrink-0 transition-transform duration-300 ease-out-expo`}
        style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Marca />
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden ds-btn ds-btn-ghost !px-2"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-3 space-y-2">
          <button
            onClick={() => irPara('nova-sessao')}
            className="ds-btn ds-btn-primary w-full"
            aria-current={currentPath === 'nova-sessao' ? 'page' : undefined}
          >
            <FilePlus2 size={17} />
            Registrar sessão
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-2.5 px-3 rounded-[var(--radius-sm)] text-sm transition-colors min-h-[40px]"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <Search size={16} />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="hidden md:inline text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-sunken)', color: 'var(--text-secondary)' }}>
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3 mt-1">
          {GRUPOS.map((grupo) => {
            const itens = grupo.itens.filter((item) => !item.onlyLider || isLider);
            return (
              <div key={grupo.titulo}>
                <p className="ds-nav-group">{grupo.titulo}</p>
                <div className="space-y-0.5">
                  {itens.map((item) => {
                    const isActive = currentPath === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => irPara(item.id)}
                        className={`ds-nav-item ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
                        {item.name}
                      </button>
                    );
                  })}
                  {grupo.titulo === 'Conta' && (
                    <>
                      <button onClick={() => setShowHelp(true)} className="ds-nav-item">
                        <HelpCircle size={18} strokeWidth={1.7} />
                        Central de ajuda
                      </button>
                      <button onClick={toggleTheme} className="ds-nav-item" aria-pressed={theme === 'dark'}>
                        <ThemeIcon size={18} strokeWidth={1.7} />
                        {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Rodapé: quem está conectado */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          {status?.status === 'trial' && (
            <button
              onClick={() => irPara('perfil')}
              className="w-full mb-2 px-3 py-2 rounded-[var(--radius-sm)] text-left text-xs font-semibold"
              style={{ backgroundColor: 'var(--warm-light)', color: 'var(--warm)' }}
            >
              Teste gratuito: {status.diasRestantesTrial} {status.diasRestantesTrial === 1 ? 'dia restante' : 'dias restantes'}
            </button>
          )}
          <div className="flex items-center gap-2.5 px-1.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
              aria-hidden="true"
            >
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={userEmail}>{nomeExibicao}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {isLider ? 'Líder Clínico(a)' : 'Psicólogo(a)'}
              </p>
            </div>
            <button
              onClick={() => setConfirmLogout(true)}
              className="ds-btn ds-btn-ghost !px-2 !min-h-[36px]"
              aria-label="Sair do sistema"
              title="Sair"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ CONTEÚDO ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior (celular) */}
        <header
          className="h-14 md:hidden sticky top-0 z-20 shrink-0 flex items-center px-2 gap-1"
          style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => setIsSidebarOpen(true)} className="ds-btn ds-btn-ghost !px-2.5" aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="flex-1 flex justify-center">
            <Marca compacta />
          </div>
          <button onClick={() => setShowSearch(true)} className="ds-btn ds-btn-ghost !px-2.5" aria-label="Buscar">
            <Search size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          {fullHeight ? (
            <div className="flex-1 flex flex-col overflow-hidden pb-[72px] md:pb-0">{children}</div>
          ) : (
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-28 md:pb-10">{children}</div>
          )}
        </main>

        {/* Barra inferior (celular) */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-20 safe-bottom"
          style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
          aria-label="Atalhos"
        >
          <div className="grid grid-cols-5">
            {ABAS_MOBILE.map((aba) => {
              const Icon = aba.icon;
              const ativo = currentPath === aba.id;
              return (
                <button
                  key={aba.id}
                  onClick={() => irPara(aba.id)}
                  className="flex flex-col items-center justify-center gap-0.5 h-[60px] text-[11px] font-semibold"
                  style={{ color: ativo ? 'var(--accent)' : 'var(--text-muted)' }}
                  aria-current={ativo ? 'page' : undefined}
                >
                  {/* Mesma altura para todos os ícones: rótulos alinhados */}
                  <span
                    className={`h-8 flex items-center justify-center ${aba.destaque ? 'w-11 rounded-full' : 'w-8'}`}
                    style={aba.destaque ? { backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' } : undefined}
                  >
                    <Icon size={aba.destaque ? 18 : 20} strokeWidth={ativo || aba.destaque ? 2.2 : 1.8} />
                  </span>
                  {aba.name}
                </button>
              );
            })}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 h-[60px] text-[11px] font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="h-8 w-8 flex items-center justify-center"><MoreHorizontal size={20} /></span>
              Mais
            </button>
          </div>
        </nav>
      </div>

      <ConfirmDialog
        isOpen={confirmLogout}
        title="Sair do CARITAS?"
        message="Sua sessão será encerrada neste dispositivo. Para voltar, você entra com senha e código de verificação."
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
        confirmText="Sair"
      />

      {/* Central de Ajuda (H10) */}
      {showHelp && <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />}

      {/* Busca Global (H7) */}
      {showSearch && <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        patients={patients}
        onNavigate={(path, opts) => {
          onNavigate(path, opts);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
      />}
    </div>
  );
}
