import { useState } from 'react';
import { criarQuestionario, atualizarQuestionario } from '../services/patientService';

const TIPOS_CAMPO = [
  { tipo: 'section', label: 'Separador / Seção', icone: '📁', desc: 'Título visual para organizar seções' },
  { tipo: 'text', label: 'Texto Curto', icone: '✏️', desc: 'Uma linha de texto livre' },
  { tipo: 'textarea', label: 'Texto Longo', icone: '📝', desc: 'Área de texto com múltiplas linhas' },
  { tipo: 'radio', label: 'Seleção Única', icone: '🔘', desc: 'Escolhe apenas uma opção' },
  { tipo: 'checkbox', label: 'Múltipla Escolha', icone: '☑️', desc: 'Marca uma ou mais opções' },
  { tipo: 'select', label: 'Lista (Dropdown)', icone: '📋', desc: 'Seleciona de uma lista' },
  { tipo: 'scale', label: 'Escala Numérica', icone: '⭐', desc: 'Avaliação de 1 a 10' },
  { tipo: 'number', label: 'Número', icone: '🔢', desc: 'Campo numérico' },
  { tipo: 'date', label: 'Data', icone: '📅', desc: 'Campo de data' },
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
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Opções de Resposta</label>

      {/* Lista de opções existentes */}
      {opcoes.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {opcoes.map((opcao, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-0.5" />
              <input
                type="text"
                value={opcao}
                onChange={(e) => editOpcao(idx, e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeOpcao(idx)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
          className="flex-1 px-3 py-1.5 text-sm bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={addOpcao}
          className="px-3 py-1.5 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );
}

function CampoEditor({ campo, onChange, onRemover, onMover, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      {/* Header do campo */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
        <div className="flex flex-col gap-0.5">
          <button onClick={() => onMover('up')} disabled={isFirst} className="disabled:opacity-20 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={() => onMover('down')} disabled={isLast} className="disabled:opacity-20 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex-1 truncate">
          {TIPOS_CAMPO.find(t => t.tipo === campo.tipo)?.icone} {campo.label || <span className="italic text-slate-400">(sem título)</span>}
        </span>
        <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-full">
          {TIPOS_CAMPO.find(t => t.tipo === campo.tipo)?.label || campo.tipo}
        </span>

        <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button onClick={onRemover} className="text-red-400 hover:text-red-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Label */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
              {campo.tipo === 'section' ? 'Título da Seção' : 'Pergunta / Rótulo'}
            </label>
            <input
              type="text"
              value={campo.label || ''}
              onChange={(e) => onChange({ ...campo, label: e.target.value })}
              placeholder={campo.tipo === 'section' ? 'Ex: Dados Pessoais' : 'Ex: Qual a queixa principal?'}
              className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Placeholder */}
          {['text', 'textarea', 'number'].includes(campo.tipo) && (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Placeholder (dica para o paciente)</label>
              <input
                type="text"
                value={campo.placeholder || ''}
                onChange={(e) => onChange({ ...campo, placeholder: e.target.value })}
                placeholder="Ex: Digite aqui..."
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Mínimo</label>
                <input type="number" value={campo.min ?? 1} onChange={(e) => onChange({ ...campo, min: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Máximo</label>
                <input type="number" value={campo.max ?? 10} onChange={(e) => onChange({ ...campo, max: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {/* Obrigatório */}
          {campo.tipo !== 'section' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => onChange({ ...campo, obrigatorio: !campo.obrigatorio })}
                className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${campo.obrigatorio ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${campo.obrigatorio ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">Campo obrigatório</span>
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
      console.error('Erro ao salvar questionário:', e);
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
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojis(s => !s); }}
              className="text-2xl w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-500/30 hover:scale-110 transition-transform"
            >
              {icone}
            </button>
            {showEmojis && (
              <div
                className="absolute top-12 left-0 z-50 flex flex-wrap gap-1.5 p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-52"
                onClick={(e) => e.stopPropagation()}
              >
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setIcone(e); setShowEmojis(false); }}
                    className="text-xl w-8 h-8 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-colors"
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
              className="w-full text-lg font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5 transition-colors"
            />
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição curta (opcional)..."
              className="w-full text-sm bg-transparent text-slate-500 dark:text-slate-400 placeholder-slate-400 focus:outline-none mt-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancelar} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={isSaving}
            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-md"
          >
            {isSaving ? 'Salvando...' : template?.id ? 'Salvar Alterações' : 'Publicar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Campos list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {campos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <span className="text-3xl mb-2">➕</span>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Seu questionário está vazio</p>
              <p className="text-sm text-slate-400 mt-1">Adicione campos usando o painel à direita</p>
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
        <div className="w-64 flex-shrink-0 border-l border-slate-200 dark:border-white/10 overflow-y-auto p-4 custom-scrollbar bg-slate-50 dark:bg-zinc-950/30">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Adicionar Campo</p>
          <div className="space-y-1.5">
            {TIPOS_CAMPO.map(({ tipo, label, icone: icon, desc }) => (
              <button
                key={tipo}
                onClick={() => addCampo(tipo)}
                className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all group"
              >
                <span className="text-lg mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
