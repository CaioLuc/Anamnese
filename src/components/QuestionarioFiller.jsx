import { useState } from 'react';

// Campo: Separador de Seção
function SectionField({ campo }) {
  return (
    <div className="pt-4 pb-2 border-b border-indigo-200 dark:border-indigo-500/30 mb-2">
      <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
        {campo.label}
      </h3>
    </div>
  );
}

// Campo: Texto simples ou textarea
function TextField({ campo, value, onChange, tipo }) {
  const base = "w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none";
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
      </label>
      {tipo === 'textarea' ? (
        <textarea
          className={`${base} min-h-[90px]`}
          placeholder={campo.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={campo.obrigatorio}
        />
      ) : (
        <input
          type={tipo === 'number' ? 'number' : tipo === 'date' ? 'date' : 'text'}
          className={base}
          placeholder={campo.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={campo.obrigatorio}
        />
      )}
    </div>
  );
}

// Campo: Radio (seleção única)
function RadioField({ campo, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {(campo.opcoes || []).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => onChange(value === opcao ? '' : opcao)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              value === opcao
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
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
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opcao) => {
    if (selected.includes(opcao)) onChange(selected.filter(v => v !== opcao));
    else onChange([...selected, opcao]);
  };
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {(campo.opcoes || []).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => toggle(opcao)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${
              selected.includes(opcao)
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
          >
            {selected.includes(opcao) && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {opcao}
          </button>
        ))}
      </div>
    </div>
  );
}

// Campo: Select (dropdown)
function SelectField({ campo, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <select
        className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
  const min = campo.min || 1;
  const max = campo.max || 10;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {campo.label} {campo.obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2 flex-wrap">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
              value === n
                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md'
                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-xs text-indigo-500 mt-1">Selecionado: {value}</p>
      )}
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
 */
export default function QuestionarioFiller({ template, respostas = {}, onChange, readOnly = false }) {
  const [valores, setValores] = useState(respostas);

  const handleChange = (campoId, valor) => {
    if (readOnly) return;
    const novos = { ...valores, [campoId]: valor };
    setValores(novos);
    if (onChange) onChange(novos);
  };

  if (!template?.campos?.length) {
    return (
      <div className="text-center py-10 text-slate-400">
        Este questionário não possui campos configurados.
      </div>
    );
  }

  const campos = [...template.campos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-6">
      {campos.map((campo) => {
        const val = valores[campo.id];

        // Modo leitura — visualização das respostas
        if (readOnly) {
          if (campo.tipo === 'section') return <SectionField key={campo.id} campo={campo} />;
          const resposta = val;
          if (!resposta && resposta !== 0) return null;
          return (
            <div key={campo.id} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{campo.label}</span>
              <span className="text-sm text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-lg">
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
