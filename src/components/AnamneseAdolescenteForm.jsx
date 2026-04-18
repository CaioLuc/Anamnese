import { useState, useEffect, useRef, useCallback } from 'react';
import { criarAnamnese, atualizarAnamnese } from '../services/patientService';
import Tooltip from './Tooltip';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';

// ==========================================
// STEPS — Infanto-Juvenil
// ==========================================
const STEPS = [
  { key: 'historico', label: 'Histórico', icon: '📋' },
  { key: 'familia', label: 'Família', icon: '👨‍👩‍👧' },
  { key: 'desenvolvimento', label: 'Desenvolvimento', icon: '🧒' },
  { key: 'motivo', label: 'Motivo', icon: '🎯' },
  { key: 'habitos', label: 'Hábitos', icon: '🌙' },
  { key: 'clinico', label: 'Quadro Clínico', icon: '⚕️' },
  { key: 'finalizacao', label: 'Finalização', icon: '✅' },
];

const INITIAL_STATE = {
  tipo: 'adolescente',

  // Seção 0: Histórico Prévio
  psicologo_previo: false,
  psiquiatra_previo: false,
  foi_ambulatorio: false,
  houve_internamento: false,
  
  // Seção 1: Dados Familiares
  nome_pai: '',
  idade_pai: '',
  profissao_pai: '',
  nome_mae: '',
  idade_mae: '',
  profissao_mae: '',
  qtd_irmaos: 0,
  irmaos_masculino: 0,
  irmaos_feminino: 0,
  observacoes_familiares: '',
  
  // Seção 2: Desenvolvimento e Escolar
  gestacao_planejada: false,
  gestacao_notas: '',
  tipo_parto: 'Natural',
  testes_nascimento: false,
  testes_notas: '',
  internacao_nascimento: false,
  internacao_notas: '',
  mamou: false,
  tempo_amamentacao: '',
  desenvolvimento_motor: '',
  atraso_fala: '',
  seletividade_alimentar: false,
  seletividade_notas: '',
  interacao_brincadeiras: '',
  dificuldade_escolar: false,
  dificuldade_escolar_notas: '',
  mudanca_escola: false,
  mudanca_escola_notas: '',
  bullying: false,
  bullying_notas: '',
  tempo_telas: '',
  
  // Seção 3: Motivo da Consulta e Dinâmicas
  motivo_consulta: '',
  historico_queixa: '',
  dinamica_familiar: '',
  dinamica_amorosa: '',
  
  // Seção 4: Hábitos e Rotina (NOVO)
  rotina_sono: '',
  alimentacao_habitos: '',
  exercicio_fisico: '',
  lazer_hobbies: '',
  
  // Seção 5: Quadro Clínico e Sintomas
  sintomas_apresentados: '',
  fatores_agravantes: '',
  transtornos_anteriores: '',
  doencas_importantes: '',
  medicamentos: '',
  tentativa_suicidio: '',
  
  // Seção 6: Finalização
  expectativa_responsavel: '',
  observacoes_gerais: ''
};

export default function AnamneseAdolescenteForm({ patient, onSaved, initialData }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({ ...INITIAL_STATE });
    const [currentStep, setCurrentStep] = useState(0);
    const formRef = useRef(null);
    const formStartTime = useRef(Date.now());
    const { showToast } = useToast();
    const [autoSaveStatus, setAutoSaveStatus] = useState('');
    const [hasDraft, setHasDraft] = useState(false);
    const autoSaveTimerRef = useRef(null);

    const draftKey = `caritas_anamnese_adolesc_draft_${patient?.id || 'unknown'}`;

    // Completion tracking
    const totalFields = Object.keys(INITIAL_STATE).length;
    const filledFields = Object.entries(formData).filter(([k, v]) => k !== 'tipo' && v !== '' && v !== false && v !== 0).length;
    const completionPct = Math.round((filledFields / (totalFields - 1)) * 100); // -1 for 'tipo'

    // Warn on unsaved changes (H3)
    useUnsavedChanges(filledFields > 0);

    // Keyboard shortcut (H7)
    useKeyboard([
      { key: 's', ctrl: true, action: () => formRef.current?.requestSubmit() },
    ]);

    // Auto-save: Restore draft (H1)
    useEffect(() => {
      if (initialData) return;
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.data && Object.values(parsed.data).some(v => v !== '' && v !== false && v !== 0)) {
            setHasDraft(true);
          }
        }
      } catch (_) {}
    }, [draftKey, initialData]);

    // Auto-save debounce (H1)
    const scheduleAutoSave = useCallback((data) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        try {
          const hasContent = Object.values(data).some(v => v !== '' && v !== false && v !== 0 && v !== 'adolescente');
          if (!hasContent) return;
          setAutoSaveStatus('saving');
          localStorage.setItem(draftKey, JSON.stringify({ data, savedAt: new Date().toISOString() }));
          setTimeout(() => {
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus(''), 3000);
          }, 300);
        } catch (_) {}
      }, 2000);
    }, [draftKey]);

    useEffect(() => {
      if (!initialData) scheduleAutoSave(formData);
      return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [formData, scheduleAutoSave, initialData]);

    const restoreDraft = () => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) { setFormData(prev => ({ ...prev, ...JSON.parse(saved).data })); showToast({ type: 'success', message: 'Rascunho restaurado!' }); }
      } catch (_) { showToast({ type: 'error', message: 'Erro ao restaurar.' }); }
      setHasDraft(false);
    };
    const dismissDraft = () => { try { localStorage.removeItem(draftKey); } catch (_) {} setHasDraft(false); };
    const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch (_) {} };

    useEffect(() => {
        if (initialData) setFormData(prev => ({ ...prev, ...initialData }));
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const scrollToStep = (stepIndex) => {
      setCurrentStep(stepIndex);
      const el = document.getElementById(`adolesc-step-${stepIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setStatusMessage({ type: '', text: '' });
      try {
        if (initialData?.id) {
            await atualizarAnamnese(initialData.id, patient.id, formData);
            showToast({ type: 'success', message: 'Anamnese atualizada com sucesso!' });
            clearDraft();
        } else {
            await criarAnamnese({ id_paciente: patient.id, ...formData });
            showToast({ type: 'success', message: 'Anamnese infanto-juvenil salva com sucesso!' });
            clearDraft();
        }
        if (onSaved) setTimeout(() => onSaved(), 1500);

        const durationMs = Date.now() - formStartTime.current;
        trackAction(initialData?.id ? 'UPDATE_ANAMNESIS_ADOLESCENT' : 'SUBMIT_ANAMNESIS_ADOLESCENT', {
          patientId: patient?.id,
          durationMs,
          durationFormatted: `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`,
          totalFields, filledFields,
          completionRate: `${completionPct}%`,
          isEdit: !!initialData?.id
        });
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: 'Erro ao salvar a Anamnese.' });
      } finally {
        setIsSubmitting(false);
      }
    };

    // ==========================================
    // UI Components
    // ==========================================
    const Switch = ({ label, name, checked }) => (
      <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-cyan-500/30 transition-all group">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
        <div className="relative">
          <input type="checkbox" name={name} checked={checked} onChange={handleChange} className="sr-only" />
          <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
    );

    const SectionHeader = ({ title, desc, step }) => (
        <div className="flex items-center gap-4 mb-6 pt-6 first:pt-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0 border border-cyan-500/30">
             {step}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {desc && <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>}
          </div>
        </div>
    );

    const TextArea = ({ name, label, tip, rows = 3, placeholder, danger }) => {
      const isFilled = (formData[name] || '').trim().length > 0;
      return (
      <div>
        {tip ? (
          <Tooltip text={tip} showIcon>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
               {label}
               {!isFilled && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Campo não preenchido"></span>}
            </label>
          </Tooltip>
        ) : (
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
             {label}
             {!isFilled && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Campo não preenchido"></span>}
          </label>
        )}
        <div className="relative">
          <textarea
            name={name} value={formData[name] || ''} onChange={handleChange} rows={rows}
            placeholder={placeholder}
            className={`w-full p-4 bg-white/80 dark:bg-zinc-950/80 border rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 transition-colors text-sm leading-relaxed ${
              danger 
                ? 'border-red-500/20 focus:ring-red-500/50' 
                : !isFilled
                  ? 'border-amber-200 dark:border-amber-500/20 focus:ring-amber-400 focus:border-amber-400'
                  : 'border-slate-200 dark:border-white/10 focus:ring-cyan-500'
            }`}
          />
          {isFilled && (
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 pointer-events-none">
              {(formData[name] || '').length} chars
            </span>
          )}
        </div>
      </div>
      );
    };

    const inputClass = "w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-cyan-500 transition-colors";
    const sectionClass = "bg-white/40 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm scroll-mt-24";

    return (
      <div className="w-full max-w-4xl mx-auto custom-scrollbar h-full overflow-y-auto pr-2 pb-10">
        
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 transition-all sticky top-0 z-10 ${
            statusMessage.type === 'success' 
            ? 'bg-emerald-500/90 backdrop-blur-md border-emerald-500/20 text-emerald-50 shadow-xl' 
            : 'bg-red-500/90 backdrop-blur-md border-red-500/20 text-red-50 shadow-xl'
          }`}>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 mt-6 relative">

            {/* Draft banner */}
            {hasDraft && !initialData && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Rascunho salvo encontrado para este paciente.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={dismissDraft} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Descartar</button>
                  <button type="button" onClick={restoreDraft} className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors">Restaurar</button>
                </div>
              </div>
            )}
            
            {/* Patient card + progress */}
            <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
                {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">{patient?.nome || 'Paciente'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{initialData ? 'Editando anamnese existente' : 'Nova anamnese — Infanto-Juvenil'}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{completionPct}%</span>
                </div>
                {autoSaveStatus && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-300 shrink-0 ${
                    autoSaveStatus === 'saving' ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {autoSaveStatus === 'saving' ? '⏳ Salvando...' : '✓ Salvo'}
                  </div>
                )}
              </div>
            </div>

            {/* Stepper */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 custom-scrollbar sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-30 pt-2 px-1 border-b border-slate-200 dark:border-white/5">
              {STEPS.map((s, idx) => (
                <button type="button" key={idx} onClick={() => scrollToStep(idx)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded-xl transition-all border ${
                    currentStep === idx 
                      ? 'bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-500/20' 
                      : 'bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
            
            {/* ==========================================
                SEÇÃO 0: Histórico Prévio
            ========================================== */}
            <section id="adolesc-step-0" className={sectionClass}>
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 animate-in fade-in zoom-in-95 duration-200">
                      <Switch label="Foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} />
                      <Switch label="Houve internamento?" name="houve_internamento" checked={formData.houve_internamento} />
                   </div>
                )}
            </section>

            {/* ==========================================
                SEÇÃO 1: Dados Familiares
            ========================================== */}
            <section id="adolesc-step-1" className={sectionClass}>
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo familiar." />
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Pai</label><input type="text" name="nome_pai" value={formData.nome_pai} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade</label><input type="number" name="idade_pai" value={formData.idade_pai} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão</label><input type="text" name="profissao_pai" value={formData.profissao_pai} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="h-px w-full bg-slate-100 dark:bg-white/5"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome da Mãe</label><input type="text" name="nome_mae" value={formData.nome_mae} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade</label><input type="number" name="idade_mae" value={formData.idade_mae} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão</label><input type="text" name="profissao_mae" value={formData.profissao_mae} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <div><label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Irmãos</label><input type="number" name="qtd_irmaos" value={formData.qtd_irmaos} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">Masculino</label><input type="number" name="irmaos_masculino" value={formData.irmaos_masculino} onChange={handleChange} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-pink-500 dark:text-pink-400 mb-1">Feminino</label><input type="number" name="irmaos_feminino" value={formData.irmaos_feminino} onChange={handleChange} className={inputClass} /></div>
                    </div>
                    <TextArea name="observacoes_familiares" label="Observações Familiares" tip="Guarda ampliada, convivência com padrastos, irmãos meios, situação de abrigamento, violência doméstica, etc." placeholder="Detalhes adicionais..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 2: Desenvolvimento — EXCLUSIVO
            ========================================== */}
            <section id="adolesc-step-2" className={`${sectionClass} border-l-4 border-l-cyan-500`}>
                <SectionHeader step="2" title="Desenvolvimento e Escolaridade" desc="Gestação, desenvolvimento motor, linguagem e vida acadêmica." />
                <div className="space-y-5">
                    {/* Gestação */}
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="Gestação planejada?" name="gestacao_planejada" checked={formData.gestacao_planejada} /></div>
                       <div className="flex-1"><input type="text" name="gestacao_notas" value={formData.gestacao_notas} onChange={handleChange} placeholder="Como foi a gestação?" className={`${inputClass} min-h-[56px]`} /></div>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-200 dark:border-white/5 rounded-xl flex flex-wrap items-center gap-6">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Parto:</span>
                        {['Natural', 'Cesárea'].map(t => (
                          <label key={t} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="tipo_parto" value={t} checked={formData.tipo_parto === t} onChange={handleChange} className="text-cyan-500 focus:ring-cyan-500" />
                            <span className="text-slate-900 dark:text-white text-sm">{t}</span>
                          </label>
                        ))}
                    </div>

                    {/* Pós-nascimento */}
                    <div className="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-zinc-950/50 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Realizou testes do nascimento? (Pezinho, Orelhinha)" name="testes_nascimento" checked={formData.testes_nascimento} /></div>
                           <div className="flex-1"><input type="text" name="testes_notas" value={formData.testes_notas} onChange={handleChange} placeholder="Alterações?" className={`${inputClass} min-h-[56px]`} /></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Precisou de internação após nascer?" name="internacao_nascimento" checked={formData.internacao_nascimento} /></div>
                           <div className="flex-1"><input type="text" name="internacao_notas" value={formData.internacao_notas} onChange={handleChange} placeholder="Motivo e tempo" className={`${inputClass} min-h-[56px]`} /></div>
                        </div>
                    </div>

                    {/* Alimentação e Motor */}
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="A criança mamou?" name="mamou" checked={formData.mamou} /></div>
                       <div className="flex-1"><input type="text" name="tempo_amamentacao" value={formData.tempo_amamentacao} onChange={handleChange} placeholder="Tempo de amamentação / desmame" className={`${inputClass} min-h-[56px]`} /></div>
                    </div>
                    
                    <TextArea name="desenvolvimento_motor" label="Como foi o desenvolvimento motor?" tip="Quando começou a sentar, engatinhar, andar. Se houve atraso ou se ocorreu dentro do esperado." rows={2} />
                    <TextArea name="atraso_fala" label="Falou no período esperado ou apresentou atraso na linguagem?" tip="Primeiras palavras, frases completas, dificuldade de articulação, necessidade de fonoaudiologia." rows={2} />

                    <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-zinc-950/50 p-4 border border-slate-200 dark:border-white/5 rounded-xl">
                       <div className="sm:w-72"><Switch label="Seletividade alimentar?" name="seletividade_alimentar" checked={formData.seletividade_alimentar} /></div>
                       <div className="flex-1"><input type="text" name="seletividade_notas" value={formData.seletividade_notas} onChange={handleChange} placeholder="Texturas, cores, sabores que evita..." className={`${inputClass} min-h-[56px]`} /></div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5"></div>

                    {/* Social/Escolar */}
                    <TextArea name="interacao_brincadeiras" label="Como interage com outras crianças? Gosta de brincar?" tip="Prefere brincar sozinho ou em grupo? Faz amigos com facilidade? Demonstra agressividade?" rows={2} />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Dificuldade escolar?" name="dificuldade_escolar" checked={formData.dificuldade_escolar} /></div>
                       <div className="flex-1"><input type="text" name="dificuldade_escolar_notas" value={formData.dificuldade_escolar_notas} onChange={handleChange} placeholder="Quais matérias ou situações?" className={`${inputClass} min-h-[56px]`} /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Mudou de turma ou escola?" name="mudanca_escola" checked={formData.mudanca_escola} /></div>
                       <div className="flex-1"><input type="text" name="mudanca_escola_notas" value={formData.mudanca_escola_notas} onChange={handleChange} placeholder="Motivos das mudanças..." className={`${inputClass} min-h-[56px]`} /></div>
                    </div>

                    {/* NOVOS: Bullying e Telas */}
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Sofre ou sofreu bullying?" name="bullying" checked={formData.bullying} /></div>
                       <div className="flex-1"><input type="text" name="bullying_notas" value={formData.bullying_notas} onChange={handleChange} placeholder="Descreva: onde, quando, como reagiu..." className={`${inputClass} min-h-[56px]`} /></div>
                    </div>
                    <TextArea name="tempo_telas" label="Tempo de telas (celular, tablet, TV, videogame)" tip="Quantas horas por dia? Quais conteúdos consome? Houve mudança de comportamento após uso excessivo?" rows={2} placeholder="Descreva a exposição a telas..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 3: Motivo da Consulta
            ========================================== */}
            <section id="adolesc-step-3" className={sectionClass}>
                <SectionHeader step="3" title="Motivo da Consulta e Dinâmicas" desc="Razões pela busca e contexto sócio-familiar." />
                <div className="space-y-4">
                    <TextArea name="motivo_consulta" label="Motivo da procura pelo atendimento" tip="Queixa principal nas palavras do responsável e, se possível, da criança/adolescente. O que motivou a busca agora?" rows={4} />
                    <TextArea name="historico_queixa" label="Histórico das dificuldades relatadas" tip="Desde quando apresenta a queixa? Houve piora? O que já foi tentado?" rows={3} />
                    <TextArea name="dinamica_familiar" label="Dinâmica Familiar (Nuclear e Constituída)" tip="Quem mora na casa, rotina familiar, qualidade dos vínculos, presença de conflitos." rows={3} />
                    <TextArea name="dinamica_amorosa" label="Vida Relacional / Amorosa (se aplicável)" rows={2} placeholder="Para adolescentes: relacionamentos, identidade, sexualidade..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 4: Hábitos e Rotina (NOVO)
            ========================================== */}
            <section id="adolesc-step-4" className={`${sectionClass} border-l-4 border-l-cyan-500`}>
                <SectionHeader step="4" title="Hábitos e Rotina" desc="Padrões de sono, alimentação, exercício e lazer." />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="rotina_sono" label="Qualidade do Sono" tip="Dorme sozinho? Tem pesadelos? Dificuldade para dormir? Quantas horas?" rows={2} placeholder="Como é o sono da criança/adolescente?" />
                      <TextArea name="alimentacao_habitos" label="Alimentação" tip="Come bem? Recusa alimentos? Come sozinho? Tem compulsão?" rows={2} placeholder="Descreva os hábitos alimentares..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="exercicio_fisico" label="Atividade Física" rows={2} placeholder="Pratica esporte? Educação física na escola?" />
                      <TextArea name="lazer_hobbies" label="Lazer e Hobbies" rows={2} placeholder="Do que gosta de brincar? Tem hobbies?" />
                    </div>
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 5: Quadro Clínico
            ========================================== */}
            <section id="adolesc-step-5" className={`${sectionClass} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] pointer-events-none"></div>
                <SectionHeader step="5" title="Quadro Clínico e Sintomatológico" desc="Sintomas, doenças e histórico médico." />
                <div className="space-y-4 relative z-10">
                    <TextArea name="sintomas_apresentados" label="Sintomas Apresentados" tip="Sintomas físicos e emocionais: agitação, irritabilidade, choro fácil, isolamento, medos, agressividade, etc." rows={3} danger />
                    <TextArea name="fatores_agravantes" label="Fatores que precipitam ou agravam crises" rows={2} danger />
                    <TextArea name="transtornos_anteriores" label="Histórico de Transtornos (Criança e Família)" tip="Diagnósticos prévios da criança ou dos pais. Ex: TDAH, TEA, depressão familiar." rows={2} danger />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextArea name="doencas_importantes" label="Doenças Importantes" rows={2} danger placeholder="Crônicas, cirurgias, alergias..." />
                        <TextArea name="medicamentos" label="Medicação Atual" rows={2} danger placeholder="Nome, dosagem, prescrito por quem..." />
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-xl mt-4">
                       <label className="block text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve ideação ou tentativa de autolesão/suicídio?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="w-full p-3 bg-zinc-950/90 border border-red-500/20 rounded-lg text-red-100 placeholder-red-900/50 resize-y focus:ring-1 focus:ring-red-500 text-sm" placeholder="Automutilação, ideação suicida, tentativas..." />
                    </div>
                </div>
            </section>

             {/* ==========================================
                 SEÇÃO 6: Finalização
             ========================================== */}
             <section id="adolesc-step-6" className={`${sectionClass} bg-gradient-to-br from-cyan-500/5 to-transparent`}>
                <SectionHeader step="6" title="Finalização" desc="Expectativas do responsável e parecer profissional." />
                <div className="space-y-4">
                  <TextArea name="expectativa_responsavel" label="O que o responsável espera da terapia?" tip="Quais resultados os pais/responsáveis esperam? A criança/adolescente sabe por que está ali?" rows={3} placeholder="Expectativas da família em relação ao tratamento..." />
                  <TextArea name="observacoes_gerais" label="Observações Gerais do Profissional" rows={5} placeholder="Impressões clínicas, hipóteses diagnósticas, encaminhamentos sugeridos..." />
                </div>
            </section>

            {/* Submit */}
            <div className="sticky bottom-0 mt-6 py-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-white/5 flex items-center justify-between z-20 gap-4">
              <div className="flex items-center gap-2 sm:hidden">
                <div className="w-16 h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">{completionPct}%</span>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white transition-all bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-xl shadow-cyan-500/20 disabled:opacity-50 ml-auto"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Salvar Anamnese Infanto-Juvenil'}
              </button>
            </div>
        </form>
      </div>
    );
}
