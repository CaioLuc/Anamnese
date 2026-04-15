import { useState, useEffect, useRef } from 'react';
import { HELP_DATA, searchHelp } from '../utils/helpData';

/**
 * HelpPanel — Painel lateral deslizante de ajuda/FAQ.
 * Acessível de qualquer tela via botão no Layout.
 */
export default function HelpPanel({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  // Focar na busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 200);
    } else {
      setSearchTerm('');
      setExpandedItem(null);
    }
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const searchResults = searchTerm.trim().length >= 2 ? searchHelp(searchTerm) : [];
  const isSearching = searchTerm.trim().length >= 2;

  const toggleCategory = (cat) => {
    setExpandedCategory(prev => prev === cat ? null : cat);
    setExpandedItem(null);
  };

  const toggleItem = (key) => {
    setExpandedItem(prev => prev === key ? null : key);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-[401] h-full w-full max-w-md bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-white/10 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Central de Ajuda</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dúvidas frequentes e guias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ajuda..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {isSearching ? (
            /* === Search Results === */
            searchResults.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum resultado para "{searchTerm}"</p>
                <p className="text-xs text-slate-400 mt-1">Tente buscar com outros termos.</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                </p>
                {searchResults.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleItem(`search-${idx}`)}
                      className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{item.question}</p>
                        <p className="text-[10px] text-indigo-400 font-medium mt-1">{item.category}</p>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${expandedItem === `search-${idx}` ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedItem === `search-${idx}` && (
                      <div className="px-4 pb-4 border-t border-slate-200 dark:border-white/5">
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-3 whitespace-pre-line">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )
          ) : (
            /* === Categories (Default View) === */
            HELP_DATA.map((section) => (
              <div key={section.category} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(section.category)}
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <span className="text-xl">{section.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{section.category}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{section.items.length} pergunta{section.items.length > 1 ? 's' : ''}</p>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expandedCategory === section.category ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedCategory === section.category && (
                  <div className="border-t border-slate-200 dark:border-white/5 divide-y divide-slate-200 dark:divide-white/5">
                    {section.items.map((item, idx) => {
                      const key = `${section.category}-${idx}`;
                      return (
                        <div key={key}>
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <svg className={`w-3.5 h-3.5 text-indigo-400 shrink-0 transition-transform ${expandedItem === key ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{item.question}</p>
                          </button>
                          {expandedItem === key && (
                            <div className="px-4 pb-4 ml-6">
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{item.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-zinc-950">
          <p className="text-xs text-center text-slate-400">
            Não encontrou o que procura? Entre em contato com o suporte.
          </p>
        </div>
      </div>
    </>
  );
}
