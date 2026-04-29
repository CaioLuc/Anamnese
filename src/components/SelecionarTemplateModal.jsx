import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { lerQuestionarios } from '../services/patientService';
import { TEMPLATES_PADRAO } from '../services/templatesPadrao';

const TemplateCarda = ({ template, onSelecionar }) => {
  const totalCampos = (template.campos || []).filter(c => c.tipo !== 'section').length;
  const isPadrao = template.tipo === 'padrao';

  return (
    <button
      onClick={() => onSelecionar(template)}
      className="w-full text-left group ds-card hover:shadow-md p-4 transition-all"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5 flex-shrink-0">{template.icone || '📋'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm leading-tight transition-colors" style={{ color: 'var(--text-primary)' }}>
              {template.nome || 'Questionário Sem Nome'}
            </span>
            {isPadrao && (
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                Padrão
              </span>
            )}
          </div>
          {template.descricao && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{template.descricao}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            📋 {totalCampos} campo{totalCampos !== 1 ? 's' : ''}
          </p>
        </div>
        <svg className="w-5 h-5 transition-colors flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};

export default function SelecionarTemplateModal({ isOpen, onClose, onSelecionar }) {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setIsError(false);
    lerQuestionarios()
      .then(templates => {
        setCustomTemplates(Array.isArray(templates) ? templates : []);
      })
      .catch(err => {
        logger.error('Falha ao carregar questionários customizados:', err);
        setCustomTemplates([]);
        setIsError(true);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const todos = [...TEMPLATES_PADRAO, ...customTemplates];
  const filtrados = !busca ? todos : todos.filter(t => (t?.nome || '').toLowerCase().includes(busca.toLowerCase()));



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'var(--overlay)' }}>
      <div className="ds-card relative w-full max-w-lg flex flex-col max-h-[80vh]" style={{ borderRadius: '16px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Escolher Questionário</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Selecione o modelo para esta anamnese</p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
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
              className="ds-input pl-9"
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
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum questionário encontrado.</p>
            </div>
          ) : (
            filtrados.map(template => (
              <TemplateCarda key={template.id} template={template} onSelecionar={onSelecionar} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
