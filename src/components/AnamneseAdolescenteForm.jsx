import logger from '../utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { criarAnamnese, atualizarAnamnese } from '../services/patientService';
import Tooltip from './Tooltip';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';
import AnamneseStepper from './anamnese/AnamneseStepper';

import { ClipboardList, Users, Smile, Target, Moon, Activity, CheckCircle2 } from 'lucide-react';

// ==========================================
// STEPS — Infanto-Juvenil
// ==========================================
const STEPS = [
  { key: 'historico', label: 'Histórico', icon: ClipboardList },
  { key: 'familia', label: 'Família', icon: Users },
  { key: 'desenvolvimento', label: 'Desenvolvimento', icon: Smile },
  { key: 'motivo', label: 'Motivo', icon: Target },
  { key: 'habitos', label: 'Hábitos', icon: Moon },
  { key: 'clinico', label: 'Quadro Clínico', icon: Activity },
  { key: 'finalizacao', label: 'Finalização', icon: CheckCircle2 },
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
  tipo_parto: '',
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

// ==========================================
// COMPONENTES DE UI (escopo de módulo: declarados dentro do form, remontavam a cada tecla e perdiam o foco)
// ==========================================
function Switch({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all group hover:border-brand-500/30" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <span className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <div className="relative shrink-0">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
        <div className="block w-10 h-6 rounded-full transition-colors" style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
    </label>
  );
}

// Mesmo ícone da etapa no stepper: liga visualmente o cabeçalho ao lugar onde ele aparece no topo
function SectionHeader({ title, desc, step }) {
  const Icone = STEPS[Number(step)]?.icon;
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 pt-4 sm:pt-8 first:pt-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
         {Icone && <Icone size={17} aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <h3 className="text-base sm:text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {desc && <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
      </div>
    </div>
  );
}

function TextArea({ name, value, onChange, label, tip, rows = 3, placeholder, danger }) {
  const isFilled = (value || '').trim().length > 0;
  return (
  <div>
    {tip ? (
      <Tooltip text={tip} showIcon>
        <label className="block text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
           {label}
           {!isFilled && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--status-warning)' }} title="Campo não preenchido"></span>}
        </label>
      </Tooltip>
    ) : (
      <label className="block text-xs font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
         {label}
         {!isFilled && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--status-warning)' }} title="Campo não preenchido"></span>}
      </label>
    )}
    <div className="relative">
      <textarea
        name={name} value={value || ''} onChange={onChange} rows={rows}
        placeholder={placeholder}
        className={`ds-input w-full resize-y min-h-[80px] custom-scrollbar text-sm leading-relaxed ${danger ? 'border-red-400' : !isFilled ? 'border-orange-300' : ''}`}
      />
      {isFilled && (
        <span className="absolute bottom-2 right-3 text-[10px] pointer-events-none" style={{ color: 'var(--text-muted)' }}>
          {(value || '').length} caracteres
        </span>
      )}
    </div>
  </div>
  );
}

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
    const [saved, setSaved] = useState(false);
    const submitLockRef = useRef(false);
    const pendingDraftRef = useRef(null);
    const draftErrorShownRef = useRef(false);

    // Rascunhos ficam no sessionStorage: existem só nesta aba e são apagados no logout.
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
        const stored = sessionStorage.getItem(draftKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.data && Object.values(parsed.data).some(v => v !== '' && v !== false && v !== 0 && v !== 'adolescente')) {
            setHasDraft(true);
          }
        }
      } catch { /* storage indisponível: segue sem rascunho */ }
    }, [draftKey, initialData]);

    // Grava o rascunho na hora; retorna false se o storage falhar (cota, modo privado)
    const writeDraft = useCallback((data) => {
      pendingDraftRef.current = null;
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ data, savedAt: new Date().toISOString() }));
        return true;
      } catch (err) {
        logger.error(err);
        return false;
      }
    }, [draftKey]);

    // Auto-save debounce (H1) — pausado enquanto o banner de rascunho está aberto e após salvar
    useEffect(() => {
      pendingDraftRef.current = null;
      if (initialData || hasDraft || saved) return;
      if (!Object.values(formData).some(v => v !== '' && v !== false && v !== 0 && v !== 'adolescente')) return;
      pendingDraftRef.current = formData;
      const timer = setTimeout(() => {
        setAutoSaveStatus('saving');
        if (!writeDraft(formData)) {
          setAutoSaveStatus('error');
          if (!draftErrorShownRef.current) {
            draftErrorShownRef.current = true;
            showToast({ type: 'error', message: 'Não foi possível salvar o rascunho automático neste navegador.' });
          }
          return;
        }
        setTimeout(() => {
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus(''), 3000);
        }, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }, [formData, initialData, hasDraft, saved, writeDraft, showToast]);

    // Ao desmontar ou sair da página, grava na hora o que o debounce ainda não salvou
    useEffect(() => {
      const flush = () => { if (pendingDraftRef.current) writeDraft(pendingDraftRef.current); };
      window.addEventListener('pagehide', flush);
      return () => { window.removeEventListener('pagehide', flush); flush(); };
    }, [writeDraft]);

    const restoreDraft = () => {
      try {
        const stored = sessionStorage.getItem(draftKey);
        if (stored) { setFormData(prev => ({ ...prev, ...JSON.parse(stored).data })); showToast({ type: 'success', message: 'Rascunho restaurado!' }); }
      } catch { showToast({ type: 'error', message: 'Erro ao restaurar.' }); }
      setHasDraft(false);
    };
    const dismissDraft = () => { try { sessionStorage.removeItem(draftKey); } catch { /* storage indisponível */ } setHasDraft(false); };
    const clearDraft = () => { try { sessionStorage.removeItem(draftKey); } catch { /* storage indisponível */ } };

    useEffect(() => {
        if (initialData) setFormData(prev => ({ ...prev, ...initialData }));
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      // Começar a digitar com o aviso aberto = começar do zero; o autosave volta a proteger o texto novo
      if (hasDraft) setHasDraft(false);
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const scrollToStep = (stepIndex) => {
      setCurrentStep(stepIndex);
      const el = document.getElementById(`adolesc-step-${stepIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Trava síncrona: Ctrl+S (requestSubmit) ignora o botão desabilitado
      if (submitLockRef.current) return;
      if (!Object.keys(INITIAL_STATE).some(k => k !== 'tipo' && typeof formData[k] === 'string' && formData[k].trim())) {
        showToast({ type: 'error', message: 'Preencha ao menos o motivo da consulta antes de salvar.' });
        scrollToStep(3);
        return;
      }
      submitLockRef.current = true;
      let created = false;
      setIsSubmitting(true);
      setStatusMessage({ type: '', text: '' });
      try {
        if (initialData?.id) {
            await atualizarAnamnese(initialData.id, patient.id, formData);
            showToast({ type: 'success', message: 'Anamnese atualizada com sucesso!' });
            clearDraft();
        } else {
            await criarAnamnese({ id_paciente: patient.id, ...formData });
            created = true;
            setSaved(true);
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
        logger.error(err);
        showToast({ type: 'error', message: 'Erro ao salvar a Anamnese.' });
      } finally {
        // Após criar, mantém a trava até o pai fechar o form (evita anamnese duplicada)
        if (!created) submitLockRef.current = false;
        setIsSubmitting(false);
      }
    };

    const sectionClass = "ds-card p-4 sm:p-6 scroll-mt-20 sm:scroll-mt-24";

    return (
      <div className="w-full max-w-4xl mx-auto custom-scrollbar h-full overflow-y-auto sm:pr-2 pb-10">
        
        {statusMessage.text && (
          <div className="mb-6 p-4 rounded-xl border flex items-start gap-3 transition-all sticky top-0 z-10 shadow-lg" style={{
            backgroundColor: statusMessage.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            borderColor: statusMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            color: statusMessage.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)'
          }}>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 mt-4 sm:mt-6 relative">

            {hasDraft && !initialData && (
              <div className="border rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--status-warning-bg)', borderColor: 'var(--status-warning)' }}>
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" style={{ color: 'var(--status-warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--status-warning-text)' }}>Existe um rascunho salvo automaticamente para este paciente. Se começar a digitar, ele será descartado.</p>
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button type="button" onClick={dismissDraft} className="ds-btn ds-btn-ghost flex-1 sm:flex-none px-3 py-2 text-xs">Descartar</button>
                  <button type="button" onClick={restoreDraft} className="ds-btn flex-1 sm:flex-none px-3 py-2 text-xs text-white" style={{ backgroundColor: 'var(--status-warning)' }}>Restaurar Rascunho</button>
                </div>
              </div>
            )}
            
            <div className="border rounded-2xl p-3.5 sm:p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-md" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{patient?.nome || 'Paciente'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{initialData ? 'Editando anamnese existente' : 'Nova anamnese estruturada — Adolescente'}</p>
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
                    backgroundColor: autoSaveStatus === 'saving' ? 'var(--bg-primary)' : autoSaveStatus === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
                    color: autoSaveStatus === 'saving' ? 'var(--text-muted)' : autoSaveStatus === 'error' ? 'var(--status-danger-text)' : 'var(--status-success-text)'
                  }}>
                    {autoSaveStatus === 'saving' ? (
                      <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Salvando...</>
                    ) : autoSaveStatus === 'error' ? (
                      <>Rascunho não salvo</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Salvo</>
                    )}
                  </div>
                )}
              </div>
            </div>

            <AnamneseStepper
              steps={STEPS}
              active={currentStep}
              onActiveChange={setCurrentStep}
              onSelect={scrollToStep}
              progressKey={formData}
              idPrefix="adolesc-step-"
            />
            
            <section id="adolesc-step-0" className={sectionClass}>
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} onChange={handleChange} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} onChange={handleChange} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-3.5 sm:p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
                      <Switch label="Se sim, foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} onChange={handleChange} />
                      <Switch label="Se sim, houve internamento?" name="houve_internamento" checked={formData.houve_internamento} onChange={handleChange} />
                   </div>
                )}
            </section>

            <section id="adolesc-step-1" className={sectionClass}>
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo familiar." />
                <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 md:col-span-1">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 md:col-span-1">
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

                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div>
                           <label className="block text-xs font-medium mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>Qtd. Irmãos</label>
                           <input type="number" name="qtd_irmaos" value={formData.qtd_irmaos} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1 truncate" style={{ color: 'var(--status-info)' }}>Masculino</label>
                           <input type="number" name="irmaos_masculino" value={formData.irmaos_masculino} onChange={handleChange} className="ds-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium mb-1 truncate" style={{ color: 'var(--status-danger)' }}>Feminino</label>
                           <input type="number" name="irmaos_feminino" value={formData.irmaos_feminino} onChange={handleChange} className="ds-input" />
                        </div>
                    </div>
                    <TextArea name="observacoes_familiares" value={formData.observacoes_familiares} onChange={handleChange} label="Observações Familiares" tip="Guarda ampliada, convivência com padrastos, irmãos meios, situação de abrigamento, violência doméstica, etc." placeholder="Detalhes adicionais..." />
                </div>
            </section>

            <section id="adolesc-step-2" className={`${sectionClass}`}>
                <SectionHeader step="2" title="Desenvolvimento e Escolaridade" desc="Gestação, desenvolvimento motor, linguagem e vida acadêmica." />
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="Gestação planejada?" name="gestacao_planejada" checked={formData.gestacao_planejada} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="gestacao_notas" value={formData.gestacao_notas} onChange={handleChange} placeholder="Como foi a gestação?" className="ds-input" /></div>
                    </div>

                    <div className="p-3.5 sm:p-4 border rounded-xl flex flex-wrap items-center gap-4 sm:gap-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tipo de Parto:</span>
                        {['Natural', 'Cesárea'].map(t => (
                          <label key={t} className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                            <input type="radio" name="tipo_parto" value={t} checked={formData.tipo_parto === t} onChange={handleChange} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t}</span>
                          </label>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 p-3.5 sm:p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Testes do nascimento?" name="testes_nascimento" checked={formData.testes_nascimento} onChange={handleChange} /></div>
                           <div className="flex-1"><input type="text" name="testes_notas" value={formData.testes_notas} onChange={handleChange} placeholder="Alterações?" className="ds-input" /></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <div className="flex-1"><Switch label="Internação após nascer?" name="internacao_nascimento" checked={formData.internacao_nascimento} onChange={handleChange} /></div>
                           <div className="flex-1"><input type="text" name="internacao_notas" value={formData.internacao_notas} onChange={handleChange} placeholder="Motivo e tempo" className="ds-input" /></div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1"><Switch label="A criança mamou?" name="mamou" checked={formData.mamou} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="tempo_amamentacao" value={formData.tempo_amamentacao} onChange={handleChange} placeholder="Tempo de amamentação / desmame" className="ds-input" /></div>
                    </div>
                    
                    <TextArea name="desenvolvimento_motor" value={formData.desenvolvimento_motor} onChange={handleChange} label="Desenvolvimento motor" tip="Quando começou a sentar, engatinhar, andar." rows={2} />
                    <TextArea name="atraso_fala" value={formData.atraso_fala} onChange={handleChange} label="Desenvolvimento de linguagem" tip="Primeiras palavras, frases completas, dificuldade de articulação." rows={2} />

                    <div className="flex flex-col sm:flex-row gap-3 p-3.5 sm:p-4 border rounded-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                       <div className="sm:w-64 shrink-0"><Switch label="Seletividade alimentar?" name="seletividade_alimentar" checked={formData.seletividade_alimentar} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="seletividade_notas" value={formData.seletividade_notas} onChange={handleChange} placeholder="Texturas, cores, sabores que evita..." className="ds-input" /></div>
                    </div>

                    <div className="h-px w-full" style={{ backgroundColor: 'var(--border)' }}></div>

                    <TextArea name="interacao_brincadeiras" value={formData.interacao_brincadeiras} onChange={handleChange} label="Socialização" tip="Como interage com outras crianças? Prefere brincar sozinho ou em grupo?" rows={2} />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-64 shrink-0"><Switch label="Dificuldade escolar?" name="dificuldade_escolar" checked={formData.dificuldade_escolar} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="dificuldade_escolar_notas" value={formData.dificuldade_escolar_notas} onChange={handleChange} placeholder="Quais matérias ou situações?" className="ds-input" /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-64 shrink-0"><Switch label="Mudou de escola?" name="mudanca_escola" checked={formData.mudanca_escola} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="mudanca_escola_notas" value={formData.mudanca_escola_notas} onChange={handleChange} placeholder="Motivos das mudanças..." className="ds-input" /></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="sm:w-64 shrink-0"><Switch label="Sofrer bullying?" name="bullying" checked={formData.bullying} onChange={handleChange} /></div>
                       <div className="flex-1"><input type="text" name="bullying_notas" value={formData.bullying_notas} onChange={handleChange} placeholder="Descreva: onde, quando, como reagiu..." className="ds-input" /></div>
                    </div>
                    <TextArea name="tempo_telas" value={formData.tempo_telas} onChange={handleChange} label="Uso de telas" tip="Quantas horas por dia? Quais conteúdos consome?" rows={2} placeholder="Descreva a exposição a telas..." />
                </div>
            </section>

            <section id="adolesc-step-3" className={sectionClass}>
                <SectionHeader step="3" title="Motivo da Consulta e Dinâmicas" desc="Razões pela busca e contexto sócio-familiar." />
                <div className="space-y-4">
                    <TextArea name="motivo_consulta" value={formData.motivo_consulta} onChange={handleChange} label="Motivo da procura" tip="Queixa principal nas palavras do responsável e do adolescente." rows={4} />
                    <TextArea name="historico_queixa" value={formData.historico_queixa} onChange={handleChange} label="Histórico da queixa" tip="Desde quando apresenta a queixa? Houve piora?" rows={3} />
                    <TextArea name="dinamica_familiar" value={formData.dinamica_familiar} onChange={handleChange} label="Dinâmica Familiar" tip="Quem mora na casa, rotina familiar, vínculos." rows={3} />
                    <TextArea name="dinamica_amorosa" value={formData.dinamica_amorosa} onChange={handleChange} label="Vida Relacional / Amorosa" rows={2} placeholder="Para adolescentes: relacionamentos, identidade, sexualidade..." />
                </div>
            </section>

            <section id="adolesc-step-4" className={sectionClass}>
                <SectionHeader step="4" title="Hábitos e Rotina" desc="Padrões de sono, alimentação, exercício e lazer." />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="rotina_sono" value={formData.rotina_sono} onChange={handleChange} label="Qualidade do Sono" tip="Dorme sozinho? Tem pesadelos? Dificuldade para dormir?" rows={2} placeholder="Como é o sono da criança/adolescente?" />
                      <TextArea name="alimentacao_habitos" value={formData.alimentacao_habitos} onChange={handleChange} label="Alimentação" tip="Come bem? Recusa alimentos? Tem compulsão?" rows={2} placeholder="Descreva os hábitos alimentares..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="exercicio_fisico" value={formData.exercicio_fisico} onChange={handleChange} label="Atividade Física" rows={2} placeholder="Pratica esporte?" />
                      <TextArea name="lazer_hobbies" value={formData.lazer_hobbies} onChange={handleChange} label="Lazer e Hobbies" rows={2} placeholder="Do que gosta de brincar?" />
                    </div>
                </div>
            </section>

            <section id="adolesc-step-5" className={sectionClass}>
                <SectionHeader step="5" title="Quadro Clínico" desc="Sintomas, doenças e histórico médico." />
                <div className="space-y-4">
                    <TextArea name="sintomas_apresentados" value={formData.sintomas_apresentados} onChange={handleChange} label="Sintomas Apresentados" tip="Sintomas físicos e emocionais: agitação, irritabilidade, choro fácil, isolamento, etc." rows={3} danger />
                    <TextArea name="fatores_agravantes" value={formData.fatores_agravantes} onChange={handleChange} label="Fatores agravantes" rows={2} danger />
                    <TextArea name="transtornos_anteriores" value={formData.transtornos_anteriores} onChange={handleChange} label="Histórico de Transtornos" tip="Diagnósticos prévios. Ex: TDAH, TEA, depressão." rows={2} danger />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextArea name="doencas_importantes" value={formData.doencas_importantes} onChange={handleChange} label="Doenças Importantes" rows={2} danger placeholder="Crônicas, cirurgias, alergias..." />
                        <TextArea name="medicamentos" value={formData.medicamentos} onChange={handleChange} label="Medicação Atual" rows={2} danger placeholder="Nome, dosagem..." />
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl mt-4 border" style={{ backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)' }}>
                       <label className="block text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--status-danger-text)' }}>
                         <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve tentativas ou ideação suicida? Automutilação?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="ds-input resize-y" placeholder="Se sim, detalhe época, método, desfecho e acompanhamento pós-crise..." />
                    </div>
                </div>
            </section>

             <section id="adolesc-step-6" className={sectionClass}>
                <SectionHeader step="6" title="Finalização" desc="Expectativas do responsável e parecer profissional." />
                <div className="space-y-4">
                  <TextArea name="expectativa_responsavel" value={formData.expectativa_responsavel} onChange={handleChange} label="Expectativas do responsável" tip="Quais resultados esperam? O adolescente sabe por que está ali?" rows={3} placeholder="Expectativas da família..." />
                  <TextArea name="observacoes_gerais" value={formData.observacoes_gerais} onChange={handleChange} label="Observações do Profissional" rows={5} placeholder="Impressões clínicas, hipóteses diagnósticas..." />
                </div>
            </section>

            <div className="sticky bottom-0 mt-6 py-3.5 sm:py-4 flex items-center justify-between z-20 gap-3 safe-bottom" style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 sm:hidden shrink-0">
                <div className="w-14 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: 'var(--status-success)' }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{completionPct}%</span>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || saved}
                className="ds-btn ds-btn-primary px-5 sm:px-8 py-3 sm:py-3.5 min-h-[44px] flex-1 sm:flex-none sm:ml-auto text-sm font-bold shadow-lg"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Assinar e Concluir Anamnese'}
              </button>
            </div>
        </form>
      </div>
    );
}
