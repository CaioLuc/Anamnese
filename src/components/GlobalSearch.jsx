import { useState, useEffect, useRef, useMemo } from 'react';
import { useEscapeKey } from '../hooks/useKeyboard';
import { trackAction } from '../services/logService';

/**
 * GlobalSearch — Command Palette estilo Spotlight (Ctrl+K).
 * Busca pacientes pelo nome/CPF e oferece ações rápidas de navegação.
 */
export default function GlobalSearch({ isOpen, onClose, patients = [], onNavigate }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEscapeKey(isOpen, onClose);

  // Focar no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Ações rápidas
  const quickActions = useMemo(() => [
    { type: 'action', icon: '👤', label: 'Novo Paciente', description: 'Cadastrar um novo paciente', path: 'pacientes', actionType: 'addPatient' },
    { type: 'action', icon: '📝', label: 'Nova Sessão', description: 'Registrar evolução clínica', path: 'nova-sessao' },
    { type: 'action', icon: '📅', label: 'Abrir Agenda', description: 'Ver agendamentos', path: 'agenda' },
    { type: 'action', icon: '💰', label: 'Financeiro', description: 'Ver painel financeiro', path: 'financas' },
    { type: 'action', icon: '📋', label: 'Questionários', description: 'Gerenciar modelos', path: 'questionarios' },
    { type: 'action', icon: '🏥', label: 'Locais', description: 'Gerenciar clínicas', path: 'clinicas' },
    { type: 'action', icon: '🏠', label: 'Dashboard', description: 'Voltar ao início', path: 'dashboard' },
  ], []);

  // Filtrar resultados
  const results = useMemo(() => {
    const items = [];
    const lower = query.toLowerCase().trim();

    if (!lower) {
      // Sem query: mostrar ações rápidas
      return quickActions;
    }

    // Buscar pacientes
    const matchingPatients = patients
      .filter(p => {
        const nome = (p.nome || '').toLowerCase();
        const cpf = (p.cpf || '');
        return nome.includes(lower) || cpf.includes(lower.replace(/\D/g, ''));
      })
      .slice(0, 6)
      .map(p => ({
        type: 'patient',
        icon: '👤',
        label: p.nome,
        description: p.clinica || (p.cpf ? `CPF: ${p.cpf}` : 'Sem informação adicional'),
        patient: p,
        path: 'pacientes',
      }));

    items.push(...matchingPatients);

    // Buscar ações que correspondam
    const matchingActions = quickActions.filter(a =>
      a.label.toLowerCase().includes(lower) || a.description.toLowerCase().includes(lower)
    );

    items.push(...matchingActions);

    return items;
  }, [query, patients, quickActions]);

  // Resetar a seleção quando os resultados mudam
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Navegação por teclado
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      const selected = results[selectedIndex];
      handleSelect(selected);
    }
  };

  // Scroll automático no item selecionado
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.children[selectedIndex];
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (item) => {
    onClose();
    trackAction('SEARCH_SELECT', { query, type: item.type, label: item.label, path: item.path });
    if (item.type === 'patient') {
      onNavigate(item.path, { openPatient: item.patient });
    } else if (item.actionType === 'addPatient') {
      onNavigate(item.path, { addPatient: true });
    } else {
      onNavigate(item.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[15vh] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-white/10">
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paciente, ação ou tela..."
            className="flex-1 py-4 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto custom-scrollbar py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <>
              {!query.trim() && (
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações Rápidas</p>
              )}
              {query.trim() && results.some(r => r.type === 'patient') && (
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pacientes</p>
              )}
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.label}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    selectedIndex === idx
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      selectedIndex === idx ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                  </div>
                  {selectedIndex === idx && (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded">
                      ↵
                    </kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-[9px] font-mono">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-[9px] font-mono">↵</kbd> abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-white/10 rounded text-[9px] font-mono">esc</kbd> fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
