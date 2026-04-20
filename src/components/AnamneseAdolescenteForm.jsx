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

    const Switch = ({ label, name, checked }) => (
      <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border transition-all group hover:border-blue-500/30" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <div className="relative">
          <input type="checkbox" name={name} checked={checked} onChange={handleChange} className="sr-only" />
          <div className="block w-10 h-6 rounded-full transition-colors" style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
    );

    const SectionHeader = ({ title, desc, step }) => (
        <div className="flex items-center gap-4 mb-6 pt-8 first:pt-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
             {step}
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            {desc && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
          </div>
        </div>
    );

    const TextArea = ({ name, label, tip, rows = 3, placeholder, danger }) => {
      const isFilled = (formData[name] || '').trim().length > 0;
      return (
      <div>
        {tip ? (
          <Tooltip text={tip} showIcon>
            <label className="block text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
               {label}
               {!isFilled && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Campo não preenchido"></span>}
            </label>
          </Tooltip>
        ) : (
          <label className="block text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
             {label}
             {!isFilled && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Campo não preenchido"></span>}
          </label>
        )}
        <div className="relative">
          <textarea
            name={name} value={formData[name] || ''} onChange={handleChange} rows={rows}
            placeholder={placeholder}
            className={`ds-input w-full resize-y ${danger ? 'border-red-500/50' : !isFilled ? 'border-amber-400/30' : ''}`}
          />
        </div>
      </div>
      );
    };

    const sectionClass = "ds-card p-6 scroll-mt-24";

    return (
      <div className="w-full max-w-4xl mx-auto custom-scrollbar h-full overflow-y-auto pr-2 pb-10">
        
        {statusMessage.text && (
          <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 transition-all sticky top-0 z-10 shadow-lg" style={{
            backgroundColor: statusMessage.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            borderColor: statusMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            color: statusMessage.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)'
          }}>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 mt-6 relative">

            {hasDraft && !initialData && (
              <div className="border rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--status-warning-bg)', borderColor: 'var(--status-warning)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--status-warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--status-warning-text)' }}>Existe um rascunho salvo automaticamente para este paciente.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={dismissDraft} className="ds-btn ds-btn-ghost px-3 py-1.5 text-xs">Descartar</button>
                  <button type="button" onClick={restoreDraft} className="ds-btn px-3 py-1.5 text-xs text-white" style={{ backgroundColor: 'var(--status-warning)' }}>Restaurar Rascunho</button>
                </div>
              </div>
            )}
            
            <div className="border rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md" style={{ backgroundColor: 'var(--accent)' }}>
                {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{patient?.nome || 'Paciente'}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{initialData ? 'Editando anamnese existente' : 'Nova anamnese estruturada — Adolescente'}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: 'var(--status-success)' }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{completionPct}%</span>
                </div>
                {autoSaveStatus && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-300 shrink-0" style={{
                    backgroundColor: autoSaveStatus === 'saving' ? 'var(--bg-primary)' : 'var(--status-success-bg)',
                    color: autoSaveStatus === 'saving' ? 'var(--text-muted)' : 'var(--status-success-text)'
                  }}>
                    {autoSaveStatus === 'saving' ? (
                      <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Salvando...</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Salvo</>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-3 custom-scrollbar sticky top-0 z-30 pt-2 px-1 border-b" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
              {STEPS.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => scrollToStep(idx)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded-xl transition-all border"
                  style={{
                    backgroundColor: currentStep === idx ? 'var(--accent)' : 'var(--bg-card)',
                    color: currentStep === idx ? '#FFFFFF' : 'var(--text-secondary)',
                    borderColor: currentStep === idx ? 'var(--accent)' : 'transparent',
                    boxShadow: currentStep === idx ? 'var(--shadow)' : 'none'
                  }}
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
            
            <section id="adolesc-step-0" className={sectionClass}>
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
                      <Switch label="Se sim, foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} />
                      <Switch label="Se sim, houve internamento?" name="houve_internamento" checked={formData.houve_internamento} />
                   </div>
                )}
            </section>

            <section id="adolesc-step-1" className={sectionClass}>
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo familiar." />
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Pai</label>
                           <input type="text" name="nome_pai" value={formData.nome_pai} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Idade</label>
                           <input type="number" name="idade_pai" value={formData.idade_pai} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Profissão</label>
                           <input type="text" name="profissao_pai" value={formData.profissao_pai} onChange={handleChange} className="ds-input" />
                        </div>
                    </div>

                    <div className="h-px w-full" style={{ backgroundColor: 'var(--border)' }}></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome da Mãe</label>
                           <input type="text" name="nome_mae" value={formData.nome_mae} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Idade</label>
                           <input type="number" name="idade_mae" value={formData.idade_mae} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Profissão</label>
                           <input type="text" name="profissao_mae" value={formData.profissao_mae} onChange={handleChange} className="ds-input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Qtd. Irmãos</label>
                           <input type="number" name="qtd_irmaos" value={formData.qtd_irmaos} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--status-info)' }}>Masculino</label>
                           <input type="number" name="irmaos_masculino" value={formData.irmaos_masculino} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1" style={{ color: 'var(--status-danger)' }}>Feminino</label>
                           <input type="number" name="irmaos_feminino" value={formData.irmaos_feminino} onChange={handleChange} className="ds-input" />
                        </div>
                    </div>
                    <TextArea name="observacoes_familiares" label="Observações Familiares" tip="Guarda ampliada, convivência com padrastos, irmãos meios, situação de abrigamento, violência doméstica, etc." placeholder="Detalhes adicionais..." />
                </div>
            </section>

            <section id="adolesc-step-2" className={`${sectionClass}`} style={{ borderLeft: '4px solid var(--accent)' }}>
                <SectionHeader step="2" title="Desenvolvimento e Escolaridade" desc="Gestação, desenvolvimento motor, linguagem e vida acadêmica." />
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="Gestação planejada?" name="gestacao_planejada" checked={formData.gestacao_planejada} /></div>
                       <div className="flex-1"><input type="text" name="gestacao_notas" value={formData.gestacao_notas} onChange={handleChange} placeholder="Como foi a gestação?" className="ds-input" /></div>
                    </div>

                    <div className="p-4 border rounded-xl flex flex-wrap items-center gap-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tipo de Parto:</span>
                        {['Natural', 'Cesárea'].map(t => (
                          <label key={t} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="tipo_parto" value={t} checked={formData.tipo_parto === t} onChange={handleChange} />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t}</span>
                          </label>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Testes do nascimento?" name="testes_nascimento" checked={formData.testes_nascimento} /></div>
                           <div className="flex-1"><input type="text" name="testes_notas" value={formData.testes_notas} onChange={handleChange} placeholder="Alterações?" className="ds-input" /></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Internação após nascer?" name="internacao_nascimento" checked={formData.internacao_nascimento} /></div>
                           <div className="flex-1"><input type="text" name="internacao_notas" value={formData.internacao_notas} onChange={handleChange} placeholder="Motivo e tempo" className="ds-input" /></div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="A criança mamou?" name="mamou" checked={formData.mamou} /></div>
                       <div className="flex-1"><input type="text" name="tempo_amamentacao" value={formData.tempo_amamentacao} onChange={handleChange} placeholder="Tempo de amamentação / desmame" className="ds-input" /></div>
                    </div>
                    
                    <TextArea name="desenvolvimento_motor" label="Desenvolvimento motor" tip="Quando começou a sentar, engatinhar, andar." rows={2} />
                    <TextArea name="atraso_fala" label="Desenvolvimento de linguagem" tip="Primeiras palavras, frases completas, dificuldade de articulação." rows={2} />

                    <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                       <div className="sm:w-72"><Switch label="Seletividade alimentar?" name="seletividade_alimentar" checked={formData.seletividade_alimentar} /></div>
                       <div className="flex-1"><input type="text" name="seletividade_notas" value={formData.seletividade_notas} onChange={handleChange} placeholder="Texturas, cores, sabores que evita..." className="ds-input" /></div>
                    </div>

                    <div className="h-px w-full" style={{ backgroundColor: 'var(--border)' }}></div>

                    <TextArea name="interacao_brincadeiras" label="Socialização" tip="Como interage com outras crianças? Prefere brincar sozinho ou em grupo?" rows={2} />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Dificuldade escolar?" name="dificuldade_escolar" checked={formData.dificuldade_escolar} /></div>
                       <div className="flex-1"><input type="text" name="dificuldade_escolar_notas" value={formData.dificuldade_escolar_notas} onChange={handleChange} placeholder="Quais matérias ou situações?" className="ds-input" /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Mudou de escola?" name="mudanca_escola" checked={formData.mudanca_escola} /></div>
                       <div className="flex-1"><input type="text" name="mudanca_escola_notas" value={formData.mudanca_escola_notas} onChange={handleChange} placeholder="Motivos das mudanças..." className="ds-input" /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-72"><Switch label="Sofrer bullying?" name="bullying" checked={formData.bullying} /></div>
                       <div className="flex-1"><input type="text" name="bullying_notas" value={formData.bullying_notas} onChange={handleChange} placeholder="Descreva: onde, quando, como reagiu..." className="ds-input" /></div>
                    </div>
                    <TextArea name="tempo_telas" label="Uso de telas" tip="Quantas horas por dia? Quais conteúdos consome?" rows={2} placeholder="Descreva a exposição a telas..." />
                </div>
            </section>

            <section id="adolesc-step-3" className={sectionClass}>
                <SectionHeader step="3" title="Motivo da Consulta e Dinâmicas" desc="Razões pela busca e contexto sócio-familiar." />
                <div className="space-y-4">
                    <TextArea name="motivo_consulta" label="Motivo da procura" tip="Queixa principal nas palavras do responsável e do adolescente." rows={4} />
                    <TextArea name="historico_queixa" label="Histórico da queixa" tip="Desde quando apresenta a queixa? Houve piora?" rows={3} />
                    <TextArea name="dinamica_familiar" label="Dinâmica Familiar" tip="Quem mora na casa, rotina familiar, vínculos." rows={3} />
                    <TextArea name="dinamica_amorosa" label="Vida Relacional / Amorosa" rows={2} placeholder="Para adolescentes: relacionamentos, identidade, sexualidade..." />
                </div>
            </section>

            <section id="step-4" className={sectionClass} style={{ borderLeft: '4px solid var(--accent)' }}>
                <SectionHeader step="4" title="Hábitos e Rotina" desc="Padrões de sono, alimentação, exercício e lazer." />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="rotina_sono" label="Qualidade do Sono" tip="Dorme sozinho? Tem pesadelos? Dificuldade para dormir?" rows={2} placeholder="Como é o sono da criança/adolescente?" />
                      <TextArea name="alimentacao_habitos" label="Alimentação" tip="Come bem? Recusa alimentos? Tem compulsão?" rows={2} placeholder="Descreva os hábitos alimentares..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="exercicio_fisico" label="Atividade Física" rows={2} placeholder="Pratica esporte?" />
                      <TextArea name="lazer_hobbies" label="Lazer e Hobbies" rows={2} placeholder="Do que gosta de brincar?" />
                    </div>
                </div>
            </section>

            <section id="adolesc-step-5" className={sectionClass}>
                <SectionHeader step="5" title="Quadro Clínico" desc="Sintomas, doenças e histórico médico." />
                <div className="space-y-4">
                    <TextArea name="sintomas_apresentados" label="Sintomas Apresentados" tip="Sintomas físicos e emocionais: agitação, irritabilidade, choro fácil, isolamento, etc." rows={3} danger />
                    <TextArea name="fatores_agravantes" label="Fatores agravantes" rows={2} danger />
                    <TextArea name="transtornos_anteriores" label="Histórico de Transtornos" tip="Diagnósticos prévios. Ex: TDAH, TEA, depressão." rows={2} danger />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextArea name="doencas_importantes" label="Doenças Importantes" rows={2} danger placeholder="Crônicas, cirurgias, alergias..." />
                        <TextArea name="medicamentos" label="Medicação Atual" rows={2} danger placeholder="Nome, dosagem..." />
                    </div>

                    <div className="p-5 rounded-xl mt-4 border" style={{ backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)' }}>
                       <label className="block text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--status-danger-text)' }}>
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve tentativas ou ideação suicida? Automutilação?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="ds-input resize-y" placeholder="Se sim, detalhe época, método, desfecho e acompanhamento pós-crise..." />
                    </div>
                </div>
            </section>

             <section id="adolesc-step-6" className={sectionClass}>
                <SectionHeader step="6" title="Finalização" desc="Expectativas do responsável e parecer profissional." />
                <div className="space-y-4">
                  <TextArea name="expectativa_responsavel" label="Expectativas do responsável" tip="Quais resultados esperam? O adolescente sabe por que está ali?" rows={3} placeholder="Expectativas da família..." />
                  <TextArea name="observacoes_gerais" label="Observações do Profissional" rows={5} placeholder="Impressões clínicas, hipóteses diagnósticas..." />
                </div>
            </section>

            <div className="sticky bottom-0 mt-6 py-4 flex items-center justify-between z-20 gap-4" style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 sm:hidden">
                <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: 'var(--status-success)' }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{completionPct}%</span>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="ds-btn ds-btn-primary px-8 py-3.5 ml-auto text-sm font-bold shadow-lg"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Assinar e Concluir Anamnese'}
              </button>
            </div>
        </form>
      </div>
    );
}
