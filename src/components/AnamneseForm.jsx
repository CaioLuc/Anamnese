import { useState, useEffect, useRef, useCallback } from 'react';
import { criarAnamnese, atualizarAnamnese } from '../services/patientService';
import Tooltip from './Tooltip';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';

export default function AnamneseForm({ patient, onSaved, initialData }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  
    // ==========================================
    // ESTRUTURA DE ESTADO DA ANAMNESE COMPLETA
    // ==========================================
    const [formData, setFormData] = useState({
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
      
      // Seção 2: Motivo da Consulta
      motivo_consulta: '',
      historico_queixa: '',
      
      // Seção 3: Dinâmicas de Vida
      dinamica_familiar: '',
      dinamica_profissional: '',
      dinamica_amorosa: '',
      
      // Seção 4: Quadro Clínico e Sintomas
      sintomas_apresentados: '',
      fatores_agravantes: '',
      transtornos_anteriores: '',
      doencas_importantes: '',
      medicamentos: '',
      uso_substancias: '',
      tentativa_suicidio: '',
      
      // Seção 5: Finalização
      observacoes_gerais: ''
    });

    const [currentStep, setCurrentStep] = useState(0);
    const formRef = useRef(null);
    const formStartTime = useRef(Date.now());
    const { showToast } = useToast();
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'
    const [hasDraft, setHasDraft] = useState(false);
    const autoSaveTimerRef = useRef(null);

    // Chave do rascunho no localStorage
    const draftKey = `caritas_anamnese_draft_${patient?.id || 'unknown'}`;

    // Warn on unsaved changes (H3)
    const hasUnsavedData = Object.values(formData).some(v => v !== '' && v !== false && v !== 0);
    useUnsavedChanges(hasUnsavedData);

    // Keyboard shortcut (H7)
    useKeyboard([
      { key: 's', ctrl: true, action: () => formRef.current?.requestSubmit() },
    ]);

    // Auto-save: Restaurar rascunho ao montar (H1)
    useEffect(() => {
      if (initialData) return; // Não restaurar rascunho ao editar anamnese existente
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

    // Auto-save: Debounce de 2 segundos ao alterar o formulário (H1)
    const scheduleAutoSave = useCallback((data) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        try {
          const hasContent = Object.values(data).some(v => v !== '' && v !== false && v !== 0);
          if (!hasContent) return;
          setAutoSaveStatus('saving');
          localStorage.setItem(draftKey, JSON.stringify({
            data,
            savedAt: new Date().toISOString()
          }));
          setTimeout(() => {
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus(''), 3000);
          }, 300);
        } catch (_) {}
      }, 2000);
    }, [draftKey]);

    // Disparar auto-save quando formData mudar
    useEffect(() => {
      if (!initialData) {
        scheduleAutoSave(formData);
      }
      return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
    }, [formData, scheduleAutoSave, initialData]);

    const restoreDraft = () => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData(prev => ({ ...prev, ...parsed.data }));
          showToast({ type: 'success', message: 'Rascunho restaurado com sucesso!' });
        }
      } catch (_) {
        showToast({ type: 'error', message: 'Erro ao restaurar rascunho.' });
      }
      setHasDraft(false);
    };

    const dismissDraft = () => {
      try { localStorage.removeItem(draftKey); } catch (_) {}
      setHasDraft(false);
    };

    const clearDraft = () => {
      try { localStorage.removeItem(draftKey); } catch (_) {}
    };

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const scrollToStep = (stepIndex) => {
      setCurrentStep(stepIndex);
      const el = document.getElementById(`step-${stepIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
            await criarAnamnese({
              id_paciente: patient.id,
              ...formData
            });
            showToast({ type: 'success', message: 'Anamnese estruturada salva com sucesso!' });
            clearDraft();
        }
        
        if (onSaved) {
            setTimeout(() => onSaved(), 1500);
        }

        // Log telemetry
        const durationMs = Date.now() - formStartTime.current;
        const totalFields = Object.keys(formData).length;
        const filledFields = Object.entries(formData).filter(([, v]) => v !== '' && v !== false && v !== 0).length;
        trackAction(initialData?.id ? 'UPDATE_ANAMNESIS_FORM' : 'SUBMIT_ANAMNESIS_FORM', {
          patientId: patient?.id,
          durationMs,
          durationFormatted: `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`,
          totalFields,
          filledFields,
          completionRate: `${Math.round((filledFields / totalFields) * 100)}%`,
          isEdit: !!initialData?.id
        });
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: 'Erro ao salvar a Anamnese. Verifique sua conexão.' });
      } finally {
        setIsSubmitting(false);
      }
    };

    const Switch = ({ label, name, checked }) => (
      <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="relative">
          <input type="checkbox" name={name} checked={checked} onChange={handleChange} className="sr-only" />
          <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-zinc-700'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
    );

    const SectionHeader = ({ title, desc, step }) => (
        <div className="flex items-center gap-4 mb-6 pt-8 first:pt-0">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner border border-indigo-500/30">
             {step}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {desc && <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>}
          </div>
        </div>
    );

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

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-10 mt-6 relative">

            {/* Banner de rascunho salvo (H1 - Auto-save) */}
            {hasDraft && !initialData && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Existe um rascunho salvo automaticamente para este paciente.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={dismissDraft} className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    Descartar
                  </button>
                  <button type="button" onClick={restoreDraft} className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors">
                    Restaurar Rascunho
                  </button>
                </div>
              </div>
            )}
            
            {/* Nome do paciente */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-bold text-lg shrink-0">
                {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-white">{patient?.nome || 'Paciente'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{initialData ? 'Editando anamnese existente' : 'Nova anamnese estruturada'}</p>
              </div>
              {/* Indicador de auto-save (H1) */}
              {autoSaveStatus && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-300 shrink-0 ${
                  autoSaveStatus === 'saving'
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-400'
                    : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                }`}>
                  {autoSaveStatus === 'saving' ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Salvando rascunho...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Rascunho salvo
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Visual Stepper (H10) */}
            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-30 pt-2 border-b border-slate-200 dark:border-white/5">
              {['Histórico', 'Família', 'Motivo', 'Dinâmicas', 'Quadro Clínico', 'Finalização'].map((label, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => scrollToStep(idx)}
                  className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${
                    currentStep === idx 
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' 
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Seção 0 */}
            <section id="step-0" className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg scroll-mt-24">
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 animate-in fade-in zoom-in-95 duration-200">
                      <Switch label="Se sim, foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} />
                      <Switch label="Se sim, houve internamento?" name="houve_internamento" checked={formData.houve_internamento} />
                   </div>
                )}
            </section>

            {/* Seção 1 */}
            <section id="step-1" className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg scroll-mt-24">
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo base." />
                
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Pai</label>
                           <input type="text" name="nome_pai" value={formData.nome_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade do Pai</label>
                           <input type="number" name="idade_pai" value={formData.idade_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div className="md:col-span-3">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão do Pai</label>
                           <input type="text" name="profissao_pai" value={formData.profissao_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-4"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome da Mãe</label>
                           <input type="text" name="nome_mae" value={formData.nome_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade da Mãe</label>
                           <input type="number" name="idade_mae" value={formData.idade_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div className="md:col-span-3">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão da Mãe</label>
                           <input type="text" name="profissao_mae" value={formData.profissao_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Qtd. Irmãos</label>
                           <input type="number" name="qtd_irmaos" value={formData.qtd_irmaos} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-blue-400 mb-1">Destes: Masculino</label>
                           <input type="number" name="irmaos_masculino" value={formData.irmaos_masculino} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-pink-400 mb-1">Destes: Feminino</label>
                           <input type="number" name="irmaos_feminino" value={formData.irmaos_feminino} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>

                    <div>
                       <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Outras Observações Familiares</label>
                       <textarea name="observacoes_familiares" value={formData.observacoes_familiares} onChange={handleChange} rows="3" className="w-full p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                    </div>
                </div>
            </section>

            {/* Seção 2 */}
            <section id="step-2" className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg scroll-mt-24">
                <SectionHeader step="2" title="Motivo da Consulta" desc="Razões principais pela busca do atendimento e sua história." />
                <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Qual o motivo da procura pelo atendimento psicológico?</label>
                       <textarea name="motivo_consulta" value={formData.motivo_consulta} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Histórico das dificuldades relatadas (Desde quando apresenta a queixa? Houve piora recente?)</label>
                       <textarea name="historico_queixa" value={formData.historico_queixa} onChange={handleChange} rows="4" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
            </section>

            {/* Seção 3 */}
            <section id="step-3" className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg scroll-mt-24">
                <SectionHeader step="3" title="Dinâmicas de Vida" desc="Estruturação da rotina, relacionamentos sociais e de trabalho." />
                <div className="space-y-4">
                    <div>
                         <Tooltip text="Descreva quem mora na casa, qualidade do relacionamento com familiares próximos, histórico de conflitos, lutos ou separações marcantes." showIcon>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Dinâmica Familiar (Famílias nuclear e constituída)</label>
                         </Tooltip>
                       <textarea name="dinamica_familiar" value={formData.dinamica_familiar} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Dinâmica da Área Profissional / Acadêmica</label>
                       <textarea name="dinamica_profissional" value={formData.dinamica_profissional} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Dinâmica da Vida Amorosa / Relacional</label>
                       <textarea name="dinamica_amorosa" value={formData.dinamica_amorosa} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
            </section>

            {/* Seção 4 */}
            <section id="step-4" className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg relative overflow-hidden scroll-mt-24">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] pointer-events-none"></div>
                <SectionHeader step="4" title="Quadro Clínico e Sintomatológico" desc="Fatores de crise, doenças e uso substâncias." />
                <div className="space-y-4 relative z-10">
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Sintomas Apresentados Atualmente</label>
                       <textarea name="sintomas_apresentados" value={formData.sintomas_apresentados} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Quais eventos/fatores costumam precipitar ou agravar suas crises?</label>
                       <textarea name="fatores_agravantes" value={formData.fatores_agravantes} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Histórico de Transtornos Psiquiátricos (Anteriores e Familiares)</label>
                       <textarea name="transtornos_anteriores" value={formData.transtornos_anteriores} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Doenças Importantes (Antecedentes Médicos)</label>
                           <textarea name="doencas_importantes" value={formData.doencas_importantes} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Medicações em Uso Atualmente</label>
                           <textarea name="medicamentos" value={formData.medicamentos} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                        </div>
                    </div>

                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Faz uso de Substâncias Psicoativas? Se sim, quais e há quanto tempo?</label>
                       <textarea name="uso_substancias" value={formData.uso_substancias} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>

                    {/* ALERTA SUICÍDIO */}
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-4">
                       <label className="block text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve tentativas de suicídio?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="w-full p-3 bg-zinc-950/90 border border-red-500/20 rounded-lg text-red-100 placeholder-red-900/50 resize-y focus:ring-1 focus:ring-red-500 text-sm" placeholder="Se sim, detalhe época, método e desfecho..." />
                    </div>
                </div>
            </section>

             {/* Seção 5 */}
             <section id="step-5" className="bg-gradient-to-br from-white/5 to-transparent p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg scroll-mt-24">
                <SectionHeader step="5" title="Finalização" desc="Parecer do profissional ou comentários extras não mapeados." />
                <div>
                   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Observações Gerais Feitas pelo Profissional</label>
                   <textarea name="observacoes_gerais" value={formData.observacoes_gerais} onChange={handleChange} rows="5" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-indigo-500" placeholder="Anotações de percepções psicoterapêuticas da primeira consulta..." />
                </div>
            </section>

            {/* BOTÃO FLUTUANTE DE SALVAR */}
            <div className="sticky bottom-0 mt-8 py-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-white/5 flex justify-end z-20">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-white transition-all bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-xl shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Assinar e Concluir Anamnese Completa'}
              </button>
            </div>
        </form>
      </div>
    );
}
