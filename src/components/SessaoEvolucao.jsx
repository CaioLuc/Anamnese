import { useState } from 'react';
import { criarSessao } from '../services/patientService';
import { jsPDF } from 'jspdf';

export default function SessaoEvolucao({ patients, isLoadingPatients }) {
  const [formData, setFormData] = useState({
    id_paciente: '',
    data_sessao: new Date().toISOString().split('T')[0], // Hoje como default
    status: 'Presente',
    observacoes: '',
    comportamento: '',
    sintomas: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      await criarSessao(formData);
      
      setStatusMessage({ type: 'success', text: 'Evolução salva com sucesso no banco de dados!' });
      
      // Limpa os dados de texto, mantém paciente e data
      setFormData(prev => ({ 
        ...prev, 
        observacoes: '',
        comportamento: '',
        sintomas: ''
      }));

      setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);

    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao registrar a evolução.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    if (!formData.id_paciente || !formData.observacoes || formData.observacoes.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Preencha o paciente e as observações gerais da sessão antes de exportar.' });
      return;
    }

    try {
      const patient = patients.find(p => p.id === formData.id_paciente);
      const patientName = patient ? patient.nome : 'Paciente_Desconhecido';

      // Format Date
      const [year, month, day] = formData.data_sessao.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Ficha Clinica - Evolucao', 105, 20, { align: 'center' });
      
      // Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Paciente: ${patientName}`, 20, 40);
      doc.text(`Data da Sessao: ${formattedDate}`, 20, 48);
      doc.text(`Status: ${formData.status}`, 20, 56);
      
      doc.line(20, 62, 190, 62);

      // Section 1: Observações
      let yPos = 72;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Observacoes Gerais:', 20, yPos);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      yPos += 7;
      const splitObs = doc.splitTextToSize(formData.observacoes || 'N/A', 170);
      doc.text(splitObs, 20, yPos);
      yPos += (splitObs.length * 6) + 10;

      // Section 2: Comportamento
      if (formData.comportamento) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Comportamento Apresentado:', 20, yPos);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          yPos += 7;
          const splitComp = doc.splitTextToSize(formData.comportamento, 170);
          doc.text(splitComp, 20, yPos);
          yPos += (splitComp.length * 6) + 10;
      }

      // Section 3: Sintomas
      if (formData.sintomas) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Sintomas Relatados:', 20, yPos);
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          yPos += 7;
          const splitSin = doc.splitTextToSize(formData.sintomas, 170);
          doc.text(splitSin, 20, yPos);
      }
      
      doc.save(`Evolucao_${patientName.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`);
      
      setStatusMessage({ type: 'success', text: 'PDF exportado com sucesso!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Erro ao gerar o PDF.' });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Nova Evolução</h2>
        <p className="mt-1 text-slate-400">Registre o status, comportamento e sintomas do atendimento atual.</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl p-6 sm:p-10 relative overflow-hidden">
        
        {statusMessage.text && (
          <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 transition-all ${
            statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {statusMessage.type === 'success' 
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Sessão 1: Cabeçalho */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
            {/* Paciente */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">Paciente *</label>
              <div className="relative">
                <select
                  value={formData.id_paciente}
                  onChange={(e) => setFormData({ ...formData, id_paciente: e.target.value })}
                  disabled={isLoadingPatients || patients.length === 0}
                  className="w-full pl-4 pr-10 py-3 bg-zinc-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  required
                >
                  <option value="" disabled>Selecione um paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data da Sessão *</label>
              <input
                type="date"
                value={formData.data_sessao}
                onChange={(e) => setFormData({ ...formData, data_sessao: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 css-date-input"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status do Comparecimento *</label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full pl-4 pr-10 py-3 bg-zinc-950/80 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                >
                  <option value="Presente">Presente</option>
                  <option value="Faltou">Faltou</option>
                  <option value="Remarcado">Remarcado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Sessão 2: Observações */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Observações gerais *</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[150px] custom-scrollbar"
              placeholder="Resumo da sessão e os principais temas abordados..."
              required
            />
          </div>

          {/* Sessão 3: Comportamento */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Comportamento apresentado</label>
            <textarea
              value={formData.comportamento}
              onChange={(e) => setFormData({ ...formData, comportamento: e.target.value })}
              className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px] custom-scrollbar"
              placeholder="Descreva a postura, afeto, humor e reações do paciente durante o atendimento..."
            />
          </div>

          {/* Sessão 4: Sintomas */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sintomas relatados</label>
            <textarea
              value={formData.sintomas}
              onChange={(e) => setFormData({ ...formData, sintomas: e.target.value })}
              className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[120px] custom-scrollbar"
              placeholder="Ansiedade, insônia, sudorese, etc..."
            />
          </div>

          {/* Botões */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 max-w-sm hidden md:block">
              Este histórico ficará salvo eternamente no banco de dados e poderá ser recuperado no prontuário do paciente.
            </p>
            
            <div className="flex w-full sm:w-auto items-center gap-3">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={!formData.id_paciente || !formData.observacoes}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-slate-300 transition-all bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar PDF
              </button>

              <button 
                type="submit" 
                disabled={isSubmitting || patients.length === 0}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all bg-indigo-500 rounded-xl hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 shadow-xl shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
    </div>
  );
}
