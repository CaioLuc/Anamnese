import logger from '../utils/logger';
import { useState } from 'react';
import { logoutFirebaseUser } from '../services/authService';
import ConfirmDialog from './ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';
import HelpPanel from './HelpPanel';
import GlobalSearch from './GlobalSearch';
import { useKeyboard } from '../hooks/useKeyboard';
import { useToast } from '../contexts/ToastContext';
import { 
  LayoutDashboard, Users, FileText, Calendar, DollarSign, 
  Building2, ClipboardList, Trash2, Search, HelpCircle, 
  Sun, Moon, LogOut, Menu, X 
} from 'lucide-react';

export default function Layout({ children, currentPath, onNavigate, userEmail, fullHeight = false, patients = [] }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  // Atalhos de teclado globais (H7)
  useKeyboard([
    { key: 'k', ctrl: true, action: () => setShowSearch(true) },
    { key: 'Escape', action: () => { setShowSearch(false); setShowHelp(false); } },
  ]);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'Pacientes', id: 'pacientes', icon: Users },
    { name: 'Nova Sessão', id: 'nova-sessao', icon: FileText },
    { name: 'Agenda', id: 'agenda', icon: Calendar },
    { name: 'Financeiro', id: 'financas', icon: DollarSign },
    { name: 'Locais', id: 'clinicas', icon: Building2 },
    { name: 'Questionários', id: 'questionarios', icon: ClipboardList },
    { name: 'Lixeira', id: 'lixeira', icon: Trash2 },
  ];

  const handleLogout = async () => {
    try {
      await logoutFirebaseUser();
    } catch (err) {
      logger.error('Erro ao sair:', err);
    }
  };

  return (
    <div className="flex w-full h-full overflow-hidden font-sans" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'var(--overlay)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          fixed md:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 ease-in-out`}
        style={{ 
          width: '220px', 
          minWidth: '220px',
          backgroundColor: 'var(--bg-sidebar)',
        }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <h1 className="text-lg font-heading font-semibold" style={{ color: '#FFFFFF' }}>
            Caritas
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-1 rounded"
            style={{ color: 'var(--text-sidebar)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = currentPath === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`ds-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {item.name}
              </button>
            );
          })}

          <div className="pt-4 space-y-0.5">
            <button
              onClick={() => setShowSearch(true)}
              className="ds-nav-item"
            >
              <Search size={18} strokeWidth={1.5} />
              <span className="flex-1 text-left">Buscar</span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>⌘K</kbd>
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="ds-nav-item"
            >
              <HelpCircle size={18} strokeWidth={1.5} />
              Central de Ajuda
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 space-y-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="ds-nav-item justify-between"
          >
            <span className="text-xs font-medium">Tema</span>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-sidebar-active)' }}>{userEmail || 'Usuário'}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Psicólogo(a)</span>
            </div>
          </div>

          {/* Logout */}
          <button 
            onClick={() => setConfirmLogout(true)}
            className="ds-nav-item text-xs gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={15} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Mobile Topbar */}
        <header 
          className="h-14 md:hidden sticky top-0 z-10 flex-shrink-0 flex items-center px-4 gap-3"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderBottom: '0.5px solid var(--border)' 
          }}
        >
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md transition-colors duration-150"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>
            Caritas
          </h1>
          <div className="flex-1" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md transition-colors duration-150"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          {fullHeight ? (
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
          ) : (
            <div className="max-w-7xl mx-auto w-full" style={{ padding: '20px 24px' }}>{children}</div>
          )}
        </main>
      </div>

      {/* Modal de Logout */}
      <ConfirmDialog
        isOpen={confirmLogout}
        title="Sair do Sistema"
        message="Tem certeza de que deseja encerrar a sua sessão? Você precisará entrar novamente para acessar seus pacientes."
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
        confirmText="Sair da Conta"
      />

      {/* Central de Ajuda (H10) */}
      <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Busca Global (H7) */}
      <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        patients={patients}
        onNavigate={(path, opts) => {
          onNavigate(path, opts);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
      />
    </div>
  );
}
