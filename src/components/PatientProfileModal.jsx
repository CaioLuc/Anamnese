import logger from '../utils/logger';
import { useState, useEffect, lazy, Suspense } from 'react';
import { lerAnamnesesDoPaciente, lerSessoesDoPaciente, deletarSessao, criarAnamnese, atualizarAnamnese, deletarAnamnese, atualizarSessao, lerQuestionario, lerPerfilPsicologo } from '../services/patientService';
const AnamneseForm = lazy(() => import('./AnamneseForm'));
const AnamneseAdolescenteForm = lazy(() => import('./AnamneseAdolescenteForm'));
import { gerarAnamnesePDF, gerarEvolucaoSessaoPDF, gerarProntuarioCompletoPDF, calcularIdade } from '../services/pdfUtils';
import { FileDown, Pencil, X, IdCard, Cake, Phone, Wallet } from 'lucide-react';
import DocumentosTab from './prontuario/DocumentosTab';
import ConfirmDialog from './ConfirmDialog';
import MoodChart from './MoodChart';
import SelecionarTemplateModal from './SelecionarTemplateModal';
import QuestionarioFiller from './QuestionarioFiller';
import ErrorBoundary from './ErrorBoundary';
import { formatCPF } from '../utils/formatUtils';
import { useEscapeKey } from '../hooks/useKeyboard';
import { useToast } from '../contexts/ToastContext';
import { trackAction } from '../services/logService';

function DynamicAnamneseEditor({ anamnese, onSaved, onCancel }) {
  const [respostas, setRespostas] = useState(anamnese.respostas || {});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await atualizarAnamnese(anamnese.id, anamnese.id_paciente, { respostas });
      onSaved();
    } catch (e) {
      setError('Erro ao salvar edições. Tente novamente.');
      logger.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-3.5 sm:p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
       <div className="flex justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
         <div className="min-w-0">
           <h3 className="text-lg sm:text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Editando Anamnese</h3>
           <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Atualize as informações desejadas e salve.</p>
         </div>
         <button onClick={onCancel} aria-label="Cancelar edição" className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors shrink-0" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
       </div>
       {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>{error}</div>}
       <div className="ds-card rounded-2xl p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar">
         {anamnese.template_snapshot ? (
            <QuestionarioFiller template={anamnese.template_snapshot} respostas={respostas} onChange={setRespostas} readOnly={false} />
         ) : (
            <div className="text-center p-6 sm:p-8" style={{ color: 'var(--status-warning)' }}>
               O template desta anamnese não pôde ser recuperado, por isso a edição foi desabilitada para evitar corrupção de dados.
            </div>
         )}
       </div>
       <div className="mt-6 sm:mt-8 pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
         <button onClick={onCancel} className="ds-btn ds-btn-ghost w-full sm:w-auto px-5 py-2.5">Cancelar</button>
         <button disabled={isSaving || !anamnese.template_snapshot} onClick={handleSave} className="ds-btn ds-btn-primary w-full sm:w-auto px-6 py-2.5 font-semibold disabled:opacity-50">
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
         </button>
      </div>
    </div>
  );
}

export default function PatientProfileModal({ isOpen, onClose, patient, initialTab = 'evolucoes', onEditRequest }) {
  const [activeTab, setActiveTab] = useState('evolucoes');
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Modelos fixos (adulto/adolescente) só abrem em modo edição; novas anamneses usam questionários
  const [selectedFormType] = useState(null);
  const [confirmDeleteAnamnese, setConfirmDeleteAnamnese] = useState({ isOpen: false, anamnese: null });
  const [editingSessao, setEditingSessao] = useState(null); // { id, observacoes, comportamento, sintomas }
  const [isSavingSessao, setIsSavingSessao] = useState(false);
  const [confirmSessao, setConfirmSessao] = useState({ isOpen: false, sessao: null });
  // Novo: sistema de questionários dinâmicos
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // template escolhido
  const [templateRespostas, setTemplateRespostas] = useState({});
  const [isSavingAnamnese, setIsSavingAnamnese] = useState(false);
  const [anamneseSaveError, setAnamneseSaveError] = useState('');
  const [isEditingAnamnese, setIsEditingAnamnese] = useState(false);
  const { showToast } = useToast();
  const [profissional, setProfissional] = useState(null);

  // Fechar com Escape (H7)
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && patient) {
      loadHistory();
      setActiveTab(initialTab);
      trackAction('VIEW_PATIENT_PROFILE', { patientId: patient.id, tab: initialTab || 'evolucoes' });
    }
    // Depende só do id: re-render do pai não deve recarregar nem duplicar auditoria
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patient?.id, initialTab]);

  // Dados do profissional para cabeçalho/assinatura dos PDFs e documentos CFP
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    lerPerfilPsicologo()
      .then((perfil) => { if (active && perfil) setProfissional({ nome: perfil.nome, crp: perfil.crp, cpf: perfil.cpf, clinica: perfil.clinica, cidade: perfil.cidade }); })
      .catch((err) => {
        if (!active) return;
        logger.warn('Perfil do profissional indisponível para PDFs:', err);
        showToast({ type: 'warning', message: 'Não foi possível carregar seu perfil: PDFs sairão sem nome e CRP.' });
      });
    return () => { active = false; };
  }, [isOpen, showToast]);

  const ABAS = [
    { id: 'evolucoes', label: 'Sessões' },
    { id: 'anamnese', label: 'Anamnese' },
    { id: 'documentos', label: 'Documentos CFP' },
  ];

  // Abrir a ficha ou os documentos também é acesso ao prontuário (LGPD art. 37)
  const trocarAba = (id) => {
    if (id !== activeTab && id !== 'evolucoes') trackAction('VIEW_PATIENT_TAB', { patientId: patient.id, tab: id });
    setActiveTab(id);
  };

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [anamnesesData, sessoesData] = await Promise.all([
        lerAnamnesesDoPaciente(patient.id),
        lerSessoesDoPaciente(patient.id)
      ]);
      
      // Buscar template caso falte no snapshot (retro-compatibilidade com as primeiras anamneses personalizadas criadas)
      for (const a of anamnesesData) {
         if (a.tipo === 'dinamico' && !a.template_snapshot && a.questionario_id) {
             try {
                const t = await lerQuestionario(a.questionario_id);
                if (t) a.template_snapshot = t;
             } catch(e) { logger.error('Aviso: nao pode carregar template associado', e); }
         }
      }

      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
    } catch (error) {
      logger.error(error);
      showToast({ type: 'error', message: 'Erro ao carregar prontuário. Verifique sua conexão.', action: { label: 'Recarregar', onClick: loadHistory } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluirSessao = (sessao) => {
    setConfirmSessao({ isOpen: true, sessao });
  };

  const confirmExcluirSessao = async () => {
    const sessao = confirmSessao.sessao;
    setConfirmSessao({ isOpen: false, sessao: null });
    try {
      await deletarSessao(sessao.id, patient.id);
      loadHistory();
    } catch (err) {
      logger.error('Erro ao deletar sessão:', err);
      showToast({ type: 'error', message: 'Erro ao apagar a sessão. Tente novamente.' });
    }
  };

  const confirmExcluirAnamnese = async () => {
    const ana = confirmDeleteAnamnese.anamnese;
    setConfirmDeleteAnamnese({ isOpen: false, anamnese: null });
    if (!ana) return;
    try {
      await deletarAnamnese(ana.id, patient.id);
      loadHistory();
    } catch (err) {
      logger.error('Erro ao deletar anamnese:', err);
      showToast({ type: 'error', message: 'Erro ao excluir anamnese. Tente novamente.' });
    }
  };

  const handleSalvarEdicaoSessao = async () => {
    if (!editingSessao) return;
    setIsSavingSessao(true);
    try {
      // Firestore rejeita undefined: campos ausentes viram ''
      await atualizarSessao(editingSessao.id, patient.id, {
        observacoes: editingSessao.observacoes ?? '',
        comportamento: editingSessao.comportamento ?? '',
        sintomas: editingSessao.sintomas ?? '',
        evolucao_notas: editingSessao.evolucao_notas ?? '',
      });
      setEditingSessao(null);
      loadHistory();
      trackAction('EDIT_SESSION_INLINE', { patientId: patient.id, sessionId: editingSessao.id });
    } catch (err) {
      logger.error('Erro ao editar sessão:', err);
      showToast({ type: 'error', message: 'Erro ao salvar edição da sessão. Tente novamente.' });
    } finally {
      setIsSavingSessao(false);
    }
  };

  if (!isOpen || !patient) return null;

  const currentAnamnese = anamneses[0] || null;
  const idade = patient.data_nascimento ? calcularIdade(patient.data_nascimento) : null;

  // ====== PDFs ======
  const exportarPdf = (gerar, acao, extra = {}) => {
    try {
      gerar();
      trackAction(acao, { patientId: patient.id, ...extra });
    } catch (err) {
      logger.error(err);
      showToast({ type: 'error', message: 'Não foi possível gerar o PDF. Tente novamente.' });
    }
  };

  const gerarPdfAnamnese = () => {
    if (!currentAnamnese) return;
    exportarPdf(() => gerarAnamnesePDF(patient, currentAnamnese, profissional), 'EXPORT_PDF_ANAMNESIS', { anamneseType: currentAnamnese.tipo || 'adulto' });
  };

  const gerarPdfSessao = (sessao) =>
    exportarPdf(() => gerarEvolucaoSessaoPDF(patient, sessao, profissional), 'EXPORT_PDF_SESSION', { sessionId: sessao.id });

  const handleExportCompleteRecord = () =>
    exportarPdf(() => gerarProntuarioCompletoPDF(patient, anamneses, sessoes, profissional), 'EXPORT_PDF_COMPLETE_RECORD', { totalSessoes: sessoes.length });

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--overlay)' }} onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Prontuário de ${patient.nome}`}
        className="relative w-full max-w-6xl h-[100dvh] sm:h-[90dvh] ds-card flex flex-col overflow-hidden animate-in !rounded-none sm:!rounded-[var(--radius)] safe-top safe-bottom"
      >
        {/* Cabeçalho do prontuário */}
        <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-5 pb-3.5 sm:pb-4 flex items-start justify-between gap-2.5 sm:gap-3 shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-heading font-semibold shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }} aria-hidden="true">
              {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{patient.nome}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {patient.cpf && <span className="inline-flex items-center gap-1"><IdCard size={13} aria-hidden="true" />{formatCPF(patient.cpf)}</span>}
                {idade && <span className="inline-flex items-center gap-1"><Cake size={13} aria-hidden="true" />{idade}</span>}
                {patient.telefone && <span className="inline-flex items-center gap-1"><Phone size={13} aria-hidden="true" />{patient.telefone}</span>}
                {patient.valor_sessao && (
                  <span className="inline-flex items-center gap-1 tabular"><Wallet size={13} aria-hidden="true" />R$ {parseFloat(patient.valor_sessao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button onClick={handleExportCompleteRecord} disabled={isLoading} className="ds-btn ds-btn-secondary hidden md:inline-flex" title="Baixar o prontuário completo em PDF">
              <FileDown size={16} /> Prontuário em PDF
            </button>
            <button onClick={handleExportCompleteRecord} disabled={isLoading} className="ds-btn ds-btn-ghost !px-2 min-w-[40px] min-h-[40px] md:hidden" aria-label="Baixar o prontuário completo em PDF">
              <FileDown size={19} />
            </button>
            <button onClick={() => onEditRequest && onEditRequest(patient)} className="ds-btn ds-btn-ghost !px-2 min-w-[40px] min-h-[40px]" aria-label="Editar dados do paciente" title="Editar dados do paciente">
              <Pencil size={18} />
            </button>
            <button onClick={onClose} className="ds-btn ds-btn-ghost !px-2 min-w-[40px] min-h-[40px]" aria-label="Fechar prontuário" title="Fechar (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 px-3 sm:px-6 shrink-0 overflow-x-auto no-scrollbar scroll-smooth" role="tablist" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              role="tab"
              aria-selected={activeTab === aba.id}
              onClick={() => trocarAba(aba.id)}
              className="px-3 sm:px-4 min-h-[46px] text-sm font-semibold border-b-2 whitespace-nowrap transition-colors"
              style={{
                borderColor: activeTab === aba.id ? 'var(--accent)' : 'transparent',
                color: activeTab === aba.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Lendo prontuário seguro...</span>
            </div>
          ) : (
            <>
              {activeTab === 'evolucoes' && (
                <div className="space-y-5 sm:space-y-6">
                  {sessoes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--border)' }}>
                      <svg className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nenhuma sessão registrada.</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Este paciente ainda não teve evoluções salvas.</p>
                    </div>
                  ) : (
                    <div className="space-y-5 sm:space-y-6">
                      {/* Mood Chart */}
                      <div className="ds-card p-3.5 sm:p-5">
                        <MoodChart sessoes={sessoes} />
                      </div>
                      {/* Timeline */}
                      <div className="relative ml-2 sm:ml-4 space-y-6 sm:space-y-8 pb-4" style={{ borderLeft: '1px solid var(--border)' }}>
                      {sessoes.map((sessao) => (
                        <div key={sessao.id} className="relative pl-4 sm:pl-8">
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 0 4px var(--bg-card)' }}></div>
                          
                          <div className="ds-card p-3.5 sm:p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2.5 pb-3.5 sm:pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  {sessao.data_sessao ? sessao.data_sessao.split('-').reverse().join('/') : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR')}
                                </h4>
                                <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-muted)' }}>ID Sessão: {sessao.id.substring(0,8)}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => gerarPdfSessao(sessao)} aria-label="Exportar sessão para PDF" className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)' }} title="Exportar Sessão para PDF">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </button>
                                    <button onClick={() => setEditingSessao({ ...sessao })} aria-label="Editar evolução" className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid var(--status-warning)' }} title="Editar Evolução">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleExcluirSessao(sessao)} aria-label="Apagar evolução" className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '1px solid var(--status-danger)' }} title="Apagar Evolução">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                  <span className="ds-badge" style={{
                                    backgroundColor: sessao.status === 'Presente' ? 'var(--status-success-bg)' : sessao.status === 'Faltou' ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
                                    color: sessao.status === 'Presente' ? 'var(--status-success-text)' : sessao.status === 'Faltou' ? 'var(--status-danger-text)' : 'var(--status-warning-text)',
                                    border: `1px solid ${sessao.status === 'Presente' ? 'var(--status-success)' : sessao.status === 'Faltou' ? 'var(--status-danger)' : 'var(--status-warning)'}`
                                  }}>
                                    {sessao.status || 'Status N/D'}
                                  </span>
                              </div>
                            </div>

                            {editingSessao?.id === sessao.id ? (
                              <div className="space-y-4 mt-3">
                                <div>
                                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--accent)' }}>Observações / Notas</label>
                                  <textarea
                                    rows={5}
                                    className="ds-input resize-y text-sm"
                                    value={editingSessao.observacoes || editingSessao.evolucao_notas || ''}
                                    onChange={(e) => setEditingSessao(prev => ({ ...prev, observacoes: e.target.value, evolucao_notas: e.target.value }))}
                                    placeholder="Anotações, palavras-chave, observações clínicas..."
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--accent)' }}>Comportamento</label>
                                    <textarea
                                      rows={3}
                                      className="ds-input resize-y text-sm"
                                      value={editingSessao.comportamento || ''}
                                      onChange={(e) => setEditingSessao(prev => ({ ...prev, comportamento: e.target.value }))}
                                      placeholder="Comportamento observado..."
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--accent)' }}>Sintomas Relatados</label>
                                    <textarea
                                      rows={3}
                                      className="ds-input resize-y text-sm"
                                      value={editingSessao.sintomas || ''}
                                      onChange={(e) => setEditingSessao(prev => ({ ...prev, sintomas: e.target.value }))}
                                      placeholder="Sintomas relatados pelo paciente..."
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                  <button onClick={() => setEditingSessao(null)} className="ds-btn ds-btn-ghost w-full sm:w-auto px-4 py-2 text-sm">Cancelar</button>
                                  <button onClick={handleSalvarEdicaoSessao} disabled={isSavingSessao} className="ds-btn ds-btn-primary w-full sm:w-auto px-5 py-2 text-sm font-semibold disabled:opacity-50">
                                    {isSavingSessao ? 'Salvando...' : 'Salvar Edição'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                            <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {sessao.observacoes && (
                                <div>
                                  <h5 className="font-semibold mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Observações / Notas</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.observacoes}</p>
                                </div>
                              )}
                              {sessao.comportamento && (
                                <div>
                                  <h5 className="font-semibold mb-1 text-xs uppercase tracking-wider mt-4" style={{ color: 'var(--accent)' }}>Comportamento</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.comportamento}</p>
                                </div>
                              )}
                              {sessao.sintomas && (
                                <div>
                                  <h5 className="font-semibold mb-1 text-xs uppercase tracking-wider mt-4" style={{ color: 'var(--accent)' }}>Sintomas Relatados</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.sintomas}</p>
                                </div>
                              )}
                              {sessao.evolucao_notas && !sessao.observacoes && (
                                <div>
                                  <h5 className="font-semibold mb-1 text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Anotação Legada</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.evolucao_notas}</p>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'anamnese' && (
                <ErrorBoundary>
                  <div className="ds-card rounded-2xl flex items-start justify-center">
                     {anamneses.length > 0 && !isEditingAnamnese ? (
                         <div className="w-full text-left p-4 sm:p-8 overflow-y-auto custom-scrollbar">
                           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div className="min-w-0">
                                 <h3 className="text-lg sm:text-xl font-heading font-bold flex flex-wrap items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                     <span>Anamnese Registrada</span>
                                     <span className="ds-badge text-[10px] uppercase font-bold">
                                         {currentAnamnese.tipo === 'adolescente' ? 'Infantil / Adolescente' : (currentAnamnese.tipo === 'dinamico' ? (currentAnamnese.questionario_nome || 'Personalizada') : 'Adulto')}
                                     </span>
                                 </h3>
                                 <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Criada em: {new Date(currentAnamnese.createdAt?.toDate() || Date.now()).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <button onClick={() => setIsEditingAnamnese(true)} className="ds-btn ds-btn-secondary flex-1 sm:flex-none flex items-center gap-2 px-3 py-2 text-xs sm:text-sm" title="Editar">
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    <span>Editar</span>
                                 </button>
                                 <button onClick={gerarPdfAnamnese} className="ds-btn flex-1 sm:flex-none flex items-center gap-2 px-3 py-2 text-xs sm:text-sm" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)' }} title="Exportar">
                                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span>Exportar</span>
                                 </button>
                                 <button onClick={() => setConfirmDeleteAnamnese({ isOpen: true, anamnese: currentAnamnese })} aria-label="Excluir anamnese" className="ds-btn ds-btn-danger flex items-center gap-2 px-3 py-2 text-sm shrink-0" title="Excluir">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                              </div>
                           </div>
  
                           {/* Exibição da Anamnese Estruturada ou Dinâmica */}
                           <div className="space-y-5 sm:space-y-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                             {anamneses[0].tipo === 'dinamico' ? (
                                 <div className="ds-card p-4 sm:p-6">
                                    {anamneses[0].template_snapshot ? (
                                        <QuestionarioFiller 
                                            template={anamneses[0].template_snapshot} 
                                            respostas={anamneses[0].respostas || {}} 
                                            readOnly={true} 
                                        />
                                    ) : (
                                        <div className="space-y-4">
                                            {Object.entries(anamneses[0].respostas || {}).map(([key, val]) => (
                                                <div key={key} className="flex flex-col gap-1">
                                                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Campo: {key}</span>
                                                    <span className="text-sm px-3 py-2 rounded-lg" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)' }}>{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                                                </div>
                                            ))}
                                            <p className="text-xs mt-4" style={{ color: 'var(--status-warning)' }}>* O template original não foi salvo e não pôde ser recuperado.</p>
                                        </div>
                                    )}
                                 </div>
                             ) : (
                               <>
                                 {/* Compartilhado: Seção 0 e 1 */}
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="ds-card p-4 rounded-xl">
                                      <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Psicólogo Prévio</span>
                                      <span className="font-semibold">{anamneses[0].psicologo_previo ? 'Sim' : 'Não'}</span>
                                    </div>
                                    <div className="ds-card p-4 rounded-xl">
                                      <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Psiquiatra Prévio</span>
                                      <span className="font-semibold">{anamneses[0].psiquiatra_previo ? 'Sim' : 'Não'}</span>
                                    </div>
                                 </div>
  
                                 <div className="ds-card p-4 sm:p-5 rounded-xl space-y-3">
                                    <h4 className="text-brand-400 font-semibold mb-2">Estrutura Familiar</h4>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Pai:</span> {anamneses[0].nome_pai} ({anamneses[0].idade_pai} anos - {anamneses[0].profissao_pai})</p>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Mãe:</span> {anamneses[0].nome_mae} ({anamneses[0].idade_mae} anos - {anamneses[0].profissao_mae})</p>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Irmãos:</span> {anamneses[0].qtd_irmaos} ({anamneses[0].irmaos_masculino}H / {anamneses[0].irmaos_feminino}M)</p>
                                    {anamneses[0].observacoes_familiares && <p className="mt-3 italic break-words" style={{ color: 'var(--text-muted)' }}>"{anamneses[0].observacoes_familiares}"</p>}
                                 </div>
  
                                 {/* Especifico: Desenvolvimento (Adolescente) */}
                                 {anamneses[0].tipo === 'adolescente' && (
                                     <div className="bg-brand-500/5 border border-brand-500/20 p-4 sm:p-5 rounded-xl space-y-4">
                                        <h4 className="text-brand-400 font-semibold mb-2">Desenvolvimento Infanto-Juvenil e Escola</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                                            <div><span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Gestação Planejada:</span><span className="font-medium">{anamneses[0].gestacao_planejada ? 'Sim' : 'Não'}</span></div>
                                            <div><span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Tipo de Parto:</span><span className="font-medium">{anamneses[0].tipo_parto}</span></div>
                                            <div><span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Amamentou:</span><span className="font-medium">{anamneses[0].mamou ? 'Sim' : 'Não'}</span></div>
                                            <div><span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Tempo/Desmame:</span><span className="font-medium">{anamneses[0].tempo_amamentacao || '-'}</span></div>
                                            <div className="md:col-span-2 mt-2"><span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Notas Gestação/Nascimento:</span><span className="text-sm">{anamneses[0].gestacao_notas} {anamneses[0].testes_notas} {anamneses[0].internacao_notas}</span></div>
                                        </div>
  
                                        <div className="space-y-2 text-sm">
                                            <p className="break-words"><strong style={{ color: 'var(--text-secondary)' }}>Desenvolvimento Motor:</strong> {anamneses[0].desenvolvimento_motor}</p>
                                            <p className="break-words"><strong style={{ color: 'var(--text-secondary)' }}>Fala / Linguagem:</strong> {anamneses[0].atraso_fala}</p>
                                            <p className="break-words"><strong style={{ color: 'var(--text-secondary)' }}>Interação/Brincadeiras:</strong> {anamneses[0].interacao_brincadeiras}</p>
                                        </div>
  
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Dificuldade Escolar:</span>
                                                <span className="font-medium">{anamneses[0].dificuldade_escolar ? 'Sim' : 'Não'} - {anamneses[0].dificuldade_escolar_notas}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)' }} className="text-xs block">Seletividade Alimentar:</span>
                                                <span className="font-medium">{anamneses[0].seletividade_alimentar ? 'Sim' : 'Não'} - {anamneses[0].seletividade_notas}</span>
                                            </div>
                                        </div>
                                     </div>
                                 )}
  
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div className="ds-card p-4 sm:p-5 rounded-xl">
                                      <h4 className="text-brand-400 font-semibold mb-2">Motivo da Consulta e Dinâmicas</h4>
                                      <p className="whitespace-pre-wrap break-words"><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs mt-2">Motivo:</strong>{anamneses[0].motivo_consulta}</p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm break-words" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs">Histórico:</strong>{anamneses[0].historico_queixa}</p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm break-words" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs">Dinâmica Familiar:</strong>{anamneses[0].dinamica_familiar}</p>
                                   </div>
                                   <div className="ds-card p-4 sm:p-5 rounded-xl">
                                      <h4 className="text-red-400 font-semibold mb-2">Quadro Clínico</h4>
                                      <p className="whitespace-pre-wrap break-words"><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs mt-2">Sintomas Atuais:</strong>{anamneses[0].sintomas_apresentados}</p>
                                      <p className="whitespace-pre-wrap break-words"><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs mt-2">Agravantes:</strong>{anamneses[0].fatores_agravantes}</p>
                                      {anamneses[0].tentativa_suicidio && (
                                         <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <strong className="text-red-400 block text-xs mb-1">Risco Relatado:</strong>
                                            <p className="text-red-300 text-sm italic break-words">{anamneses[0].tentativa_suicidio}</p>
                                         </div>
                                      )}
                                   </div>
                                 </div>
  
                                 <div className="ds-card p-4 sm:p-5 rounded-xl">
                                    <h4 className="text-emerald-400 font-semibold mb-2">Parecer e Observações Profissionais</h4>
                                    <p className="whitespace-pre-wrap break-words">{anamneses[0].observacoes_gerais}</p>
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                      ) : (!selectedFormType && !selectedTemplate && !isEditingAnamnese) ? (
                          <div className="w-full h-full flex items-center justify-center p-5 sm:p-6">
                              <div className="max-w-md w-full text-center">
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </div>
                                  <h3 className="text-lg sm:text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhuma anamnese registrada</h3>
                                  <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Inicie a ficha deste paciente criando e preenchendo uma anamnese.</p>
                                  <button
                                    onClick={() => setShowTemplateSelector(true)}
                                    className="ds-btn ds-btn-primary inline-flex items-center gap-2 px-6 py-3 font-semibold shadow-lg"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Nova Anamnese
                                  </button>
                              </div>
  
                              <SelecionarTemplateModal
                                isOpen={showTemplateSelector}
                                onClose={() => setShowTemplateSelector(false)}
                                onSelecionar={(template) => {
                                  setSelectedTemplate(template);
                                  setTemplateRespostas({});
                                  setShowTemplateSelector(false);
                                }}
                              />
                          </div>
  
                      ) : selectedTemplate ? (
                          <div className="w-full p-4 sm:p-6 h-full overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <div className="flex items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div className="min-w-0">
                                <h3 className="text-lg sm:text-xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span>{selectedTemplate.icone}</span> <span className="truncate">{selectedTemplate.nome}</span>
                                </h3>
                                {selectedTemplate.descricao && (
                                  <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedTemplate.descricao}</p>
                                )}
                              </div>
                              <button
                                onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                                aria-label="Fechar modelo"
                                className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors shrink-0" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
  
                            {anamneseSaveError && (
                              <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>
                                {anamneseSaveError}
                              </div>
                            )}
  
                            <div className="ds-card rounded-2xl p-4 sm:p-6">
                              <QuestionarioFiller
                                template={selectedTemplate}
                                respostas={templateRespostas}
                                onChange={setTemplateRespostas}
                              />
                            </div>
  
                            <div className="mt-6 sm:mt-8 pt-4 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-2.5 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                              <button
                                onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                                className="ds-btn ds-btn-ghost w-full sm:w-auto px-5 py-2.5 text-sm font-medium"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={async () => {
                                  setIsSavingAnamnese(true);
                                  setAnamneseSaveError('');
                                  try {
                                    await criarAnamnese({
                                      id_paciente: patient.id,
                                      questionario_id: selectedTemplate.id,
                                      questionario_nome: selectedTemplate.nome,
                                      tipo: 'dinamico',
                                      respostas: templateRespostas,
                                      template_snapshot: selectedTemplate,
                                    });
                                    setSelectedTemplate(null);
                                    setTemplateRespostas({});
                                    loadHistory();
                                  } catch (e) {
                                    logger.error(e);
                                    setAnamneseSaveError('Erro ao salvar. Verifique sua conexão.');
                                  } finally {
                                    setIsSavingAnamnese(false);
                                  }
                                }}
                                disabled={isSavingAnamnese}
                                className="ds-btn ds-btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50"
                              >
                                {isSavingAnamnese ? (
                                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Salvando...</>
                                ) : 'Salvar Anamnese'}
                              </button>
                            </div>
                          </div>
                      ) : (isEditingAnamnese && anamneses[0]?.tipo === 'dinamico') ? (
                          <DynamicAnamneseEditor anamnese={anamneses[0]} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} onCancel={() => setIsEditingAnamnese(false)} />
                      ) : (!isEditingAnamnese && anamneses[0]?.tipo === 'dinamico') ? (
                          <div className="space-y-4 overflow-hidden">
                            <h4 className="text-brand-500 font-bold mb-3">Respostas da Anamnese</h4>
                            {anamneses[0].template_snapshot?.campos?.map((campo, idx) => {
                              const resp = anamneses[0].respostas?.[campo.id] || anamneses[0].respostas?.[idx];
                              const valor = Array.isArray(resp) ? resp.join(', ') : (resp || 'N/D');
                              return (
                                <div key={campo.id || idx} className="ds-card p-4 rounded-xl">
                                  <strong className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>{campo.label || campo.titulo || `Pergunta ${idx+1}`}</strong>
                                  <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{ color: 'var(--text-primary)' }}>{valor}</p>
                                </div>
                              );
                            })}
                          </div>
                      ) : (selectedFormType === 'adulto' || (isEditingAnamnese && anamneses[0]?.tipo !== 'adolescente')) ? (
                        <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando formulário...</div>}>
                          <AnamneseForm patient={patient} initialData={isEditingAnamnese ? anamneses[0] : null} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} />
                        </Suspense>
                      ) : (
                        <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando formulário...</div>}>
                          <AnamneseAdolescenteForm patient={patient} initialData={isEditingAnamnese ? anamneses[0] : null} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} />
                        </Suspense>
                      )}
                   </div>
                </ErrorBoundary>
              )}
              {activeTab === 'documentos' && (
                <DocumentosTab patient={patient} sessoes={sessoes} psicologo={profissional || {}} />
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmSessao.isOpen}
        title="Apagar Evolução"
        message={`Deseja apagar permanentemente a evolução do dia ${confirmSessao.sessao?.data_sessao ? confirmSessao.sessao.data_sessao.split('-').reverse().join('/') : ''}? Esta ação não pode ser desfeita.`}
        onConfirm={confirmExcluirSessao}
        onCancel={() => setConfirmSessao({ isOpen: false, sessao: null })}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmDeleteAnamnese.isOpen}
        title="Excluir Anamnese"
        message="Deseja realmente excluir esta anamnese permanentemente? Esta ação não pode ser desfeita."
        onConfirm={confirmExcluirAnamnese}
        onCancel={() => setConfirmDeleteAnamnese({ isOpen: false, anamnese: null })}
        variant="danger"
      />
    </div>
  );
}
