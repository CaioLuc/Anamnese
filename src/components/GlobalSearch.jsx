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
      <div className="relative w-full max-w-lg ds-card rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: '1px solid var(--border)' }}>
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
            className="flex-1 py-4 bg-transparent text-sm placeholder-slate-400 focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto custom-scrollbar py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum resultado para "{query}"</p>
            </div>
          ) : (
            <>
              {!query.trim() && (
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ações Rápidas</p>
              )}
              {query.trim() && results.some(r => r.type === 'patient') && (
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pacientes</p>
              )}
              {results.map((item, idx) => (
                <button
                  key={`${item.type}-${item.label}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
                  style={{
                    backgroundColor: selectedIndex === idx ? 'var(--accent-light)' : 'transparent'
                  }}
                >
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: selectedIndex === idx ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {item.label}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  </div>
                  {selectedIndex === idx && (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      ↵
                    </kbd>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>↵</kbd> abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>esc</kbd> fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
