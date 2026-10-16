import { useState, useId } from 'react';
import { Check } from 'lucide-react';

// Opção em forma de botão (radio, checkbox, escala): aria-pressed carrega o estado para leitores de tela
const opcaoClasse = (ativa) =>
  `min-h-[44px] sm:min-h-[36px] max-w-full px-3 py-1.5 rounded-lg text-sm font-medium border transition-[background-color,border-color,color,transform] duration-150 ease-out-expo active:scale-[0.97] ${
    ativa
      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]'
      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
  }`;

function respondido(valor) {
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'number') return true;
  return typeof valor === 'string' && valor.trim() !== '';
}

function Rotulo({ campo, htmlFor, id }) {
  return (
    <label htmlFor={htmlFor} id={id} className="ds-label">
      {campo.label}
      {campo.obrigatorio && <span className="ml-0.5" style={{ color: 'var(--status-danger)' }} aria-hidden="true">*</span>}
      {campo.obrigatorio && <span className="sr-only"> (obrigatório)</span>}
    </label>
  );
}

// Campo: Separador de Seção
function SectionField({ campo }) {
  return (
    <div className="pt-6 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
      <h3 className="font-heading text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {campo.label}
      </h3>
    </div>
  );
}

// Campo: Texto simples ou textarea
function TextField({ campo, value, onChange, tipo }) {
  const id = useId();
  return (
    <div>
      <Rotulo campo={campo} htmlFor={id} />
      {tipo === 'textarea' ? (
        <textarea
          id={id}
          className="ds-input min-h-[96px] resize-y leading-relaxed"
          placeholder={campo.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={campo.obrigatorio}
        />
      ) : (
        <input
          id={id}
          type={tipo === 'number' ? 'number' : tipo === 'date' ? 'date' : 'text'}
          className={`ds-input ${tipo === 'number' ? 'tabular' : ''}`}
          placeholder={campo.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={campo.obrigatorio}
        />
      )}
    </div>
  );
}

// Campo: Radio (seleção única; clicar de novo desmarca)
function RadioField({ campo, value, onChange }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <Rotulo campo={campo} id={id} />
      <div className="flex flex-wrap gap-2">
        {(campo.opcoes || []).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={value === opcao}
            onClick={() => onChange(value === opcao ? '' : opcao)}
            className={opcaoClasse(value === opcao)}
          >
            {opcao}
          </button>
        ))}
      </div>
    </div>
  );
}

// Campo: Checkbox (seleção múltipla)
function CheckboxField({ campo, value, onChange }) {
  const id = useId();
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opcao) => {
    if (selected.includes(opcao)) onChange(selected.filter(v => v !== opcao));
    else onChange([...selected, opcao]);
  };
  return (
    <div role="group" aria-labelledby={id}>
      <Rotulo campo={campo} id={id} />
      <div className="flex flex-wrap gap-2">
        {(campo.opcoes || []).map((opcao) => {
          const ativa = selected.includes(opcao);
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={ativa}
              onClick={() => toggle(opcao)}
              className={`${opcaoClasse(ativa)} flex items-center gap-1.5`}
            >
              {ativa && <Check size={14} strokeWidth={3} className="animate-in zoom-in" aria-hidden="true" />}
              {opcao}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Campo: Select (dropdown)
function SelectField({ campo, value, onChange }) {
  const id = useId();
  return (
    <div>
      <Rotulo campo={campo} htmlFor={id} />
      <select
        id={id}
        className="ds-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={campo.obrigatorio}
      >
        <option value="">Selecione...</option>
        {(campo.opcoes || []).map((opcao) => (
          <option key={opcao} value={opcao}>{opcao}</option>
        ))}
      </select>
    </div>
  );
}

// Campo: Escala numérica
function ScaleField({ campo, value, onChange }) {
  const id = useId();
  const min = campo.min ?? 1;
  const max = campo.max ?? 10;
  // Teto de 21 botões, mesmo para templates antigos salvos fora da faixa
  const nums = Array.from({ length: Math.max(0, Math.min(max - min + 1, 21)) }, (_, i) => i + min);
  // Celular: grade com linhas iguais (1–5 numa linha, 1–10 em 5+5) em vez de quebra irregular; até 6 por linha
  const colunas = nums.length <= 6 ? nums.length : Math.ceil(nums.length / Math.ceil(nums.length / 6));
  return (
    <div role="group" aria-labelledby={id}>
      <Rotulo campo={campo} id={id} />
      <div className="grid gap-1.5 sm:flex sm:flex-wrap" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? null : n)}
            className={`${opcaoClasse(value === n)} w-full sm:w-9 px-0 font-bold tabular`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] mt-1.5 tabular" style={{ color: 'var(--text-muted)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/**
 * QuestionarioFiller — renderiza um template de questionário e coleta respostas
 * Props:
 *   template: { campos: [...] }
 *   respostas: { [campo.id]: valor }
 *   onChange: (novasRespostas) => void
 *   readOnly: boolean (para visualização)
 *
 * Em modo edição, `respostas` só é lido na montagem; para trocar o conjunto
 * de respostas, o pai deve remontar o componente (ex.: key={anamnese.id}).
 */
export default function QuestionarioFiller({ template, respostas = {}, onChange, readOnly = false }) {
  const [valores, setValores] = useState(respostas);
  // Leitura reflete sempre a prop atual; o estado local existe só para não apagar edições em curso
  const exibidos = readOnly ? respostas : valores;

  const handleChange = (campoId, valor) => {
    if (readOnly) return;
    const novos = { ...valores, [campoId]: valor };
    setValores(novos);
    if (onChange) onChange(novos);
  };

  if (!template?.campos?.length) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
        Este questionário não possui campos configurados.
      </div>
    );
  }

  const campos = [...template.campos].sort((a, b) => a.ordem - b.ordem);
  const perguntas = campos.filter((c) => c.tipo !== 'section');
  const respondidas = perguntas.filter((c) => respondido(exibidos[c.id])).length;
  const obrigatoriasPendentes = perguntas.filter((c) => c.obrigatorio && !respondido(exibidos[c.id])).length;
  const pct = perguntas.length ? Math.round((respondidas / perguntas.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {!readOnly && perguntas.length > 0 && (
        <div className="sticky top-0 z-10 -mx-1 px-1 py-2" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="tabular" aria-live="polite">
              {respondidas} de {perguntas.length} respondidas
            </span>
            {obrigatoriasPendentes > 0 && (
              <span className="tabular" style={{ color: 'var(--status-warning-text)' }}>
                {obrigatoriasPendentes} {obrigatoriasPendentes === 1 ? 'obrigatória pendente' : 'obrigatórias pendentes'}
              </span>
            )}
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progresso do questionário"
          >
            {/* scaleX em vez de width: anima sem recalcular layout */}
            <div
              className="h-full w-full origin-left rounded-full transition-transform duration-500 ease-out-expo"
              style={{ transform: `scaleX(${pct / 100})`, backgroundColor: 'var(--status-success)' }}
            />
          </div>
        </div>
      )}

      {campos.map((campo) => {
        const val = exibidos[campo.id];

        // Modo leitura — visualização das respostas
        if (readOnly) {
          if (campo.tipo === 'section') return <SectionField key={campo.id} campo={campo} />;
          const resposta = val;
          if (!resposta && resposta !== 0) return null;
          return (
            <div key={campo.id} className="flex flex-col gap-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{campo.label}</span>
              <span className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                {Array.isArray(resposta) ? resposta.join(', ') : String(resposta)}
              </span>
            </div>
          );
        }

        // Modo edição
        switch (campo.tipo) {
          case 'section':
            return <SectionField key={campo.id} campo={campo} />;
          case 'textarea':
            return <TextField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} tipo="textarea" />;
          case 'text':
          case 'number':
          case 'date':
            return <TextField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} tipo={campo.tipo} />;
          case 'radio':
            return <RadioField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} />;
          case 'checkbox':
            return <CheckboxField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} />;
          case 'select':
            return <SelectField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} />;
          case 'scale':
            return <ScaleField key={campo.id} campo={campo} value={val} onChange={(v) => handleChange(campo.id, v)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
