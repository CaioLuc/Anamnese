import logger from '../utils/logger';
import { useState } from 'react';
import { criarQuestionario, atualizarQuestionario } from '../services/patientService';
import Button from './ui/Button';
import { 
  Folder, AlignLeft, FileText, CircleDot, CheckSquare, List, Hash, Calendar, 
  Trash2, ChevronUp, ChevronDown, ChevronDown as ChevronDownIcon, X, Plus, Smile
} from 'lucide-react';

const TIPOS_CAMPO = [
  { tipo: 'section', label: 'Separador / Seção', icone: Folder, desc: 'Título visual para organizar seções' },
  { tipo: 'text', label: 'Texto Curto', icone: AlignLeft, desc: 'Uma linha de texto livre' },
  { tipo: 'textarea', label: 'Texto Longo', icone: FileText, desc: 'Área de texto com múltiplas linhas' },
  { tipo: 'radio', label: 'Seleção Única', icone: CircleDot, desc: 'Escolhe apenas uma opção' },
  { tipo: 'checkbox', label: 'Múltipla Escolha', icone: CheckSquare, desc: 'Marca uma ou mais opções' },
  { tipo: 'select', label: 'Lista (Dropdown)', icone: List, desc: 'Seleciona de uma lista' },
  { tipo: 'scale', label: 'Escala Numérica', icone: Hash, desc: 'Avaliação de 1 a 10' },
  { tipo: 'number', label: 'Número', icone: Hash, desc: 'Campo numérico' },
  { tipo: 'date', label: 'Data', icone: Calendar, desc: 'Campo de data' },
];

const EMOJIS = ['📋', '📝', '🧠', '❤️', '🌿', '⚡', '🎯', '🔬', '👤', '🎒', '🏥', '🌟'];

// Editor de opções com inputs individuais (substituindo o textarea)
function OpcoesEditor({ opcoes = [], onChange }) {
  const [novaOpcao, setNovaOpcao] = useState('');

  const addOpcao = () => {
    const val = novaOpcao.trim();
    if (!val) return;
    onChange([...opcoes, val]);
    setNovaOpcao('');
  };

  const removeOpcao = (idx) => {
    onChange(opcoes.filter((_, i) => i !== idx));
  };

  const editOpcao = (idx, val) => {
    const novos = [...opcoes];
    novos[idx] = val;
    onChange(novos);
  };

  return (
    <div>
      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Opções de Resposta</label>

      {/* Lista de opções existentes */}
      {opcoes.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {opcoes.map((opcao, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent)' }} />
              <input
                type="text"
                value={opcao}
                onChange={(e) => editOpcao(idx, e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm rounded-md transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => removeOpcao(idx)}
                className="transition-colors flex-shrink-0 hover:text-red-500"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input para nova opção */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novaOpcao}
          onChange={(e) => setNovaOpcao(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOpcao(); } }}
          placeholder="Nova opção... (Enter para adicionar)"
          className="flex-1 px-3 py-1.5 text-sm rounded-md border border-dashed transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <Button
          type="button"
          onClick={addOpcao}
          size="sm"
        >
          <Plus size={14} />
          Add
        </Button>
      </div>
    </div>
  );
}

function CampoEditor({ campo, onChange, onRemover, onMover, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(true);
  const TipoIcon = TIPOS_CAMPO.find(t => t.tipo === campo.tipo)?.icone || FileText;

  return (
    <div className="rounded-xl overflow-hidden transition-shadow" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', boxShadow: expanded ? 'var(--shadow)' : 'none' }}>
      {/* Header do campo */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: expanded ? '0.5px solid var(--border)' : 'none' }}>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMover('up')} disabled={isFirst} className="disabled:opacity-20 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onMover('down')} disabled={isLast} className="disabled:opacity-20 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="text-sm font-medium flex-1 truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TipoIcon size={16} style={{ color: 'var(--text-muted)' }} />
          {campo.label || <span className="italic" style={{ color: 'var(--text-muted)' }}>(sem título)</span>}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          {TIPOS_CAMPO.find(t => t.tipo === campo.tipo)?.label || campo.tipo}
        </span>

        <button onClick={() => setExpanded(e => !e)} className="transition-transform duration-200" style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDownIcon size={16} />
        </button>
        <button onClick={onRemover} className="transition-colors hover:text-red-500" style={{ color: 'var(--status-danger)' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              {campo.tipo === 'section' ? 'Título da Seção' : 'Pergunta / Rótulo'}
            </label>
            <input
              type="text"
              value={campo.label || ''}
              onChange={(e) => onChange({ ...campo, label: e.target.value })}
              placeholder={campo.tipo === 'section' ? 'Ex: Dados Pessoais' : 'Ex: Qual a queixa principal?'}
              className="ds-input"
            />
          </div>

          {/* Placeholder */}
          {['text', 'textarea', 'number'].includes(campo.tipo) && (
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Placeholder (dica para o paciente)</label>
              <input
                type="text"
                value={campo.placeholder || ''}
                onChange={(e) => onChange({ ...campo, placeholder: e.target.value })}
                placeholder="Ex: Digite aqui..."
                className="ds-input"
              />
            </div>
          )}

          {/* Opções para radio/checkbox/select — agora com UI individual */}
          {['radio', 'checkbox', 'select'].includes(campo.tipo) && (
            <OpcoesEditor
              opcoes={campo.opcoes || []}
              onChange={(novas) => onChange({ ...campo, opcoes: novas })}
            />
          )}

          {/* Escala min/max */}
          {campo.tipo === 'scale' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Mínimo</label>
                <input type="number" value={campo.min ?? 1} onChange={(e) => onChange({ ...campo, min: Number(e.target.value) })}
                  className="ds-input" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Máximo</label>
                <input type="number" value={campo.max ?? 10} onChange={(e) => onChange({ ...campo, max: Number(e.target.value) })}
                  className="ds-input" />
              </div>
            </div>
          )}

          {/* Obrigatório */}
          {campo.tipo !== 'section' && (
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <div
                onClick={() => onChange({ ...campo, obrigatorio: !campo.obrigatorio })}
                className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer`}
                style={{ backgroundColor: campo.obrigatorio ? 'var(--accent)' : 'var(--border)' }}
              >
                <div 
                  className={`absolute top-0.5 w-3 h-3 rounded-full shadow transition-transform ${campo.obrigatorio ? 'translate-x-4' : 'translate-x-0.5'}`} 
                  style={{ backgroundColor: '#FFFFFF' }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Campo obrigatório</span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionarioBuilder({ template, onSalvar, onCancelar }) {
  const [nome, setNome] = useState(template?.nome || '');
  const [descricao, setDescricao] = useState(template?.descricao || '');
  const [icone, setIcone] = useState(template?.icone || '📝');
  const [campos, setCampos] = useState(template?.campos || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  const addCampo = (tipo) => {
    const novo = {
      id: `f_${Date.now()}`,
      ordem: campos.length,
      tipo,
      label: '',
      placeholder: '',
      opcoes: ['radio', 'checkbox', 'select'].includes(tipo) ? ['Sim', 'Não'] : [],
      obrigatorio: false,
      ...(tipo === 'scale' ? { min: 1, max: 10 } : {}),
    };
    setCampos([...campos, novo]);
  };

  const updateCampo = (idx, campoAtualizado) => {
    const novos = [...campos];
    novos[idx] = campoAtualizado;
    setCampos(novos);
  };

  const removeCampo = (idx) => {
    setCampos(campos.filter((_, i) => i !== idx));
  };

  const moverCampo = (idx, dir) => {
    const novos = [...campos];
    const alvo = dir === 'up' ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= novos.length) return;
    [novos[idx], novos[alvo]] = [novos[alvo], novos[idx]];
    setCampos(novos.map((c, i) => ({ ...c, ordem: i })));
  };

  const handleSalvar = async () => {
    setError('');
    if (!nome.trim()) { setError('O nome do questionário é obrigatório.'); return; }
    if (campos.length === 0) { setError('Adicione pelo menos um campo.'); return; }

    setIsSaving(true);
    try {
      const dados = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        icone,
        tipo: 'custom',
        campos: campos.map((c, i) => ({ ...c, ordem: i })),
      };
      if (template?.id) {
        await atualizarQuestionario(template.id, dados);
      } else {
        await criarQuestionario(dados);
      }
      onSalvar();
    } catch (e) {
      logger.error('Erro ao salvar questionário:', e);
      if (e?.code === 'permission-denied') {
        setError('Sem permissão. Verifique se você está logado e tente novamente.');
      } else if (e?.code?.includes('auth')) {
        setError('Sessão expirada. Faça login novamente.');
      } else {
        setError(`Erro ao salvar: ${e?.message || 'Tente novamente.'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" onClick={() => showEmojis && setShowEmojis(false)}>
      {/* Header */}
      <div 
        className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between gap-4"
        style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojis(s => !s); }}
              className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-transform hover:scale-110"
              style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
            >
              {icone}
            </button>
            {showEmojis && (
              <div
                className="absolute top-12 left-0 z-50 flex flex-wrap gap-1.5 p-3 rounded-2xl shadow-2xl w-52"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}
              >
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setIcone(e); setShowEmojis(false); }}
                    className="text-xl w-8 h-8 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do questionário..."
              className="w-full text-lg font-heading font-bold bg-transparent placeholder-slate-400 focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            />
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição curta (opcional)..."
              className="w-full text-sm bg-transparent placeholder-slate-400 focus:outline-none mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={isSaving}>
            {isSaving ? 'Salvando...' : template?.id ? 'Salvar Alterações' : 'Publicar'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '0.5px solid var(--status-danger)' }}>
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Campos list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {campos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--border)' }}>
              <Plus size={32} className="mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Seu questionário está vazio</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Adicione campos usando o painel à direita</p>
            </div>
          ) : (
            campos.map((campo, idx) => (
              <CampoEditor
                key={campo.id}
                campo={campo}
                onChange={(c) => updateCampo(idx, c)}
                onRemover={() => removeCampo(idx)}
                onMover={(dir) => moverCampo(idx, dir)}
                isFirst={idx === 0}
                isLast={idx === campos.length - 1}
              />
            ))
          )}
        </div>

        {/* Sidebar de tipos */}
        <div className="w-64 flex-shrink-0 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '0.5px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Adicionar Campo</p>
          <div className="space-y-1.5">
            {TIPOS_CAMPO.map(({ tipo, label, icone: Icon, desc }) => (
              <button
                key={tipo}
                onClick={() => addCampo(tipo)}
                className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all group"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Icon size={18} className="mt-0.5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
