import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { criarQuestionario, atualizarQuestionario } from '../services/patientService';
import Button from './ui/Button';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import {
  Folder, AlignLeft, FileText, CircleDot, CheckSquare, List, Hash, Calendar, 
  Trash2, ChevronUp, ChevronDown, ChevronDown as ChevronDownIcon, X, Plus, Smile,
  ClipboardList, Activity, Heart, Target, User, GraduationCap, Building2, BookOpen,
  CheckCircle2, Star, Sparkles
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

const AVAILABLE_ICONS = [
  { id: 'clipboard', label: 'Prontuário', icon: ClipboardList },
  { id: 'file-text', label: 'Texto', icon: FileText },
  { id: 'activity', label: 'Saúde Mental', icon: Activity },
  { id: 'heart', label: 'Acolhimento', icon: Heart },
  { id: 'target', label: 'Metas', icon: Target },
  { id: 'user', label: 'Adulto', icon: User },
  { id: 'graduation-cap', label: 'Adolescente', icon: GraduationCap },
  { id: 'building', label: 'Clínica', icon: Building2 },
  { id: 'book-open', label: 'Histórico', icon: BookOpen },
  { id: 'check-circle', label: 'Checklist', icon: CheckCircle2 },
  { id: 'star', label: 'Destaque', icon: Star },
  { id: 'sparkles', label: 'Evolução', icon: Sparkles },
];

const renderIconById = (id, size = 20) => {
  const found = AVAILABLE_ICONS.find(item => item.id === id);
  if (found) {
    const IconComp = found.icon;
    return <IconComp size={size} />;
  }
  return <ClipboardList size={size} />;
};

// Área de toque mínima de 44px no mobile (WCAG 2.5.5)
const TOQUE_44 = 'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center';

const limitar = (v, lo, hi) => Math.min(hi, Math.max(lo, parseInt(v, 10) || 0));

// Retorna a descrição do primeiro problema que impede salvar, ou '' se estiver tudo certo
function primeiroProblema(nome, campos) {
  if (!nome.trim()) return 'O nome do questionário é obrigatório.';
  if (campos.length === 0) return 'Adicione pelo menos um campo.';
  for (const [i, c] of campos.entries()) {
    const ref = c.label?.trim() ? `Campo ${i + 1} ("${c.label.trim()}")` : `Campo ${i + 1}`;
    if (!c.label?.trim()) return `${ref}: o título/pergunta não pode ficar vazio.`;
    if (['radio', 'checkbox', 'select'].includes(c.tipo)) {
      const opcoes = (c.opcoes || []).map(o => o.trim().toLowerCase());
      if (opcoes.length === 0) return `${ref}: adicione pelo menos uma opção.`;
      if (opcoes.includes('')) return `${ref}: há uma opção em branco.`;
      if (new Set(opcoes).size !== opcoes.length) return `${ref}: há opções duplicadas.`;
    }
    if (c.tipo === 'scale' && (c.min ?? 1) >= (c.max ?? 10)) return `${ref}: o mínimo da escala deve ser menor que o máximo.`;
  }
  return '';
}

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
                aria-label={`Opção ${idx + 1}`}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-md transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => removeOpcao(idx)}
                aria-label={`Remover opção ${opcao || idx + 1}`}
                className={`${TOQUE_44} transition-colors flex-shrink-0 hover:text-red-500`}
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
          className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-md border border-dashed transition-colors"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <Button
          type="button"
          onClick={addOpcao}
          size="sm"
          className="shrink-0 max-sm:min-h-[44px]"
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
    <div id={`campo-${campo.id}`} className="rounded-xl overflow-hidden transition-shadow scroll-my-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: expanded ? 'var(--shadow)' : 'none' }}>
      {/* Header do campo */}
      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMover('up')} disabled={isFirst} aria-label="Mover campo para cima" className={`${TOQUE_44} disabled:opacity-20 transition-colors`} style={{ color: 'var(--text-muted)' }}>
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onMover('down')} disabled={isLast} aria-label="Mover campo para baixo" className={`${TOQUE_44} disabled:opacity-20 transition-colors`} style={{ color: 'var(--text-muted)' }}>
            <ChevronDown size={14} />
          </button>
        </div>

        <span className="text-sm font-medium flex-1 min-w-0 truncate flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TipoIcon size={16} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          {campo.label || <span className="italic" style={{ color: 'var(--text-muted)' }}>(sem título)</span>}
        </span>
        {/* No mobile o ícone já indica o tipo; o badge cede espaço aos alvos de toque */}
        <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          {TIPOS_CAMPO.find(t => t.tipo === campo.tipo)?.label || campo.tipo}
        </span>

        <button onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Recolher campo' : 'Expandir campo'} aria-expanded={expanded} className={`${TOQUE_44} transition-transform duration-200`} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDownIcon size={16} />
        </button>
        <button onClick={onRemover} aria-label="Remover campo" className={`${TOQUE_44} transition-colors hover:text-red-500`} style={{ color: 'var(--status-danger)' }}>
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
                {/* Mínimo 0..10; ao sair, empurra o máximo se ficou igual/menor */}
                <input type="number" min={0} max={10} value={campo.min ?? 1}
                  onChange={(e) => onChange({ ...campo, min: limitar(e.target.value, 0, 10) })}
                  onBlur={() => (campo.max ?? 10) <= (campo.min ?? 1) && onChange({ ...campo, max: (campo.min ?? 1) + 1 })}
                  className="ds-input" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Máximo</label>
                {/* Máximo (mínimo+1)..20 → no máximo 21 botões; o piso só é aplicado no blur para não travar a digitação */}
                <input type="number" min={(campo.min ?? 1) + 1} max={20} value={campo.max ?? 10}
                  onChange={(e) => onChange({ ...campo, max: limitar(e.target.value, 0, 20) })}
                  onBlur={() => onChange({ ...campo, max: limitar(campo.max ?? 10, (campo.min ?? 1) + 1, 20) })}
                  className="ds-input" />
              </div>
            </div>
          )}

          {/* Obrigatório */}
          {campo.tipo !== 'section' && (
            <label className="flex items-center gap-2 cursor-pointer pt-2 min-h-[44px] sm:min-h-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!campo.obrigatorio}
                onChange={(e) => onChange({ ...campo, obrigatorio: e.target.checked })}
              />
              <div
                aria-hidden="true"
                className="relative w-8 h-4 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500"
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
  const [icone, setIcone] = useState(template?.icone || 'clipboard');
  const [campos, setCampos] = useState(template?.campos || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const { showToast } = useToast();

  // "Sujo" = difere do estado inicial; o useState guarda só o snapshot do 1º render
  const snapshotAtual = JSON.stringify({ nome, descricao, icone, campos });
  const [snapshotInicial] = useState(snapshotAtual);
  const dirty = snapshotAtual !== snapshotInicial;
  useUnsavedChanges(dirty);

  // Campo recém-criado ou movido: rola até ele e acende o contorno, para o olho achar onde ele foi parar
  const [destaque, setDestaque] = useState(null);
  useEffect(() => {
    const el = destaque && document.getElementById(`campo-${destaque.id}`);
    if (!el) return;
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduzido ? 'auto' : 'smooth' });
    el.classList.remove('ds-arrive');
    void el.offsetWidth; // reinicia a animação quando o mesmo campo é movido de novo
    el.classList.add('ds-arrive');
  }, [destaque]);

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
    setDestaque({ id: novo.id, vez: Date.now() });
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
    setDestaque({ id: novos[alvo].id, vez: Date.now() });
  };

  const handleSalvar = async () => {
    setError('');
    const problema = primeiroProblema(nome, campos);
    if (problema) {
      setError(problema);
      showToast({ type: 'error', message: problema });
      return;
    }

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

  useKeyboard([
    { key: 's', ctrl: true, action: () => { if (!isSaving) handleSalvar(); } },
  ]);

  const obrigatorios = campos.filter((c) => c.obrigatorio).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" onClick={() => showEmojis && setShowEmojis(false)}>
      {/* Header */}
      <div 
        className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
        style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojis(s => !s); }}
              aria-label="Escolher ícone"
              aria-expanded={showEmojis}
              className="w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
              title="Escolher ícone"
            >
              {renderIconById(icone, 20)}
            </button>
            {showEmojis && (
              <div
                className="absolute top-12 left-0 z-50 grid grid-cols-4 gap-1.5 p-3 rounded-2xl shadow-2xl w-52"
                onClick={(e) => e.stopPropagation()}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                {AVAILABLE_ICONS.map(item => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setIcone(item.id); setShowEmojis(false); }}
                      className={`p-2 rounded-xl transition-colors flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 ${icone === item.id ? 'ring-2 ring-brand-500' : ''}`}
                      title={item.label}
                      aria-label={item.label}
                      aria-pressed={icone === item.id}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <IconComp size={18} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do questionário..."
              className="w-full min-w-0 text-lg font-heading font-bold bg-transparent placeholder-slate-400 focus:outline-none border-b border-transparent focus:border-brand-500 pb-0.5 transition-colors"
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
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => (dirty ? setConfirmarDescarte(true) : onCancelar())}>
            Cancelar
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={handleSalvar} disabled={isSaving}>
            {isSaving ? 'Salvando...' : template?.id ? 'Salvar Alterações' : 'Publicar'}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '1px solid var(--status-danger)' }}>
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Campos list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 custom-scrollbar" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {campos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--border)' }}>
              <Plus size={32} className="mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Seu questionário está vazio</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Adicione campos usando o painel &quot;Adicionar Campo&quot;</p>
            </div>
          ) : (
            <>
            <p className="text-xs tabular" style={{ color: 'var(--text-muted)' }} aria-live="polite">
              {campos.length} {campos.length === 1 ? 'campo' : 'campos'}
              {obrigatorios > 0 && ` · ${obrigatorios} ${obrigatorios === 1 ? 'obrigatório' : 'obrigatórios'}`}
              <span className="hidden sm:inline"> · Ctrl+S salva</span>
            </p>
            {campos.map((campo, idx) => (
              <CampoEditor
                key={campo.id}
                campo={campo}
                onChange={(c) => updateCampo(idx, c)}
                onRemover={() => removeCampo(idx)}
                onMover={(dir) => moverCampo(idx, dir)}
                isFirst={idx === 0}
                isLast={idx === campos.length - 1}
              />
            ))}
            </>
          )}
        </div>

        {/* Sidebar de tipos */}
        {/* Abaixo de lg: faixa horizontal com rolagem e snap sob a lista, sem esconder os campos */}
        <div className="w-full lg:w-64 flex-shrink-0 lg:overflow-y-auto p-3 lg:p-4 custom-scrollbar border-t lg:border-t-0 lg:border-l" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2 lg:mb-4" style={{ color: 'var(--text-muted)' }}>Adicionar Campo</p>
          <div className="flex gap-2 overflow-x-auto snap-x pb-1 lg:block lg:space-y-1.5 lg:overflow-visible lg:pb-0">
            {TIPOS_CAMPO.map((t) => (
              <button
                key={t.tipo}
                onClick={() => addCampo(t.tipo)}
                className="shrink-0 snap-start lg:w-full text-left flex items-center lg:items-start gap-2 lg:gap-3 px-3 py-2.5 min-h-[44px] rounded-xl transition-colors duration-150 group hover:bg-[var(--bg-card)] active:scale-[0.99] max-lg:border max-lg:border-[var(--border)] max-lg:bg-[var(--bg-card)]"
              >
                <t.icone size={18} className="shrink-0 lg:mt-0.5" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-medium transition-colors whitespace-nowrap lg:whitespace-normal" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                  <p className="hidden lg:block text-xs" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmarDescarte}
        title="Descartar alterações?"
        message="As alterações não salvas neste questionário serão perdidas."
        variant="warning"
        confirmText="Descartar"
        onConfirm={() => { setConfirmarDescarte(false); onCancelar(); }}
        onCancel={() => setConfirmarDescarte(false)}
      />
    </div>
  );
}
