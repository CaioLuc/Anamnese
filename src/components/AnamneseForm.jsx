import logger from '../utils/logger';
import { useState, useEffect, useRef, useCallback } from 'react';
import { criarAnamnese, atualizarAnamnese } from '../services/patientService';
import Tooltip from './Tooltip';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';
import AnamneseStepper from './anamnese/AnamneseStepper';

import { ClipboardList, Users, Target, Repeat, Moon, Activity, CheckCircle2 } from 'lucide-react';

// ==========================================
// CAMPOS E STEPS — Fonte única de verdade
// ==========================================
const STEPS = [
  { key: 'historico', label: 'Histórico', icon: ClipboardList },
  { key: 'familia', label: 'Família', icon: Users },
  { key: 'motivo', label: 'Motivo', icon: Target },
  { key: 'dinamicas', label: 'Dinâmicas', icon: Repeat },
  { key: 'habitos', label: 'Hábitos', icon: Moon },
  { key: 'clinico', label: 'Quadro Clínico', icon: Activity },
  { key: 'finalizacao', label: 'Finalização', icon: CheckCircle2 },
];

const INITIAL_STATE = {
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
  dinamica_social: '',
  
  // Seção 4: Hábitos e Rotina (NOVO)
  rotina_sono: '',
  alimentacao: '',
  exercicio_fisico: '',
  lazer_hobbies: '',
  espiritualidade: '',
  
  // Seção 5: Quadro Clínico e Sintomas
  sintomas_apresentados: '',
  fatores_agravantes: '',
  transtornos_anteriores: '',
  doencas_importantes: '',
  medicamentos: '',
  uso_substancias: '',
  tentativa_suicidio: '',
  
  // Seção 6: Finalização
  expectativa_terapia: '',
  observacoes_gerais: ''
};

// ==========================================
// COMPONENTES DE UI (escopo de módulo: declarados dentro do form, remontavam a cada tecla e perdiam o foco)
// ==========================================
function Switch({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border transition-all group hover:border-brand-500/30" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <span className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <div className="relative">
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
    <div className="flex items-center gap-4 mb-6 pt-8 first:pt-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}>
         {Icone && <Icone size={17} aria-hidden="true" />}
      </div>
      <div>
        <h3 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {desc && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{desc}</p>}
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
        className={`ds-input resize-y min-h-[80px] custom-scrollbar text-sm leading-relaxed ${
          danger
            ? 'border-red-400'
            : !isFilled
              ? 'border-orange-300'
              : ''
        }`}
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

export default function AnamneseForm({ patient, onSaved, initialData }) {
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
    const draftKey = `caritas_anamnese_draft_${patient?.id || 'unknown'}`;

    // Completion tracking
    const totalFields = Object.keys(INITIAL_STATE).length;
    const filledFields = Object.entries(formData).filter(([, v]) => v !== '' && v !== false && v !== 0).length;
    const completionPct = Math.round((filledFields / totalFields) * 100);

    // Warn on unsaved changes (H3)
    const hasUnsavedData = filledFields > 0;
    useUnsavedChanges(hasUnsavedData);

    // Keyboard shortcut (H7)
    useKeyboard([
      { key: 's', ctrl: true, action: () => formRef.current?.requestSubmit() },
    ]);

    // Auto-save: Restore draft on mount (H1)
    useEffect(() => {
      if (initialData) return;
      try {
        const stored = sessionStorage.getItem(draftKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.data && Object.values(parsed.data).some(v => v !== '' && v !== false && v !== 0)) {
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
      if (!Object.values(formData).some(v => v !== '' && v !== false && v !== 0)) return;
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
        if (stored) {
          const parsed = JSON.parse(stored);
          setFormData(prev => ({ ...prev, ...parsed.data }));
          showToast({ type: 'success', message: 'Rascunho restaurado com sucesso!' });
        }
      } catch {
        showToast({ type: 'error', message: 'Erro ao restaurar rascunho.' });
      }
      setHasDraft(false);
    };

    const dismissDraft = () => {
      try { sessionStorage.removeItem(draftKey); } catch { /* storage indisponível */ }
      setHasDraft(false);
    };

    const clearDraft = () => {
      try { sessionStorage.removeItem(draftKey); } catch { /* storage indisponível */ }
    };

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
      const el = document.getElementById(`step-${stepIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // Trava síncrona: Ctrl+S (requestSubmit) ignora o botão desabilitado
      if (submitLockRef.current) return;
      if (!Object.keys(INITIAL_STATE).some(k => typeof formData[k] === 'string' && formData[k].trim())) {
        showToast({ type: 'error', message: 'Preencha ao menos o motivo da consulta antes de salvar.' });
        scrollToStep(2);
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
            showToast({ type: 'success', message: 'Anamnese estruturada salva com sucesso!' });
            clearDraft();
        }
        
        if (onSaved) setTimeout(() => onSaved(), 1500);

        const durationMs = Date.now() - formStartTime.current;
        trackAction(initialData?.id ? 'UPDATE_ANAMNESIS_FORM' : 'SUBMIT_ANAMNESIS_FORM', {
          patientId: patient?.id,
          durationMs,
          durationFormatted: `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`,
          totalFields, filledFields,
          completionRate: `${completionPct}%`,
          isEdit: !!initialData?.id
        });
      } catch (err) {
        logger.error(err);
        showToast({ type: 'error', message: 'Erro ao salvar a Anamnese. Verifique sua conexão.' });
      } finally {
        // Após criar, mantém a trava até o pai fechar o form (evita anamnese duplicada)
        if (!created) submitLockRef.current = false;
        setIsSubmitting(false);
      }
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

            {/* Draft banner */}
            {hasDraft && !initialData && (
              <div className="border rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--status-warning-bg)', borderColor: 'var(--status-warning)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--status-warning)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--status-warning-text)' }}>Existe um rascunho salvo automaticamente para este paciente. Se começar a digitar, ele será descartado.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={dismissDraft} className="ds-btn ds-btn-ghost px-3 py-1.5 text-xs">
                    Descartar
                  </button>
                  <button type="button" onClick={restoreDraft} className="ds-btn px-3 py-1.5 text-xs text-white" style={{ backgroundColor: 'var(--status-warning)' }}>
                    Restaurar Rascunho
                  </button>
                </div>
              </div>
            )}
            
            {/* Patient card + auto-save + progress */}
            <div className="border rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center  font-bold text-lg shrink-0 shadow-md" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{patient?.nome || 'Paciente'}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{initialData ? 'Editando anamnese existente' : 'Nova anamnese estruturada — Adulto'}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Completion */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: 'var(--status-success)' }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{completionPct}%</span>
                </div>
                {/* Auto-save indicator */}
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

            {/* Stepper */}
            <AnamneseStepper
              steps={STEPS}
              active={currentStep}
              onActiveChange={setCurrentStep}
              onSelect={scrollToStep}
              progressKey={formData}
            />
            
            {/* ==========================================
                SEÇÃO 0: Histórico Prévio
            ========================================== */}
            <section id="step-0" className={sectionClass}>
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} onChange={handleChange} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} onChange={handleChange} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--border)' }}>
                      <Switch label="Se sim, foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} onChange={handleChange} />
                      <Switch label="Se sim, houve internamento?" name="houve_internamento" checked={formData.houve_internamento} onChange={handleChange} />
                   </div>
                )}
            </section>

            {/* ==========================================
                SEÇÃO 1: Dados Familiares
            ========================================== */}
            <section id="step-1" className={sectionClass}>
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo familiar." />
                <div className="space-y-5">
                    {/* Pai */}
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

                    {/* Mãe */}
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

                    {/* Irmãos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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

                    <TextArea name="observacoes_familiares" value={formData.observacoes_familiares} onChange={handleChange} label="Outras Observações Familiares" tip="Inclua informações sobre a dinâmica de convivência, divorcios, adoção, pais ausentes, violência doméstica ou outros fatores relevantes da história familiar." placeholder="Detalhes adicionais sobre a família..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 2: Motivo da Consulta
            ========================================== */}
            <section id="step-2" className={sectionClass}>
                <SectionHeader step="2" title="Motivo da Consulta" desc="Razões principais pela busca do atendimento e sua história." />
                <div className="space-y-4">
                    <TextArea name="motivo_consulta" value={formData.motivo_consulta} onChange={handleChange} label="Qual o motivo da procura pelo atendimento psicológico?" tip="Registre a queixa principal nas palavras do paciente. Inclua fatores emocionais, cognitivos e comportamentais que motivaram a busca por ajuda." rows={4} placeholder="Descreva o que trouxe o paciente até aqui..." />
                    <TextArea name="historico_queixa" value={formData.historico_queixa} onChange={handleChange} label="Histórico das dificuldades relatadas" tip="Desde quando apresenta a queixa? Houve piora recente? O que já tentou para lidar com o problema? Qual o impacto na vida cotidiana?" rows={4} placeholder="Cronologia e evolução da queixa..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 3: Dinâmicas de Vida
            ========================================== */}
            <section id="step-3" className={sectionClass}>
                <SectionHeader step="3" title="Dinâmicas de Vida" desc="Estruturação da rotina, relacionamentos e vida social." />
                <div className="space-y-4">
                    <TextArea name="dinamica_familiar" value={formData.dinamica_familiar} onChange={handleChange} label="Dinâmica Familiar (Nuclear e Constituída)" tip="Descreva quem mora na casa, qualidade do relacionamento com familiares próximos, conflitos, lutos ou separações marcantes." rows={3} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="dinamica_profissional" value={formData.dinamica_profissional} onChange={handleChange} label="Área Profissional / Acadêmica" tip="Ocupação atual, satisfação, pressões, conflitos com colegas ou superiores. Se estudante, desempenho escolar e relacionamento com professores." rows={3} />
                      <TextArea name="dinamica_amorosa" value={formData.dinamica_amorosa} onChange={handleChange} label="Vida Amorosa / Relacional" tip="Estado civil, duração do relacionamento atual, padrões relacionais, dificuldades de intimidade, histórico de relacionamentos abusivos." rows={3} />
                    </div>
                    <TextArea name="dinamica_social" value={formData.dinamica_social} onChange={handleChange} label="Vida Social e Rede de Apoio" tip="Amizades, suporte social, isolamento, participação em grupos, senso de pertencimento." rows={2} placeholder="Descreva a rede de apoio social do paciente..." />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 4: Hábitos e Rotina (NOVO)
            ========================================== */}
            <section id="step-4" className={sectionClass}>
                <SectionHeader step="4" title="Hábitos e Rotina" desc="Padrões de sono, alimentação, exercício e lazer." />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="rotina_sono" value={formData.rotina_sono} onChange={handleChange} label="Qualidade do Sono" tip="Horário de dormir e acordar, insônia, bruxismo, apneia, pesadelos recorrentes, uso de medicação para dormir, horas de sono por noite." rows={2} placeholder="Dorme bem? Quantas horas?" />
                      <TextArea name="alimentacao" value={formData.alimentacao} onChange={handleChange} label="Alimentação" tip="Padrão alimentar, restrições, compulsão, perda de apetite, relação emocional com comida." rows={2} placeholder="Come bem? Alguma restrição?" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextArea name="exercicio_fisico" value={formData.exercicio_fisico} onChange={handleChange} label="Exercício Físico" rows={2} placeholder="Pratica atividade física? Qual e com que frequência?" />
                      <TextArea name="lazer_hobbies" value={formData.lazer_hobbies} onChange={handleChange} label="Lazer e Hobbies" rows={2} placeholder="O que faz para se divertir? Tem hobbies?" />
                    </div>
                    <TextArea name="espiritualidade" value={formData.espiritualidade} onChange={handleChange} label="Espiritualidade / Religiosidade" tip="Vínculo religioso, práticas espirituais, crenças que influenciam o processo terapêutico." rows={2} placeholder="Tem alguma religião ou prática espiritual?" />
                </div>
            </section>

            {/* ==========================================
                SEÇÃO 5: Quadro Clínico e Sintomas
            ========================================== */}
            <section id="step-5" className={`${sectionClass} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] pointer-events-none"></div>
                <SectionHeader step="5" title="Quadro Clínico e Sintomatológico" desc="Fatores de crise, doenças e uso de substâncias." />
                <div className="space-y-4 relative z-10">
                    <TextArea name="sintomas_apresentados" value={formData.sintomas_apresentados} onChange={handleChange} label="Sintomas Apresentados Atualmente" tip="Inclua sintomas físicos (insônia, dor de cabeça, taquicardia) e emocionais (tristeza, irritabilidade, apatia). Frequência e intensidade." rows={3} danger />
                    <TextArea name="fatores_agravantes" value={formData.fatores_agravantes} onChange={handleChange} label="Eventos/fatores que precipitam ou agravam crises" rows={3} danger />
                    <TextArea name="transtornos_anteriores" value={formData.transtornos_anteriores} onChange={handleChange} label="Histórico de Transtornos (Paciente e Família)" tip="Diagnósticos prévios do paciente ou de familiares. Ex: depressão na família, diagnóstico de TDAH na infância." rows={3} danger />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextArea name="doencas_importantes" value={formData.doencas_importantes} onChange={handleChange} label="Doenças Importantes (Antecedentes)" rows={2} danger placeholder="Doenças crônicas, cirurgias, alergias..." />
                        <TextArea name="medicamentos" value={formData.medicamentos} onChange={handleChange} label="Medicações em Uso Atualmente" rows={2} danger placeholder="Nome, dosagem, prescrito por quem..." />
                    </div>

                    <TextArea name="uso_substancias" value={formData.uso_substancias} onChange={handleChange} label="Uso de Substâncias Psicoativas" tip="Tabagismo, álcool, drogas ilícitas. Frequência, quantidade e tempo de uso." rows={2} danger />

                    {/* Suicide alert */}
                    <div className="p-5 rounded-xl mt-4 border" style={{ backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)' }}>
                       <label className="block text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--status-danger-text)' }}>
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve tentativas ou ideação suicida?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="ds-input resize-y" placeholder="Se sim, detalhe época, método, desfecho e acompanhamento pós-crise..." />
                    </div>
                </div>
            </section>

             {/* ==========================================
                 SEÇÃO 6: Finalização
             ========================================== */}
             <section id="step-6" className={`${sectionClass} bg-gradient-to-br from-brand-500/5 to-transparent`}>
                <SectionHeader step="6" title="Finalização" desc="Expectativas do paciente e parecer profissional." />
                <div className="space-y-4">
                  <TextArea name="expectativa_terapia" value={formData.expectativa_terapia} onChange={handleChange} label="O que o paciente espera da terapia?" tip="Expectativas, objetivos, medos em relação ao processo terapêutico." rows={3} placeholder="Quais resultados o paciente deseja alcançar..." />
                  <TextArea name="observacoes_gerais" value={formData.observacoes_gerais} onChange={handleChange} label="Observações Gerais do Profissional" rows={5} placeholder="Anotações de percepções psicoterapêuticas da primeira consulta, hipóteses diagnósticas, impressões clínicas..." />
                </div>
            </section>

            {/* Submit button */}
            <div className="sticky bottom-0 mt-6 py-4 flex items-center justify-between z-20 gap-4" style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 sm:hidden">
                <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, backgroundColor: 'var(--status-success)' }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{completionPct}%</span>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || saved}
                className="ds-btn ds-btn-primary px-8 py-3.5 ml-auto text-sm font-bold shadow-lg"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Assinar e Concluir Anamnese'}
              </button>
            </div>
        </form>
      </div>
    );
}
