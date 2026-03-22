import { useState, useEffect } from 'react';
import { logoutFirebaseUser, subscribeToAuthChanges } from '../services/authService';
import ConfirmDialog from './ConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';

export default function Layout({ children, currentPath, onNavigate, userEmail, fullHeight = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // A visibilidade em desktop agora é garantida pelo Tailwind (lg:translate-x-0), não precisamos mais do JavaScript resize listener para isso.

  const navigation = [
    { 
      name: 'Dashboard', 
      id: 'dashboard',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Pacientes', 
      id: 'pacientes',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      name: 'Nova Sessão', 
      id: 'nova-sessao',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      name: 'Agenda',
      id: 'agenda',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Financeiro',
      id: 'financas',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      name: 'Questionários',
      id: 'questionarios',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutFirebaseUser();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <div className="flex w-full h-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Sidebar Overlay (Mobile) — aparece quando o menu está ABERTO */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          fixed lg:static inset-y-0 left-0 z-30 w-64 lg:w-72 bg-slate-50/50 dark:bg-zinc-950/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 flex flex-col transition-transform duration-300 ease-in-out`}
      >
        <div className="h-20 flex items-center justify-between px-6 mb-4 border-b border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl shadow-inner group-hover:bg-indigo-500/30 transition-colors">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              PsycoBrain
            </h1>
          </div>
          
          {/* Close Sidebar (Mobile) */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-1 mt-2">
            {navigation.map((item) => {
              const isActive = currentPath === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                     onNavigate(item.id);
                     if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-indigo-500/10 text-indigo-400 shadow-inner' 
                      : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'}
                  `}
                >
                  <span className={`${isActive ? 'text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-white/5 flex flex-col gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors mb-2"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tema Claro / Escuro</span>
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{userEmail || 'Usuário'}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">Psicólogo(a)</span>
            </div>
          </div>
          <button 
            onClick={() => setConfirmLogout(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950 relative">
        <header className="h-16 lg:h-0 sticky top-0 z-10 flex-shrink-0 flex items-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 lg:border-none px-4 lg:hidden">
            <button
               onClick={() => setIsSidebarOpen(true)}
               className="p-2.5 mr-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
               PsycoBrain
            </h1>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          {fullHeight ? (
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
          ) : (
            <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 w-full">{children}</div>
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
    </div>
  );
}
