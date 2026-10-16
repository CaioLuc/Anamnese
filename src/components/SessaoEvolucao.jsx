import logger from '../utils/logger';
import { useState, useEffect, useRef } from 'react';
import { dataLocalISO } from '../utils/formatUtils';
import { criarSessao, lerPerfilPsicologo } from '../services/patientService';
import { gerarEvolucaoSessaoPDF } from '../services/pdfUtils';
import { gerarResumoIA } from '../services/iaService';
import UpgradeProModal from './UpgradeProModal';
import Tooltip from './Tooltip';
import { useKeyboard } from '../hooks/useKeyboard';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';
import Button from './ui/Button';
import Select from './ui/Select';

const corHumor = (n) => (n <= 3 ? 'var(--status-danger)' : n <= 6 ? 'var(--status-warning)' : 'var(--status-success)');
const rotuloHumor = (n) => (n <= 2 ? 'Muito baixo' : n <= 4 ? 'Baixo' : n <= 6 ? 'Moderado' : n <= 8 ? 'Bom' : 'Muito bom');
const contarPalavras = (texto) => (texto.trim() ? texto.trim().split(/\s+/).length : 0);

export default function SessaoEvolucao({ patients, isLoadingPatients, preSelectedPatient }) {
  const [formData, setFormData] = useState({
    id_paciente: preSelectedPatient?.id || '',
    data_sessao: dataLocalISO(),
    status: 'Presente',
    humor: 5,
    observacoes: '',
    comportamento: '',
    sintomas: '',
    valor: '',
    pago: false,
    forma_pagamento: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [patientSearch, setPatientSearch] = useState(preSelectedPatient?.nome || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // null = plano desconhecido (carregando ou falha na leitura)
  const [planoPsicologo, setPlanoPsicologo] = useState(null);
  const [profissional, setProfissional] = useState(null);
  // Texto original das observações antes do resumo da I.A. (para desfazer)
  const [observacoesAntesIA, setObservacoesAntesIA] = useState(null);
  // Muda quando a I.A. troca o texto (ou o usuário desfaz): remonta o textarea e acende o contorno de chegada
  const [versaoIA, setVersaoIA] = useState(0);
  const formRef = useRef(null);
  const submittingRef = useRef(false);
  const formStartTime = useRef(Date.now());
  const { showToast } = useToast();

  // Detectar alterações não salvas (H3)
  const hasUnsavedData = !!(formData.observacoes || formData.comportamento || formData.sintomas);
  useUnsavedChanges(hasUnsavedData);

  // Ctrl+S para salvar (H7)
  useKeyboard([
    { key: 's', ctrl: true, action: () => formRef.current?.requestSubmit() },
  ]);

  // Carregar plano do psicólogo
  useEffect(() => {
    lerPerfilPsicologo()
      .then(p => {
        setPlanoPsicologo(p?.plano || 'basico');
        if (p) setProfissional({ nome: p.nome, crp: p.crp, clinica: p.clinica, cidade: p.cidade });
      })
      .catch(err => {
        logger.error(err);
        showToast({ type: 'error', message: 'Não foi possível carregar seu plano. Recarregue a página para tentar novamente.' });
      });
  }, [showToast]);

  // If the Agenda navigates here with a pre-selected patient, apply it
  useEffect(() => {
    if (preSelectedPatient) {
      setFormData(prev => ({ 
        ...prev, 
        id_paciente: preSelectedPatient.id,
        valor: preSelectedPatient.valor_sessao || ''
      }));
      setPatientSearch(preSelectedPatient.nome);
    }
  }, [preSelectedPatient]);

  const filteredPatientsList = patients.filter(p =>
    p.nome && p.nome.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleSelectPatient = (p) => {
    setFormData(prev => ({ 
      ...prev, 
      id_paciente: p.id,
      valor: p.valor_sessao || ''
    }));
    setPatientSearch(p.nome);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Ctrl+S (requestSubmit) ignora o botão desabilitado: evita envio duplicado
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatusMessage({ type: '', text: '' });
    setIsSubmitting(true);

    try {
      if (!formData.id_paciente) {
        throw new Error('Por favor, selecione um paciente.');
      }
      if (!formData.data_sessao) {
        throw new Error('A data da sessão é obrigatória.');
      }
      if (!formData.observacoes || formData.observacoes.trim().length < 5) {
        throw new Error('As observações gerais devem ser preenchidas detalhadamente.');
      }
      if (formData.pago && !formData.forma_pagamento) {
        throw new Error('Selecione a forma de pagamento.');
      }

      await criarSessao(formData);
      
      const durationMs = Date.now() - formStartTime.current;
      const obsLength = (formData.observacoes || '').trim().length;
      const comportLength = (formData.comportamento || '').trim().length;
      const sintomasLength = (formData.sintomas || '').trim().length;
      trackAction('SESSION_EVOLVED', {
        patientId: formData.id_paciente,
        durationMs,
        durationFormatted: `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`,
        status: formData.status,
        obsLength,
        comportLength,
        sintomasLength,
        totalChars: obsLength + comportLength + sintomasLength,
        pago: formData.pago,
      });

      showToast({ type: 'success', message: 'Evolução salva com sucesso!' });
      setStatusMessage({ type: 'success', text: 'Evolução salva com sucesso no banco de dados!' });
      
      // Limpa os dados de texto, mantém paciente e data
      setFormData(prev => ({ 
        ...prev, 
        humor: 5,
        observacoes: '',
        comportamento: '',
        sintomas: '',
        pago: false,
        forma_pagamento: ''
      }));
      setObservacoesAntesIA(null);

      formStartTime.current = Date.now(); // Reset timer for next session
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);

    } catch (err) {
      logger.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao registrar a evolução.' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    if (!formData.id_paciente || !formData.data_sessao || !formData.observacoes || formData.observacoes.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Preencha o paciente e as observações gerais da sessão antes de exportar.' });
      return;
    }

    try {
      const patient = patients.find(p => p.id === formData.id_paciente) || { nome: 'Paciente' };
      gerarEvolucaoSessaoPDF(patient, formData, profissional);
      trackAction('EXPORT_PDF_EVOLUTION', { patientId: formData.id_paciente, date: formData.data_sessao });
      
      setStatusMessage({ type: 'success', text: 'PDF exportado com sucesso!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      logger.error(err);
      setStatusMessage({ type: 'error', text: 'Erro ao gerar o PDF.' });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Nova Evolução</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Registre o status, comportamento e sintomas do atendimento atual.</p>
      </div>

      {/* Sem overflow-hidden: ele prenderia a barra de ações fixa e cortaria a lista de pacientes */}
      <div className="ds-card p-4 sm:p-8 lg:p-10 sm:pb-0 lg:pb-0 pb-0 relative">
        
        {statusMessage.text && (
          <div className="mb-6 sm:mb-8 p-4 rounded-lg border flex items-start gap-3 transition-all" style={{
            backgroundColor: statusMessage.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            borderColor: statusMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)',
            color: statusMessage.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)'
          }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: statusMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {statusMessage.type === 'success' 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          
          {/* Sessão 1: Cabeçalho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
            {/* Paciente - Campo com Busca */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Paciente *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); setFormData(prev => ({...prev, id_paciente: ''})); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                  placeholder="Buscar paciente..."
                  disabled={isLoadingPatients}
                  required
                  className="ds-input pl-9"
                />
                {showDropdown && filteredPatientsList.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    {filteredPatientsList.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectPatient(p)}
                        className="w-full text-left px-4 py-2.5 min-h-[44px] text-sm flex items-center gap-3 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/20"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>{p?.nome?.charAt(0)?.toUpperCase() || '?'}</span>
                        <span className="truncate">{p.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && patientSearch && filteredPatientsList.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full border rounded-xl shadow-lg px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    Nenhum paciente encontrado.
                  </div>
                )}
              </div>
              {/* Campo hidden para validação */}
              {!formData.id_paciente && patientSearch && (
                <p className="text-xs mt-1" style={{ color: 'var(--status-warning)' }}>Selecione um paciente da lista.</p>
              )}
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Data da Sessão *</label>
              <input
                type="date"
                value={formData.data_sessao}
                onChange={(e) => setFormData({ ...formData, data_sessao: e.target.value })}
                className="ds-input css-date-input"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Status do Comparecimento *</label>
              <div className="flex-1 w-full sm:w-auto animate-in slide-in-from-top-2 duration-200">
                  <Select
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={['Presente', 'Faltou', 'Remarcado', 'Cancelado']}
                    placeholder="Selecione o status"
                    size="md"
                  />
                </div>
            </div>

            {/* Valor da Sessão */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Valor da Sessão (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="ds-input"
                placeholder="0.00"
              />
            </div>

            {/* Pagamento Efetuado */}
            <div className="flex flex-col justify-end pb-1 sm:col-span-2 lg:col-span-2">
              <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <input
                  type="checkbox"
                  checked={formData.pago}
                  onChange={(e) => setFormData({ ...formData, pago: e.target.checked })}
                  className="w-5 h-5 rounded shrink-0"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Marcar como Pago</span>
              </label>

              {formData.pago && (
                <div className="mt-3 relative z-10 animate-in slide-in-from-top-2 duration-200">
                  <Select
                    value={formData.forma_pagamento}
                    onChange={(val) => setFormData({ ...formData, forma_pagamento: val })}
                    options={[
                      'Pix', 
                      'Cartão de Crédito', 
                      'Cartão de Débito', 
                      'Dinheiro', 
                      'Transferência Bancária',
                      'Convênio'
                    ]}
                    placeholder="Selecione a forma de pagamento..."
                    size="md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mood Rating */}
          <div className="p-4 sm:p-6 rounded-xl border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
            <Tooltip text="A nota de humor reflete a percepção clínica do terapeuta sobre o estado emocional do paciente durante a sessão. 1 = aparentemente em sofrimento intenso, 10 = bem-estar evidente." showIcon>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                Como você percebeu o paciente hoje?
                <span className="block sm:inline sm:ml-2 font-normal text-xs mt-0.5 sm:mt-0" style={{ color: 'var(--text-secondary)' }}>(Nota de Humor: 1 = Muito ruim · 10 = Excelente)</span>
              </label>
            </Tooltip>
            {/* Em sm+ o marcador desliza pelas 10 colunas; no celular 5x2 garante alvos >= 44px */}
            <div role="group" aria-label="Nota de humor de 1 a 10" className="relative grid grid-cols-5 sm:grid-cols-10 gap-1 sm:gap-0 rounded-xl border p-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <span
                aria-hidden="true"
                className="hidden sm:block absolute top-1 bottom-1 left-1 rounded-lg transition-[transform,background-color] duration-300 ease-out-expo"
                style={{
                  width: 'calc((100% - 0.5rem) / 10)',
                  transform: `translateX(${(formData.humor - 1) * 100}%)`,
                  backgroundColor: corHumor(formData.humor),
                }}
              />
              {Array.from({ length: 10 }).map((_, i) => {
                const val = i + 1;
                const isSelected = formData.humor === val;
                return (
                  <button key={val} type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFormData(prev => ({ ...prev, humor: val }))}
                    className={`relative h-11 rounded-lg text-sm font-bold tabular transition-colors duration-200 ${isSelected ? 'sm:!bg-transparent' : ''}`}
                    style={{
                      color: isSelected ? '#FFFFFF' : corHumor(val),
                      backgroundColor: isSelected ? corHumor(val) : undefined,
                    }}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-baseline gap-2 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="truncate">Sofrimento intenso</span>
              <span className="text-xs font-semibold shrink-0" style={{ color: corHumor(formData.humor) }} aria-live="polite">
                {formData.humor} · {rotuloHumor(formData.humor)}
              </span>
              <span className="truncate text-right">Bem-estar evidente</span>
            </div>
          </div>

          {/* Sessão 2: Observações */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <Tooltip text="Descreva os temas principais abordados, intervenções realizadas e percepções clínicas relevantes. Quanto mais detalhado, melhor para acompanhamento futuro." showIcon>
                <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Observações gerais *</label>
              </Tooltip>
              <button
                type="button"
                disabled={isGeneratingIA || !formData.observacoes}
                onClick={async () => {
                  // Plano desconhecido (null): não exibe upgrade; o servidor valida o plano
                  // Mesmos planos que a Cloud Function aceita (functions/index.js)
                  if (planoPsicologo !== null && !['profissional', 'clinica', 'pro', 'premium'].includes(planoPsicologo)) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setIsGeneratingIA(true);
                  const textoOriginal = formData.observacoes;
                  try {
                    const textoCompleto = [
                      formData.observacoes && `Observações: ${formData.observacoes}`,
                      formData.comportamento && `Comportamento: ${formData.comportamento}`,
                      formData.sintomas && `Sintomas: ${formData.sintomas}`,
                    ].filter(Boolean).join('\n\n');
                    const { resumo } = await gerarResumoIA('sessao', textoCompleto);
                    setFormData(prev => ({ ...prev, observacoes: resumo }));
                    setObservacoesAntesIA(textoOriginal);
                    setVersaoIA(v => v + 1);
                    setStatusMessage({ type: 'success', text: 'Resumo gerado com I.A. com sucesso!' });
                    setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
                  } catch (err) {
                    logger.error(err);
                    const msg = err?.message?.includes('permission-denied') || err?.message?.includes('PRO')
                      ? 'Recurso exclusivo do plano PRO.'
                      : 'Erro ao gerar resumo. Tente novamente.';
                    setStatusMessage({ type: 'error', text: msg });
                  } finally {
                    setIsGeneratingIA(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-lg transition-all disabled:opacity-40 text-white"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)' }}
              >
                {isGeneratingIA ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Resumir com I.A.
                  </>
                )}
              </button>
            </div>
            {isGeneratingIA && (
              <div className="mb-3 p-3 rounded-xl border flex items-start gap-3 animate-pulse" style={{ backgroundColor: 'var(--status-info-bg)', borderColor: 'var(--status-info)' }}>
                <svg className="w-5 h-5 animate-spin shrink-0" style={{ color: 'var(--status-info)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'var(--status-info-text)' }}>A I.A. está analisando suas anotações e gerando um resumo clínico...</span>
              </div>
            )}
            <textarea
              key={versaoIA}
              value={formData.observacoes}
              onChange={(e) => { setFormData({ ...formData, observacoes: e.target.value }); setObservacoesAntesIA(null); }}
              disabled={isGeneratingIA}
              className={`ds-input resize-y min-h-[150px] custom-scrollbar leading-relaxed ${versaoIA > 0 ? 'ds-arrive' : ''}`}
              placeholder="Resumo da sessão e os principais temas abordados..."
              required
            />
            <div className="mt-2 flex items-center justify-between gap-3 min-h-[20px]">
              {observacoesAntesIA !== null ? (
                <button
                  type="button"
                  onClick={() => { setFormData(prev => ({ ...prev, observacoes: observacoesAntesIA })); setObservacoesAntesIA(null); setVersaoIA(v => v + 1); }}
                  className="text-xs font-semibold underline underline-offset-2 animate-in fade-in"
                  style={{ color: 'var(--accent)' }}
                >
                  Desfazer resumo
                </button>
              ) : <span />}
              <span className="text-[11px] tabular" style={{ color: 'var(--text-muted)' }}>
                {contarPalavras(formData.observacoes)} palavras
              </span>
            </div>
          </div>

          {/* Sessão 3: Comportamento */}
          <div>
            <Tooltip text="Registre postura corporal, expressão facial, tom de voz, contato visual e reações do paciente durante a sessão." showIcon>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Comportamento apresentado</label>
            </Tooltip>
            <textarea
              value={formData.comportamento}
              onChange={(e) => setFormData({ ...formData, comportamento: e.target.value })}
              className="ds-input resize-y min-h-[120px] custom-scrollbar"
              placeholder="Descreva a postura, afeto, humor e reações do paciente durante o atendimento..."
            />
          </div>

          {/* Sessão 4: Sintomas */}
          <div>
            <Tooltip text="Liste sintomas relatados pelo paciente: ansiedade, insônia, irritabilidade, alterações de apetite, somatizações, etc." showIcon>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Sintomas relatados</label>
            </Tooltip>
            <textarea
              value={formData.sintomas}
              onChange={(e) => setFormData({ ...formData, sintomas: e.target.value })}
              className="ds-input resize-y min-h-[120px] custom-scrollbar"
              placeholder="Ansiedade, insônia, sudorese, etc..."
            />
          </div>

          {/* Botões */}
          {/* Fixa no rodapé: salvar continua ao alcance enquanto se escreve uma evolução longa */}
          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-8 lg:-mx-10 px-4 sm:px-8 lg:px-10 py-3.5 sm:py-4 rounded-b-ds flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 safe-bottom" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <p className="text-xs max-w-sm hidden md:block" style={{ color: 'var(--text-secondary)' }}>
              A evolução entra no prontuário do paciente e segue a guarda mínima de 5 anos (CFP 01/2009). <span className="whitespace-nowrap">Ctrl+S salva.</span>
            </p>
            
            <div className="flex w-full sm:w-auto items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={!formData.id_paciente || !formData.observacoes}
                className="ds-btn ds-btn-secondary flex-1 sm:flex-none py-3 min-h-[44px]"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Exportar PDF</span>
              </button>

              <button 
                type="submit" 
                disabled={isSubmitting || patients.length === 0}
                className="ds-btn ds-btn-primary flex-1 sm:flex-none py-3 min-h-[44px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gravando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Salvar Evolução
                  </span>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
      <UpgradeProModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}
