import { useState, useEffect } from 'react';
import { lerAnamnesesDoPaciente, lerSessoesDoPaciente, deletarSessao, criarAnamnese, atualizarAnamnese } from '../services/patientService';
import AnamneseForm from './AnamneseForm';
import AnamneseAdolescenteForm from './AnamneseAdolescenteForm';
import { jsPDF } from 'jspdf';
import ConfirmDialog from './ConfirmDialog';
import MoodChart from './MoodChart';
import SelecionarTemplateModal from './SelecionarTemplateModal';
import QuestionarioFiller from './QuestionarioFiller';

function DynamicAnamneseEditor({ anamnese, onSaved, onCancel }) {
  const [respostas, setRespostas] = useState(anamnese.respostas || {});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      await atualizarAnamnese(anamnese.id, { respostas });
      onSaved();
    } catch (e) {
      setError('Erro ao salvar edições. Tente novamente.');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-6 bg-white dark:bg-zinc-950/80">
       <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
         <div>
           <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editando Anamnese</h3>
           <p className="text-sm text-slate-500 mt-1">Atualize as informações desejadas e salve.</p>
         </div>
         <button onClick={onCancel} className="text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-white/5 p-2 rounded-xl transition-colors">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
       </div>
       {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}
       <div className="bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl p-6 border border-slate-200 dark:border-white/5 flex-1 overflow-y-auto custom-scrollbar">
         {anamnese.template_snapshot ? (
            <QuestionarioFiller template={anamnese.template_snapshot} respostas={respostas} onChange={setRespostas} readOnly={false} />
         ) : (
            <div className="text-center p-8 text-amber-500">
               O template desta anamnese não pôde ser recuperado, por isso a edição foi desabilitada para evitar corrupção de dados.
            </div>
         )}
       </div>
       <div className="mt-8 pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-white/10">
         <button onClick={onCancel} className="px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10 rounded-xl">Cancelar</button>
         <button disabled={isSaving || !anamnese.template_snapshot} onClick={handleSave} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow-md font-semibold transition-colors disabled:opacity-50">
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
         </button>
       </div>
    </div>
  );
}

export default function PatientProfileModal({ isOpen, onClose, patient, initialTab = 'evolucoes' }) {
  const [activeTab, setActiveTab] = useState('evolucoes');
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState(null);
  const [isEditingAnamnese, setIsEditingAnamnese] = useState(false);
  const [confirmSessao, setConfirmSessao] = useState({ isOpen: false, sessao: null });
  // Novo: sistema de questionários dinâmicos
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // template escolhido
  const [templateRespostas, setTemplateRespostas] = useState({});
  const [isSavingAnamnese, setIsSavingAnamnese] = useState(false);
  const [anamneseSaveError, setAnamneseSaveError] = useState('');

  useEffect(() => {
    if (isOpen && patient) {
      loadHistory();
      setActiveTab(initialTab);
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
                const { lerQuestionario } = await import('../services/patientService');
                const t = await lerQuestionario(a.questionario_id);
                if (t) a.template_snapshot = t;
             } catch(e) { console.error('Aviso: nao pode carregar template associado', e); }
         }
      }

      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
    } catch (error) {
      console.error(error);
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
      await deletarSessao(sessao.id);
      loadHistory();
    } catch (err) {
      console.error('Erro ao deletar sessão:', err);
    }
  };

  if (!isOpen || !patient) return null;

  const age = new Date().getFullYear() - new Date(patient.data_nascimento).getFullYear();

  // ====== FUNÇÕES DE PDF ======
  const gerarPdfAnamnese = () => {
     if (anamneses.length === 0) return;
     const ana = anamneses[0];
     const doc = new jsPDF();
     let yCursor = 20;
     const margin = 20;
     const lh = 7;

     const textTitle = (text) => {
         doc.setFontSize(14);
         doc.setFont("helvetica", "bold");
         if (yCursor > 270) { doc.addPage(); yCursor = 20; }
         doc.text(text, margin, yCursor);
         yCursor += lh;
         doc.setFontSize(10);
         doc.setFont("helvetica", "normal");
     };

     const textLine = (label, value) => {
         if (yCursor > 270) { doc.addPage(); yCursor = 20; }
         doc.setFont("helvetica", "bold");
         doc.text(`${label}:`, margin, yCursor);
         doc.setFont("helvetica", "normal");
         
         const labelWidth = doc.getTextWidth(`${label}: `);
         const textLines = doc.splitTextToSize(value || 'N/D', 180 - margin - labelWidth);
         
         if (textLines.length > 1) {
             yCursor += lh;
             doc.text(textLines, margin, yCursor);
         } else {
             doc.text(textLines, margin + labelWidth + 2, yCursor);
         }
         
         yCursor += (textLines.length * lh) + 3; 
     };

     doc.setFontSize(18);
     doc.text("Ficha de Anamnese Psicológica", margin, yCursor);
     yCursor += 10;
     
     doc.setFontSize(12);
     let viewMode = ana.tipo === 'adolescente' ? 'Infanto-Juvenil' : (ana.tipo === 'dinamico' ? ana.questionario_nome || 'Personalizada' : 'Adulto');
     doc.text(`Paciente: ${patient.nome} - Tipo: ${viewMode}`, margin, yCursor);
     yCursor += 15;
     
     if (ana.tipo === 'dinamico') {
       doc.setFontSize(10);
       doc.text("Nota: Formato de impressão dinâmica em breve.", margin, yCursor);
     } else {
         textTitle("1. Dados Familiares");
         textLine("Nome do Pai", `${ana.nome_pai} (${ana.idade_pai} anos - ${ana.profissao_pai})`);
         textLine("Nome da Mãe", `${ana.nome_mae} (${ana.idade_mae} anos - ${ana.profissao_mae})`);
         textLine("Qtd Irmãos", `${ana.qtd_irmaos} (${ana.irmaos_masculino}H / ${ana.irmaos_feminino}M)`);
         yCursor += 5;

         if (ana.tipo === 'adolescente') {
             textTitle("2. Desenvolvimento e Escola");
             textLine("Gestação / Nascimento", `Gestação: ${ana.gestacao_notas || '-'} | Parto: ${ana.tipo_parto}`);
             textLine("Amamentação", ana.mamou ? `Sim (${ana.tempo_amamentacao})` : 'Não');
             textLine("Desenvolvimento Motor", ana.desenvolvimento_motor);
             textLine("Linguagem / Fala", ana.atraso_fala);
             textLine("Dificuldade Escolar", ana.dificuldade_escolar ? `Sim - ${ana.dificuldade_escolar_notas}` : 'Não');
             textLine("Seletividade Alimentar", ana.seletividade_alimentar ? `Sim - ${ana.seletividade_notas}` : 'Não');
             yCursor += 5;
         }

         textTitle("3. Motivo da Consulta e Dinâmicas");
         textLine("Motivo Principal", ana.motivo_consulta);
         textLine("Histórico da Queixa", ana.historico_queixa);
         textLine("Dinâmica Familiar", ana.dinamica_familiar);
         yCursor += 5;

         textTitle("4. Quadro Clínico e Histórico");
         textLine("Sintomas Apresentados", ana.sintomas_apresentados);
         textLine("Fatores Agravantes", ana.fatores_agravantes);
         if (ana.tentativa_suicidio) {
             textLine("Risco/Suicídio", ana.tentativa_suicidio);
         }
         textLine("Psicológo/Psiquiatra Prévio", `Psicólogo: ${ana.psicologo_previo?'Sim':'Não'} | Psiquiatra: ${ana.psiquiatra_previo?'Sim':'Não'}`);
         yCursor += 5;

         textTitle("5. Parecer Profissional");
         textLine("Observações Gerais", ana.observacoes_gerais);
     }
     doc.save(`Anamnese_${patient.nome.replace(/\s+/g,'_')}.pdf`);
  };

  const gerarPdfSessao = (sessao) => {
     const doc = new jsPDF();
     let yCursor = 20;
     const margin = 20;

     doc.setFontSize(16);
     doc.text("Evolução de Sessão Psicológica", margin, yCursor);
     yCursor += 15;

     doc.setFontSize(12);
     doc.text(`Paciente: ${patient.nome}`, margin, yCursor);
     yCursor += 10;
     
     const dataFormatada = sessao.data_sessao ? sessao.data_sessao.split('-').reverse().join('/') : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR');
     
     doc.text(`Data da Sessão: ${dataFormatada}`, margin, yCursor);
     yCursor += 10;
     doc.text(`Status: ${sessao.status || 'Não Definido'}`, margin, yCursor);
     yCursor += 15;

     const addField = (title, content) => {
        if (!content) return;
        if (yCursor > 270) { doc.addPage(); yCursor = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, yCursor);
        yCursor += 7;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin, yCursor);
        yCursor += (lines.length * 7) + 5;
     };

     addField("Observações / Notas:", sessao.observacoes || sessao.evolucao_notas);
     addField("Comportamento:", sessao.comportamento);
     addField("Sintomas:", sessao.sintomas);

     const dataNomeArquivo = sessao.data_sessao ? sessao.data_sessao.split('-').reverse().join('-') : new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
     doc.save(`Sessao_${patient.nome.replace(/\s+/g,'_')}_${dataNomeArquivo}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Profissional do Prontuário */}
        <div className="bg-slate-50 dark:bg-zinc-950 p-6 border-b border-slate-300 dark:border-white/10 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row flex-shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg">
                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[15px] flex items-center justify-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-cyan-400">
                  {patient.nome.charAt(0).toUpperCase()}
                </div>
             </div>
             <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{patient.nome}</h2>
               <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400">
                 <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                   CPF: {patient.cpf || 'Não info.'}
                 </span>
                 <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   {age} anos
                 </span>
                 <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   {patient.telefone || 'Sem contato'}
                 </span>
                 <span className="flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   {patient.valor_sessao ? `R$ ${parseFloat(patient.valor_sessao).toFixed(2).replace('.', ',')}` : 'Valor ñ def.'}
                 </span>
               </div>
             </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors self-start"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-slate-300 dark:border-white/10 px-6 pt-2 bg-slate-50 dark:bg-zinc-950 flex-shrink-0">
          <button
            onClick={() => setActiveTab('evolucoes')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'evolucoes'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-white/20'
            }`}
          >
            Acompanhamento (Sessões)
          </button>
          <button
            onClick={() => setActiveTab('anamnese')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'anamnese'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-white/20'
            }`}
          >
            Ficha de Anamnese
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white/50 dark:bg-zinc-900/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-8 h-8 animate-spin text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Lendo prontuário seguro...</span>
            </div>
          ) : (
            <>
              {activeTab === 'evolucoes' && (
                <div className="space-y-6">
                  {sessoes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                      <svg className="mx-auto h-10 w-10 text-slate-600 dark:text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Nenhuma sessão registrada.</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Este paciente ainda não teve evoluções salvas.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Mood Chart */}
                      <div className="bg-white dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                        <MoodChart sessoes={sessoes} />
                      </div>
                      {/* Timeline */}
                      <div className="relative border-l border-slate-300 dark:border-white/10 ml-4 space-y-8 pb-4">
                      {sessoes.map((sessao) => (
                        <div key={sessao.id} className="relative pl-8">
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-zinc-900"></div>
                          
                          <div className="bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
                            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  {sessao.data_sessao ? sessao.data_sessao.split('-').reverse().join('/') : new Date(sessao.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR')}
                                </h4>
                                <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">ID Sessão: {sessao.id.substring(0,8)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => gerarPdfSessao(sessao)} className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-blue-500/20 shadow-sm" title="Exportar Sessão para PDF">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  </button>
                                  <button onClick={() => handleExcluirSessao(sessao)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-red-500/20 shadow-sm" title="Apagar Evolução">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                  <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                                    sessao.status === 'Presente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    sessao.status === 'Faltou' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {sessao.status || 'Status N/D'}
                                  </span>
                              </div>
                            </div>

                            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                              {sessao.observacoes && (
                                <div>
                                  <h5 className="font-semibold text-indigo-300 mb-1 text-xs uppercase tracking-wider">Observações / Notas</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.observacoes}</p>
                                </div>
                              )}
                              
                              {sessao.comportamento && (
                                <div>
                                  <h5 className="font-semibold text-indigo-300 mb-1 text-xs uppercase tracking-wider mt-4">Comportamento</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.comportamento}</p>
                                </div>
                              )}

                              {sessao.sintomas && (
                                <div>
                                  <h5 className="font-semibold text-indigo-300 mb-1 text-xs uppercase tracking-wider mt-4">Sintomas Relatados</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.sintomas}</p>
                                </div>
                              )}

                              {/* Suporte a sessoes legadas (evolucao_notas) */}
                              {sessao.evolucao_notas && !sessao.observacoes && (
                                <div>
                                  <h5 className="font-semibold text-indigo-300 mb-1 text-xs uppercase tracking-wider">Anotação Legada</h5>
                                  <p className="whitespace-pre-wrap leading-relaxed break-words">{sessao.evolucao_notas}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'anamnese' && (
                <div className="bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-2xl flex items-start justify-center">
                   {anamneses.length > 0 && !isEditingAnamnese ? (
                       <div className="w-full text-left p-6 sm:p-10 overflow-y-auto custom-scrollbar">
                         <div className="flex justify-between items-center mb-8 border-b border-slate-300 dark:border-white/10 pb-4">
                            <div>
                               <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                   Anamnese Registrada
                                   <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${anamneses[0].tipo === 'adolescente' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : (anamneses[0].tipo === 'dinamico' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30')}`}>
                                       {anamneses[0].tipo === 'adolescente' ? 'Infantil / Adolescente' : (anamneses[0].tipo === 'dinamico' ? 'Pública / Customizada' : 'Adulto')}
                                   </span>
                               </h3>
                               <p className="text-sm text-slate-600 dark:text-slate-400">Dados do prontuário inicial.</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <button onClick={() => setIsEditingAnamnese(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-white/10 shadow-sm text-sm">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  Editar Ficha
                               </button>
                               <button onClick={gerarPdfAnamnese} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 font-medium rounded-xl hover:bg-blue-500 hover:text-slate-900 dark:hover:text-white transition-all border border-blue-500/20 shadow-sm text-sm">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  Exportar PDF
                               </button>
                               <span className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hidden lg:block">
                                  {new Date(anamneses[0].createdAt?.toDate() || Date.now()).toLocaleDateString()}
                               </span>
                            </div>
                         </div>

                         {/* Exibição da Anamnese Estruturada ou Dinâmica */}
                         <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                           {anamneses[0].tipo === 'dinamico' ? (
                               <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-6 rounded-2xl shadow-sm">
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
                                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Campo: {key}</span>
                                                  <span className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                                              </div>
                                          ))}
                                          <p className="text-xs text-amber-500 mt-4">* O template original não foi salvo e não pôde ser recuperado.</p>
                                      </div>
                                  )}
                               </div>
                           ) : (
                             <>
                               {/* Compartilhado: Seção 0 e 1 */}
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-4 rounded-xl">
                                    <span className="block text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Psicólogo Prévio</span>
                                    <span className="font-semibold">{anamneses[0].psicologo_previo ? 'Sim' : 'Não'}</span>
                                  </div>
                                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-4 rounded-xl">
                                    <span className="block text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Psiquiatra Prévio</span>
                                    <span className="font-semibold">{anamneses[0].psiquiatra_previo ? 'Sim' : 'Não'}</span>
                                  </div>
                               </div>

                               <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-5 rounded-xl space-y-3">
                                  <h4 className="text-indigo-400 font-semibold mb-2">Estrutura Familiar</h4>
                                  <p className="break-words"><span className="text-slate-600 dark:text-slate-400">Pai:</span> {anamneses[0].nome_pai} ({anamneses[0].idade_pai} anos - {anamneses[0].profissao_pai})</p>
                                  <p className="break-words"><span className="text-slate-600 dark:text-slate-400">Mãe:</span> {anamneses[0].nome_mae} ({anamneses[0].idade_mae} anos - {anamneses[0].profissao_mae})</p>
                                  <p className="break-words"><span className="text-slate-600 dark:text-slate-400">Irmãos:</span> {anamneses[0].qtd_irmaos} ({anamneses[0].irmaos_masculino}H / {anamneses[0].irmaos_feminino}M)</p>
                                  {anamneses[0].observacoes_familiares && <p className="mt-3 text-slate-600 dark:text-slate-400 italic break-words">"{anamneses[0].observacoes_familiares}"</p>}
                               </div>

                               {/* Especifico: Desenvolvimento (Adolescente) */}
                               {anamneses[0].tipo === 'adolescente' && (
                                   <div className="bg-cyan-500/5 border border-cyan-500/20 p-5 rounded-xl space-y-4">
                                      <h4 className="text-cyan-400 font-semibold mb-2">Desenvolvimento Infanto-Juvenil e Escola</h4>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-lg border border-slate-200 dark:border-white/5">
                                          <div><span className="text-slate-600 dark:text-slate-400 text-xs block">Gestação Planejada:</span><span className="font-medium">{anamneses[0].gestacao_planejada ? 'Sim' : 'Não'}</span></div>
                                          <div><span className="text-slate-600 dark:text-slate-400 text-xs block">Tipo de Parto:</span><span className="font-medium">{anamneses[0].tipo_parto}</span></div>
                                          <div><span className="text-slate-600 dark:text-slate-400 text-xs block">Amamentou:</span><span className="font-medium">{anamneses[0].mamou ? 'Sim' : 'Não'}</span></div>
                                          <div><span className="text-slate-600 dark:text-slate-400 text-xs block">Tempo/Desmame:</span><span className="font-medium">{anamneses[0].tempo_amamentacao || '-'}</span></div>
                                          <div className="md:col-span-2 mt-2"><span className="text-slate-600 dark:text-slate-400 text-xs block">Notas Gestação/Nascimento:</span><span className="text-sm">{anamneses[0].gestacao_notas} {anamneses[0].testes_notas} {anamneses[0].internacao_notas}</span></div>
                                      </div>

                                      <div className="space-y-2 text-sm">
                                          <p className="break-words"><strong className="text-slate-600 dark:text-slate-400">Desenvolvimento Motor:</strong> {anamneses[0].desenvolvimento_motor}</p>
                                          <p className="break-words"><strong className="text-slate-600 dark:text-slate-400">Fala / Linguagem:</strong> {anamneses[0].atraso_fala}</p>
                                          <p className="break-words"><strong className="text-slate-600 dark:text-slate-400">Interação/Brincadeiras:</strong> {anamneses[0].interacao_brincadeiras}</p>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-lg border border-slate-200 dark:border-white/5">
                                          <div>
                                              <span className="text-slate-600 dark:text-slate-400 text-xs block">Dificuldade Escolar:</span>
                                              <span className="font-medium">{anamneses[0].dificuldade_escolar ? 'Sim' : 'Não'} - {anamneses[0].dificuldade_escolar_notas}</span>
                                          </div>
                                          <div>
                                              <span className="text-slate-600 dark:text-slate-400 text-xs block">Seletividade Alimentar:</span>
                                              <span className="font-medium">{anamneses[0].seletividade_alimentar ? 'Sim' : 'Não'} - {anamneses[0].seletividade_notas}</span>
                                          </div>
                                      </div>
                                   </div>
                               )}

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-5 rounded-xl">
                                    <h4 className="text-indigo-400 font-semibold mb-2">Motivo da Consulta e Dinâmicas</h4>
                                    <p className="whitespace-pre-wrap break-words"><strong className="text-slate-600 dark:text-slate-400 block text-xs mt-2">Motivo:</strong>{anamneses[0].motivo_consulta}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-400 text-sm break-words"><strong className="text-slate-600 dark:text-slate-400 block text-xs">Histórico:</strong>{anamneses[0].historico_queixa}</p>
                                    <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-400 text-sm break-words"><strong className="text-slate-600 dark:text-slate-400 block text-xs">Dinâmica Familiar:</strong>{anamneses[0].dinamica_familiar}</p>
                                 </div>
                                 <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-5 rounded-xl">
                                    <h4 className="text-red-400 font-semibold mb-2">Quadro Clínico</h4>
                                    <p className="whitespace-pre-wrap break-words"><strong className="text-slate-600 dark:text-slate-400 block text-xs mt-2">Sintomas Atuais:</strong>{anamneses[0].sintomas_apresentados}</p>
                                    <p className="whitespace-pre-wrap break-words"><strong className="text-slate-600 dark:text-slate-400 block text-xs mt-2">Agravantes:</strong>{anamneses[0].fatores_agravantes}</p>
                                    {anamneses[0].tentativa_suicidio && (
                                       <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                          <strong className="text-red-400 block text-xs mb-1">Risco Relatado:</strong>
                                          <p className="text-red-300 text-sm italic break-words">{anamneses[0].tentativa_suicidio}</p>
                                       </div>
                                    )}
                                 </div>
                               </div>

                               <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-5 rounded-xl">
                                  <h4 className="text-emerald-400 font-semibold mb-2">Parecer e Observações Profissionais</h4>
                                  <p className="whitespace-pre-wrap break-words">{anamneses[0].observacoes_gerais}</p>
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                    ) : (!selectedFormType && !selectedTemplate) ? (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <div className="max-w-md w-full text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                  <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhuma anamnese registrada</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Inicie a ficha deste paciente criando e preenchendo uma anamnese.</p>
                                <button
                                  onClick={() => setShowTemplateSelector(true)}
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
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
                        <div className="w-full p-6 bg-white dark:bg-zinc-950/80 h-full overflow-y-auto custom-scrollbar">
                          <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{selectedTemplate.icone}</span> {selectedTemplate.nome}
                              </h3>
                              {selectedTemplate.descricao && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedTemplate.descricao}</p>
                              )}
                            </div>
                            <button
                              onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                              className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-xl"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {anamneseSaveError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                              {anamneseSaveError}
                            </div>
                          )}

                          <div className="bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                            <QuestionarioFiller
                              template={selectedTemplate}
                              respostas={templateRespostas}
                              onChange={setTemplateRespostas}
                            />
                          </div>

                          <div className="mt-8 pt-4 flex justify-end items-center gap-3 border-t border-slate-200 dark:border-white/10">
                            <button
                              onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                              className="px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium border border-transparent hover:border-slate-300 dark:hover:border-white/10 rounded-xl"
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
                                  console.error(e);
                                  setAnamneseSaveError('Erro ao salvar. Verifique sua conexão.');
                                } finally {
                                  setIsSavingAnamnese(false);
                                }
                              }}
                              disabled={isSavingAnamnese}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-md disabled:opacity-50"
                            >
                              {isSavingAnamnese ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Salvando...</>
                              ) : 'Salvar Anamnese'}
                            </button>
                          </div>
                        </div>
                    ) : (isEditingAnamnese && anamneses[0]?.tipo === 'dinamico') ? (
                        <DynamicAnamneseEditor anamnese={anamneses[0]} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} onCancel={() => setIsEditingAnamnese(false)} />
                    ) : (selectedFormType === 'adulto' || (isEditingAnamnese && anamneses[0]?.tipo !== 'adolescente')) ? (
                        <AnamneseForm patient={patient} initialData={isEditingAnamnese ? anamneses[0] : null} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} />
                    ) : (
                        <AnamneseAdolescenteForm patient={patient} initialData={isEditingAnamnese ? anamneses[0] : null} onSaved={() => { setIsEditingAnamnese(false); loadHistory(); }} />
                    )}
                 </div>
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
    </div>
  );
}
