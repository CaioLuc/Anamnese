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
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Plus, Search, FileText, Copy, Edit2, Trash2, LayoutList, GripHorizontal } from 'lucide-react';

const TIPO_ICONS = { padrao: FileText, custom: Edit2 };

function TemplateCard({ template, onEditar, onDuplicar, onDeletar, isPadrao }) {
  const totalCampos = (template.campos || []).filter(c => c.tipo !== 'section').length;
  const totalSecoes = (template.campos || []).filter(c => c.tipo === 'section').length;
  const Icone = template.icone ? () => <span>{template.icone}</span> : (isPadrao ? FileText : Edit2);

  return (
    <div className="ds-card p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/50 group" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="text-2xl text-slate-400 group-hover:text-indigo-400 transition-colors">
            {template.icone ? <span>{template.icone}</span> : <Icone size={24} />}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{template.nome}</h3>
            {isPadrao && (
              <span className="inline-block mt-1">
                  <Badge variant="info">Padrão</Badge>
              </span>
            )}
          </div>
        </div>
      </div>

      {template.descricao && (
        <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{template.descricao}</p>
      )}

      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <GripHorizontal size={12} />
          {totalCampos} campos
        </span>
        <span className="flex items-center gap-1.5">
          <LayoutList size={12} />
          {totalSecoes} seções
        </span>
      </div>

      <div className="flex gap-2 pt-3 mt-auto" style={{ borderTop: '0.5px solid var(--border)' }}>
        {!isPadrao && onEditar && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onEditar(template)}
          >
            <Edit2 size={14} />
            Editar
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onDuplicar(template)}
        >
          <Copy size={14} />
          Duplicar
        </Button>
        {!isPadrao && onDeletar && (
          <Button
            variant="danger"
            size="sm"
            className="px-2"
            onClick={() => onDeletar(template)}
          >
            <Trash2 size={16} />
          </Button>
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

  const Spinner = () => (
    <div className="flex items-center justify-center h-40">
      <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Questionários</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Crie e gerencie seus modelos de anamnese personalizados</p>
          </div>
          <Button onClick={handleNovoTemplate} className="flex-shrink-0">
            <Plus size={18} />
            Novo Questionário
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar questionários..."
            className="ds-input pl-10 max-w-md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {isLoading ? (
          <Spinner />
        ) : todosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <FileText size={48} className="mb-3 opacity-20" style={{ color: 'var(--text-primary)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum questionário encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Clique em "Novo Questionário" para criar seu primeiro modelo personalizado.</p>
          </div>
        ) : (
          <>
            {/* Padrões */}
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Modelos Padrão</h2>
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
                <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Personalizados</h2>
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
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDeletar}
        title="Excluir Questionário"
        message={`Tem certeza que deseja excluir o questionário "${confirmDelete?.nome}"? Esta ação não pode ser desfeita.`}
        variant="danger"
      />
    </div>
  );
}
