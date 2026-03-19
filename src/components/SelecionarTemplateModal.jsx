import { useState, useEffect } from 'react';
import { lerQuestionarios } from '../services/patientService';
import { TEMPLATES_PADRAO } from '../services/templatesPadrao';

export default function SelecionarTemplateModal({ isOpen, onClose, onSelecionar }) {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    lerQuestionarios()
      .then(setCustomTemplates)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const todos = [...TEMPLATES_PADRAO, ...customTemplates];
  const filtrados = !busca ? todos : todos.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()));

  const TemplateCarda = ({ template }) => {
    const totalCampos = (template.campos || []).filter(c => c.tipo !== 'section').length;
    const isPadrao = template.tipo === 'padrao';

    return (
      <button
        onClick={() => onSelecionar(template)}
        className="w-full text-left group bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-2xl p-4 transition-all hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5 flex-shrink-0">{template.icone || '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white text-sm leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                {template.nome}
              </span>
              {isPadrao && (
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                  Padrão
                </span>
              )}
            </div>
            {template.descricao && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{template.descricao}</p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              📋 {totalCampos} campo{totalCampos !== 1 ? 's' : ''}
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Escolher Questionário</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Selecione o modelo para esta anamnese</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Busca */}
        <div className="px-6 py-3 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar questionário..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="w-7 h-7 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum questionário encontrado.</p>
            </div>
          ) : (
            filtrados.map(template => (
              <TemplateCarda key={template.id} template={template} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
