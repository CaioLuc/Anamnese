import logger from '../utils/logger';
import { useState, useEffect, lazy, Suspense } from 'react';
import { lerAnamnesesDoPaciente, lerSessoesDoPaciente, deletarSessao, criarAnamnese, atualizarAnamnese, deletarAnamnese, atualizarSessao, lerQuestionario } from '../services/patientService';
const AnamneseForm = lazy(() => import('./AnamneseForm'));
const AnamneseAdolescenteForm = lazy(() => import('./AnamneseAdolescenteForm'));
import { jsPDF } from 'jspdf';
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
    <div className="w-full h-full flex flex-col p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
       <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
         <div>
           <h3 className="text-xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Editando Anamnese</h3>
           <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Atualize as informações desejadas e salve.</p>
         </div>
         <button onClick={onCancel} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
       </div>
       {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>{error}</div>}
       <div className="ds-card rounded-2xl p-6 flex-1 overflow-y-auto custom-scrollbar">
         {anamnese.template_snapshot ? (
            <QuestionarioFiller template={anamnese.template_snapshot} respostas={respostas} onChange={setRespostas} readOnly={false} />
         ) : (
            <div className="text-center p-8" style={{ color: 'var(--status-warning)' }}>
               O template desta anamnese não pôde ser recuperado, por isso a edição foi desabilitada para evitar corrupção de dados.
            </div>
         )}
       </div>
       <div className="mt-8 pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
         <button onClick={onCancel} className="ds-btn ds-btn-ghost px-5 py-2.5">Cancelar</button>
         <button disabled={isSaving || !anamnese.template_snapshot} onClick={handleSave} className="ds-btn ds-btn-primary px-6 py-2.5 font-semibold disabled:opacity-50">
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
         </button>
      </div>
    </div>
  );
}

export default function PatientProfileModal({ isOpen, onClose, patient, initialTab = 'evolucoes', onPatientUpdated, onEditRequest }) {
  const [activeTab, setActiveTab] = useState('evolucoes');
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState(null);
  const [selectedAnamneseId, setSelectedAnamneseId] = useState(null);
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

  // Fechar com Escape (H7)
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (isOpen && patient) {
      loadHistory();
      setActiveTab(initialTab);
      trackAction('VIEW_PATIENT_PROFILE', { patientId: patient.id, patientName: patient.nome, tab: initialTab || 'evolucoes' });
    }
  }, [isOpen, patient, initialTab]);

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
      await atualizarSessao(editingSessao.id, patient.id, {
        observacoes: editingSessao.observacoes,
        comportamento: editingSessao.comportamento,
        sintomas: editingSessao.sintomas,
        evolucao_notas: editingSessao.evolucao_notas,
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
  const dobStr = (patient.data_nascimento || '').includes('T') ? patient.data_nascimento : (patient.data_nascimento || '') + 'T12:00:00';
  const age = patient.data_nascimento ? new Date().getFullYear() - new Date(dobStr).getFullYear() : null;

  // ====== FUNÇÕES DE PDF ======
  const gerarPdfAnamnese = () => {
     if (anamneses.length === 0) return;
     const ana = anamneses[0];
     const { PdfBuilder, calcularIdade, formatDateBR } = require('../services/pdfUtils');

     let viewMode = ana.tipo === 'adolescente' ? 'Infanto-Juvenil' : (ana.tipo === 'dinamico' ? ana.questionario_nome || 'Personalizada' : 'Adulto');
     const pdf = new PdfBuilder(
       `Anamnese Psicologica - ${viewMode}`,
       `Paciente: ${patient.nome}`
     );

     // --- Identificação do Paciente ---
     pdf.addSection('Identificacao do Paciente');
     pdf.addInfoBlock([
       { label: 'Nome Completo', value: patient.nome },
       { label: 'Idade', value: calcularIdade(patient.data_nascimento) },
       { label: 'Data de Nascimento', value: formatDateBR(patient.data_nascimento) },
       { label: 'CPF', value: formatCPF(patient.cpf) || 'Não informado' },
       { label: 'Telefone', value: patient.telefone || 'Não informado' },
     ]);

     if (ana.tipo === 'dinamico') {
       // === Anamnese Dinâmica ===
       if (ana.template_snapshot && ana.template_snapshot.campos) {
         pdf.addSection('Respostas da Anamnese');
         ana.template_snapshot.campos.forEach((campo, idx) => {
           const resposta = ana.respostas?.[campo.id] || ana.respostas?.[idx];
           const valor = Array.isArray(resposta) ? resposta.join(', ') : (resposta || 'N/D');
           pdf.addField(campo.label || campo.titulo || `Pergunta ${idx + 1}`, String(valor));
         });
       }
     } else {
       // === Anamnese Estruturada (Adulto / Adolescente) ===
       
       // Dados Familiares
       pdf.addSection('Dados Familiares');
       pdf.addInline('Pai', `${ana.nome_pai || 'N/I'} (${ana.idade_pai || '?'} anos - ${ana.profissao_pai || 'N/I'})`);
       pdf.addInline('Mãe', `${ana.nome_mae || 'N/I'} (${ana.idade_mae || '?'} anos - ${ana.profissao_mae || 'N/I'})`);
       pdf.addInline('Irmãos', `${ana.qtd_irmaos || 0} (${ana.irmaos_masculino || 0}M / ${ana.irmaos_feminino || 0}F)`);
       if (ana.observacoes_familiares) pdf.addField('Observações Familiares', ana.observacoes_familiares);

       // Desenvolvimento (se adolescente)
       if (ana.tipo === 'adolescente') {
         pdf.addSection('Desenvolvimento e Escola');
         pdf.addInfoBlock([
           { label: 'Gestação Planejada', value: ana.gestacao_planejada ? 'Sim' : 'Não' },
           { label: 'Tipo de Parto', value: ana.tipo_parto || 'N/I' },
           { label: 'Amamentação', value: ana.mamou ? `Sim (${ana.tempo_amamentacao || ''})` : 'Não' },
         ]);
         if (ana.gestacao_notas) pdf.addField('Notas da Gestação', ana.gestacao_notas);
         pdf.addField('Desenvolvimento Motor', ana.desenvolvimento_motor);
         pdf.addField('Fala / Linguagem', ana.atraso_fala);
         pdf.addField('Interação / Brincadeiras', ana.interacao_brincadeiras);
         if (ana.dificuldade_escolar) pdf.addField('Dificuldade Escolar', ana.dificuldade_escolar_notas);
         if (ana.seletividade_alimentar) pdf.addField('Seletividade Alimentar', ana.seletividade_notas);
       }

       // Motivo e Dinâmicas
       pdf.addSection('Motivo da Consulta');
       pdf.addTextBlock('Motivo Principal', ana.motivo_consulta);
       pdf.addTextBlock('Histórico da Queixa', ana.historico_queixa);
       pdf.addTextBlock('Dinâmica Familiar', ana.dinamica_familiar);

       // Quadro Clínico
       pdf.addSection('Quadro Clínico e Histórico');
       pdf.addTextBlock('Sintomas Apresentados', ana.sintomas_apresentados);
       pdf.addTextBlock('Fatores Agravantes', ana.fatores_agravantes);
       if (ana.tentativa_suicidio) pdf.addAlert(ana.tentativa_suicidio);
       pdf.addInfoBlock([
         { label: 'Psicólogo Prévio', value: ana.psicologo_previo ? 'Sim' : 'Não' },
         { label: 'Psiquiatra Prévio', value: ana.psiquiatra_previo ? 'Sim' : 'Não' },
       ]);

       // Parecer
       pdf.addSection('Parecer Profissional');
       pdf.addTextBlock('Observações Gerais', ana.observacoes_gerais);
     }

     pdf.save(`Anamnese_${patient.nome.replace(/\s+/g,'_')}.pdf`);
     trackAction('EXPORT_PDF_ANAMNESIS', { patientId: patient.id, patientName: patient.nome, anamneseType: anamneses[0]?.tipo || 'adulto' });
  };

  const gerarPdfSessao = (sessao) => {
    const { PdfBuilder, formatDateBR } = require('../services/pdfUtils');
    
    const dataFormatada = sessao.data_sessao 
      ? formatDateBR(sessao.data_sessao)
      : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR');

    const pdf = new PdfBuilder(
      'Evolucao de Sessao Psicologica',
      `Paciente: ${patient.nome} - ${dataFormatada}`
    );

    // Dados da sessão
    pdf.addSection('Dados da Sessao');
    pdf.addInfoBlock([
      { label: 'Paciente', value: patient.nome },
      { label: 'Data da Sessão', value: dataFormatada },
      { label: 'Status', value: sessao.status || 'Não Definido' },
    ]);

    // Conteúdo
    pdf.addSection('Registro Clinico');
    pdf.addTextBlock('Observações / Notas', sessao.observacoes || sessao.evolucao_notas);
    pdf.addTextBlock('Comportamento Apresentado', sessao.comportamento);
    pdf.addTextBlock('Sintomas Relatados', sessao.sintomas);

    const dataNomeArquivo = sessao.data_sessao 
      ? sessao.data_sessao.split('-').reverse().join('-') 
      : new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    pdf.save(`Sessao_${patient.nome.replace(/\s+/g,'_')}_${dataNomeArquivo}.pdf`);
    trackAction('EXPORT_PDF_SESSION', { patientId: patient.id, patientName: patient.nome, sessionDate: sessao.data_sessao });
  };

  const handleExportCompleteRecord = () => {
    const { PdfBuilder, formatDateBR } = require('../services/pdfUtils');
    
    showToast({ type: 'info', message: 'Gerando prontuário completo, aguarde...' });
    
    try {
      const pdf = new PdfBuilder(
        'Prontuário Clínico Completo',
        `Paciente: ${patient.nome}`
      );

      // Dados Básicos do Paciente
      pdf.addSection('Dados do Paciente');
      const birthDate = patient.data_nascimento ? new Date(patient.data_nascimento) : null;
      let ageText = 'N/I';
      if (birthDate) {
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        ageText = Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
      }

      pdf.addInfoBlock([
        { label: 'Nome', value: patient.nome },
        { label: 'CPF', value: formatCPF(patient.cpf) || 'N/I' },
        { label: 'Idade', value: ageText },
        { label: 'Telefone', value: patient.telefone || 'N/I' },
      ]);

      // Anamnese (Se existir)
      if (anamneses.length > 0) {
        const ana = anamneses[0];
        pdf.addSection('Anamnese (Resumo)');
        
        if (ana.tipo === 'dinamico' && ana.template_snapshot) {
          ana.template_snapshot.campos.forEach((campo, idx) => {
            const resposta = ana.respostas?.[campo.id] || ana.respostas?.[idx];
            const valor = Array.isArray(resposta) ? resposta.join(', ') : (resposta || 'N/D');
            pdf.addField(campo.label || campo.titulo || `Pergunta ${idx + 1}`, String(valor));
          });
        } else {
          pdf.addTextBlock('Motivo da Consulta', ana.motivo_consulta);
          pdf.addTextBlock('Sintomas Apresentados', ana.sintomas_apresentados);
          pdf.addTextBlock('Parecer Profissional', ana.observacoes_gerais);
        }
      }

      // Sessões (Ordenadas da mais antiga para mais recente)
      if (sessoes.length > 0) {
        pdf.addSection('Evoluções (Sessões)');
        const sessoesOrdenadas = [...sessoes].sort((a, b) => {
          const d1 = a.data_sessao ? new Date(a.data_sessao) : new Date(a.createdAt?.toDate?.() || 0);
          const d2 = b.data_sessao ? new Date(b.data_sessao) : new Date(b.createdAt?.toDate?.() || 0);
          return d1 - d2;
        });

        sessoesOrdenadas.forEach((sessao, index) => {
          const dataS = sessao.data_sessao 
            ? formatDateBR(sessao.data_sessao)
            : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR');
            
          pdf.addInline(`Sessão ${index + 1}`, `${dataS} - Status: ${sessao.status || 'N/D'}`);
          if (sessao.observacoes || sessao.evolucao_notas) {
            pdf.addField('Observações', sessao.observacoes || sessao.evolucao_notas);
          }
          if (sessao.comportamento) {
            pdf.addField('Comportamento', sessao.comportamento);
          }
          if (sessao.sintomas) {
            pdf.addField('Sintomas', sessao.sintomas);
          }
        });
      } else {
        pdf.addSection('Evoluções');
        pdf.addField('Aviso', 'Nenhuma sessão registrada para este paciente.');
      }

      const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      pdf.save(`Prontuario_Completo_${patient.nome.replace(/\s+/g,'_')}_${dataStr}.pdf`);
      trackAction('EXPORT_PDF_COMPLETE_RECORD', { patientId: patient.id, patientName: patient.nome, totalSessoes: sessoes.length });
    } catch (err) {
      logger.error(err);
      showToast({ type: 'error', message: 'Erro ao gerar o prontuário completo.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[90vh] ds-card flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" style={{ borderRadius: '16px' }}>
        
        {/* Header Profissional do Prontuário */}
        <div className="p-6 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row flex-shrink-0" style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[15px] flex items-center justify-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-cyan-400" style={{ backgroundColor: 'var(--bg-card)' }}>
                  {patient?.nome?.charAt(0)?.toUpperCase() || '?'}
                </div>
             </div>
             <div>
               <h2 className="text-2xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{patient.nome}</h2>
               <div className="flex flex-wrap items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                   CPF: {formatCPF(patient.cpf) || 'Não info.'}
                 </span>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   {age} anos
                 </span>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   {patient.telefone || 'Sem contato'}
                 </span>
                 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)', color: 'var(--status-success-text)' }}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {patient.valor_sessao ? `R$ ${parseFloat(patient.valor_sessao).toFixed(2).replace('.', ',')}` : 'Valor ñ def.'}
                 </span>
               </div>
             </div>
          </div>
          
          <div className="flex items-center gap-2 self-start -mr-2">
              <button
               onClick={handleExportCompleteRecord}
               className="p-2 rounded-xl transition-colors"
               style={{ color: 'var(--text-muted)' }}
               title="Exportar Prontuário Completo (PDF)"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </button>
              <button
               onClick={() => onEditRequest && onEditRequest(patient)}
               className="p-2 rounded-xl transition-colors"
               style={{ color: 'var(--text-muted)' }}
               title="Editar Paciente"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
             </button>
              <button 
               onClick={onClose}
               className="p-2 rounded-xl transition-colors"
               style={{ color: 'var(--text-muted)' }}
               title="Fechar Prontuário"
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 px-6 pt-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
          <button
            onClick={() => setActiveTab('evolucoes')}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-all"
            style={{
              borderColor: activeTab === 'evolucoes' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'evolucoes' ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            Acompanhamento (Sessões)
          </button>
          <button
            onClick={() => setActiveTab('anamnese')}
            className="px-4 py-3 text-sm font-medium border-b-2 transition-all"
            style={{
              borderColor: activeTab === 'anamnese' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'anamnese' ? 'var(--accent)' : 'var(--text-muted)'
            }}
          >
            Ficha de Anamnese
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-8 h-8 animate-spin mb-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Lendo prontuário seguro...</span>
            </div>
          ) : (
            <>
              {activeTab === 'evolucoes' && (
                <div className="space-y-6">
                  {sessoes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl" style={{ borderColor: 'var(--border)' }}>
                      <svg className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nenhuma sessão registrada.</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Este paciente ainda não teve evoluções salvas.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Mood Chart */}
                      <div className="ds-card p-5">
                        <MoodChart sessoes={sessoes} />
                      </div>
                      {/* Timeline */}
                      <div className="relative ml-4 space-y-8 pb-4" style={{ borderLeft: '1px solid var(--border)' }}>
                      {sessoes.map((sessao) => (
                        <div key={sessao.id} className="relative pl-8">
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 0 4px var(--bg-card)' }}></div>
                          
                          <div className="ds-card p-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  {sessao.data_sessao ? sessao.data_sessao.split('-').reverse().join('/') : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR')}
                                </h4>
                                <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>ID Sessão: {sessao.id.substring(0,8)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => gerarPdfSessao(sessao)} className="p-1.5 rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)' }} title="Exportar Sessão para PDF">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  </button>
                                  <button onClick={() => setEditingSessao({ ...sessao })} className="p-1.5 rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid var(--status-warning)' }} title="Editar Evolução">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button onClick={() => handleExcluirSessao(sessao)} className="p-1.5 rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '1px solid var(--status-danger)' }} title="Apagar Evolução">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
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
                                <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                  <button onClick={() => setEditingSessao(null)} className="ds-btn ds-btn-ghost px-4 py-2 text-sm">Cancelar</button>
                                  <button onClick={handleSalvarEdicaoSessao} disabled={isSavingSessao} className="ds-btn ds-btn-primary px-5 py-2 text-sm font-semibold disabled:opacity-50">
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
                         <div className="w-full text-left p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                           <div className="flex justify-between items-center mb-8 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div>
                                 <h3 className="text-xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                     Anamnese Registrada
                                     <span className="ds-badge text-[10px] uppercase font-bold">
                                         {currentAnamnese.tipo === 'adolescente' ? 'Infantil / Adolescente' : (currentAnamnese.tipo === 'dinamico' ? (currentAnamnese.questionario_nome || 'Personalizada') : 'Adulto')}
                                     </span>
                                 </h3>
                                 <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Criada em: {new Date(currentAnamnese.createdAt?.toDate() || Date.now()).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <button onClick={() => setIsEditingAnamnese(true)} className="ds-btn ds-btn-secondary flex items-center gap-2 px-3 py-2 text-sm" title="Editar">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    <span className="hidden sm:block">Editar</span>
                                 </button>
                                 <button onClick={gerarPdfAnamnese} className="ds-btn flex items-center gap-2 px-3 py-2 text-sm" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)' }} title="Exportar">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    <span className="hidden sm:block">Exportar</span>
                                 </button>
                                 <button onClick={() => setConfirmDeleteAnamnese({ isOpen: true, anamnese: currentAnamnese })} className="ds-btn ds-btn-danger flex items-center gap-2 px-3 py-2 text-sm" title="Excluir">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                 </button>
                              </div>
                           </div>
  
                           {/* Exibição da Anamnese Estruturada ou Dinâmica */}
                           <div className="space-y-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                             {anamneses[0].tipo === 'dinamico' ? (
                                 <div className="ds-card p-6">
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
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="ds-card p-4 rounded-xl">
                                      <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Psicólogo Pruvio</span>
                                      <span className="font-semibold">{anamneses[0].psicologo_previo ? 'Sim' : 'Não'}</span>
                                    </div>
                                    <div className="ds-card p-4 rounded-xl">
                                      <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Psiquiatra Prévio</span>
                                      <span className="font-semibold">{anamneses[0].psiquiatra_previo ? 'Sim' : 'Não'}</span>
                                    </div>
                                 </div>
  
                                 <div className="ds-card p-5 rounded-xl space-y-3">
                                    <h4 className="text-indigo-400 font-semibold mb-2">Estrutura Familiar</h4>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Pai:</span> {anamneses[0].nome_pai} ({anamneses[0].idade_pai} anos - {anamneses[0].profissao_pai})</p>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Mãe:</span> {anamneses[0].nome_mae} ({anamneses[0].idade_mae} anos - {anamneses[0].profissao_mae})</p>
                                    <p className="break-words"><span style={{ color: 'var(--text-secondary)' }}>Irmãos:</span> {anamneses[0].qtd_irmaos} ({anamneses[0].irmaos_masculino}H / {anamneses[0].irmaos_feminino}M)</p>
                                    {anamneses[0].observacoes_familiares && <p className="mt-3 italic break-words" style={{ color: 'var(--text-muted)' }}>"{anamneses[0].observacoes_familiares}"</p>}
                                 </div>
  
                                 {/* Especifico: Desenvolvimento (Adolescente) */}
                                 {anamneses[0].tipo === 'adolescente' && (
                                     <div className="bg-cyan-500/5 border border-cyan-500/20 p-5 rounded-xl space-y-4">
                                        <h4 className="text-cyan-400 font-semibold mb-2">Desenvolvimento Infanto-Juvenil e Escola</h4>
                                        
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
                                   <div className="ds-card p-5 rounded-xl">
                                      <h4 className="text-indigo-400 font-semibold mb-2">Motivo da Consulta e Dinâmicas</h4>
                                      <p className="whitespace-pre-wrap break-words"><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs mt-2">Motivo:</strong>{anamneses[0].motivo_consulta}</p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm break-words" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs">Histórico:</strong>{anamneses[0].historico_queixa}</p>
                                      <p className="mt-2 whitespace-pre-wrap text-sm break-words" style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-secondary)' }} className="block text-xs">Dinâmica Familiar:</strong>{anamneses[0].dinamica_familiar}</p>
                                   </div>
                                   <div className="ds-card p-5 rounded-xl">
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
  
                                 <div className="ds-card p-5 rounded-xl">
                                    <h4 className="text-emerald-400 font-semibold mb-2">Parecer e Observações Profissionais</h4>
                                    <p className="whitespace-pre-wrap break-words">{anamneses[0].observacoes_gerais}</p>
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                      ) : (!selectedFormType && !selectedTemplate && !isEditingAnamnese) ? (
                          <div className="w-full h-full flex items-center justify-center p-6">
                              <div className="max-w-md w-full text-center">
                                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </div>
                                  <h3 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhuma anamnese registrada</h3>
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
                          <div className="w-full p-6 h-full overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <h3 className="text-xl font-heading font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                  <span>{selectedTemplate.icone}</span> {selectedTemplate.nome}
                                </h3>
                                {selectedTemplate.descricao && (
                                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedTemplate.descricao}</p>
                                )}
                              </div>
                              <button
                                onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                                className="p-2 rounded-xl transition-colors" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}
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
  
                            <div className="ds-card rounded-2xl p-6">
                              <QuestionarioFiller
                                template={selectedTemplate}
                                respostas={templateRespostas}
                                onChange={setTemplateRespostas}
                              />
                            </div>
  
                            <div className="mt-8 pt-4 flex justify-end items-center gap-3" style={{ borderTop: '1px solid var(--border)' }}>
                              <button
                                onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                                className="ds-btn ds-btn-ghost px-5 py-2.5 text-sm font-medium"
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
                                className="ds-btn ds-btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50"
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
                            <h4 className="text-indigo-500 font-bold mb-3">Respostas da Anamnese</h4>
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
