import { useState, useEffect } from 'react';
import {
  lerQuestionarios,
  criarQuestionario,
  deletarQuestionario,
  duplicarQuestionario
} from '../services/patientService';
import { TEMPLATES_PADRAO } from '../services/templatesPadrao';
import ConfirmDialog from './ConfirmDialog';
import QuestionarioBuilder from './QuestionarioBuilder';

const TIPO_ICONS = { padrao: '📋', custom: '✏️' };

function TemplateCard({ template, onEditar, onDuplicar, onDeletar, isPadrao }) {
  const totalCampos = (template.campos || []).filter(c => c.tipo !== 'section').length;
  const totalSecoes = (template.campos || []).filter(c => c.tipo === 'section').length;

  return (
    <div className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.icone || (isPadrao ? '📋' : '📝')}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">{template.nome}</h3>
            {isPadrao && (
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md">Padrão</span>
            )}
          </div>
        </div>
      </div>

      {template.descricao && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{template.descricao}</p>
      )}

      <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          {totalCampos} campos
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          {totalSecoes} seções
        </span>
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
        {!isPadrao && onEditar && (
          <button
            onClick={() => onEditar(template)}
            className="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
          >
            ✏️ Editar
          </button>
        )}
        <button
          onClick={() => onDuplicar(template)}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          📋 Duplicar
        </button>
        {!isPadrao && onDeletar && (
          <button
            onClick={() => onDeletar(template)}
            className="text-xs py-1.5 px-2 rounded-lg font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

export default function Questionarios() {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busca, setBusca] = useState('');

  const carregarTemplates = async () => {
    setIsLoading(true);
    try {
      const docs = await lerQuestionarios();
      setCustomTemplates(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { carregarTemplates(); }, []);

  const handleNovoTemplate = () => {
    setEditingTemplate(null);
    setShowBuilder(true);
  };

  const handleEditar = (template) => {
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  const handleDuplicar = async (template) => {
    try {
      if (template.tipo === 'padrao') {
        // Duplica template padrão para custom
        const { id, ...dados } = template;
        await criarQuestionario({
          ...dados,
          nome: `${template.nome} (cópia)`,
          tipo: 'custom',
          icone: '📝',
        });
      } else {
        await duplicarQuestionario(template.id);
      }
      carregarTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletar = async () => {
    if (!confirmDelete) return;
    try {
      await deletarQuestionario(confirmDelete.id);
      setConfirmDelete(null);
      carregarTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSalvarBuilder = async () => {
    setShowBuilder(false);
    setEditingTemplate(null);
    carregarTemplates();
  };

  const todosFiltrados = [
    ...TEMPLATES_PADRAO,
    ...customTemplates
  ].filter(t => !busca || t.nome.toLowerCase().includes(busca.toLowerCase()));

  if (showBuilder) {
    return (
      <QuestionarioBuilder
        template={editingTemplate}
        onSalvar={handleSalvarBuilder}
        onCancelar={() => { setShowBuilder(false); setEditingTemplate(null); }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Questionários</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Crie e gerencie seus modelos de anamnese personalizados</p>
          </div>
          <button
            onClick={handleNovoTemplate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Questionário
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar questionários..."
            className="w-full max-w-md pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : todosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhum questionário encontrado</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Novo Questionário" para criar seu primeiro modelo personalizado.</p>
          </div>
        ) : (
          <>
            {/* Padrões */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Modelos Padrão</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {todosFiltrados.filter(t => t.tipo === 'padrao').map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isPadrao={true}
                    onDuplicar={handleDuplicar}
                  />
                ))}
              </div>
            </div>

            {/* Personalizados */}
            {todosFiltrados.filter(t => t.tipo !== 'padrao').length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Personalizados</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {todosFiltrados.filter(t => t.tipo !== 'padrao').map(t => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isPadrao={false}
                      onEditar={handleEditar}
                      onDuplicar={handleDuplicar}
                      onDeletar={setConfirmDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeletar}
        title="Excluir Questionário"
        message={`Tem certeza que deseja excluir o questionário "${confirmDelete?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
