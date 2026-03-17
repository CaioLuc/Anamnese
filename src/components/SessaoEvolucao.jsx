import { useState } from 'react';
import { criarSessao } from '../services/patientService';
import { jsPDF } from 'jspdf';

export default function SessaoEvolucao({ patients, isLoadingPatients }) {
  const [formData, setFormData] = useState({
    id_paciente: '',
    data_sessao: new Date().toISOString().split('T')[0], // Hoje como default
    evolucao_notas: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' }); // success or error

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
      if (!formData.evolucao_notas || formData.evolucao_notas.trim().length < 5) {
        throw new Error('As notas da evolução devem ser preenchidas detalhadamente.');
      }

      await criarSessao(formData);
      
      setStatusMessage({ type: 'success', text: 'Evolução salva com sucesso no banco de dados!' });
      
      // Limpa as notas de evolução, mas pode manter o paciente focado se for útil, ou resetar:
      setFormData(prev => ({ 
        ...prev, 
        evolucao_notas: '' 
      }));

      // Apaga mensagem de sucesso após 5 segundos
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);

    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Erro ao registrar a evolução.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = () => {
    if (!formData.id_paciente) {
      setStatusMessage({ type: 'error', text: 'Selecione um paciente antes de exportar.' });
      return;
    }
    if (!formData.evolucao_notas || formData.evolucao_notas.trim().length < 5) {
      setStatusMessage({ type: 'error', text: 'Preencha a nota de evolução antes de exportar.' });
      return;
    }

    try {
      const patient = patients.find(p => p.id === formData.id_paciente);
      const patientName = patient ? patient.nome : 'Paciente_Desconhecido';

      // Format Date from YYYY-MM-DD to DD/MM/YYYY
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
      doc.text(`Data da Sessao: ${formattedDate}`, 20, 50);
      
      // Divider
      doc.line(20, 55, 190, 55);

      // Notes
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evolucao / Notas da Sessao:', 20, 65);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      // Use splitTextToSize to handle line wrapping at 170 width
      const splitNotes = doc.splitTextToSize(formData.evolucao_notas, 170);
      doc.text(splitNotes, 20, 75);
      
      // Output
      doc.save(`Evolucao_${patientName.replace(/\s+/g, '_')}_${formattedDate.replace(/\//g, '-')}.pdf`);
      
      setStatusMessage({ type: 'success', text: 'PDF exportado com sucesso!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Erro ao gerar o PDF.' });
    }
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Nova Sessão (Evolução)</h2>
        <p className="mt-1 text-slate-400">Registre os dados e observações clínicas do atendimento atual.</p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Select */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Paciente *</label>
              <div className="relative">
                <select
                  value={formData.id_paciente}
                  onChange={(e) => setFormData({ ...formData, id_paciente: e.target.value })}
                  disabled={isLoadingPatients || patients.length === 0}
                  className="w-full pl-4 pr-10 py-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" disabled>
                    {isLoadingPatients ? 'Carregando pacientes...' : (patients.length === 0 ? 'Nenhum paciente castrado' : 'Selecione um paciente')}
                  </option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data da Sessão *</label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.data_sessao}
                  onChange={(e) => setFormData({ ...formData, data_sessao: e.target.value })}
                  className="w-full px-4 py-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 css-date-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Textarea for Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center justify-between">
              <span>Evolução / Notas da Anamnese *</span>
              <span className="text-xs text-slate-500 font-normal">Seja detalhado sobre as queixas e observações da sessão hoje.</span>
            </label>
            <div className="relative rounded-xl border border-white/10 bg-zinc-950/50 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden transition-all shadow-inner">
              <textarea
                value={formData.evolucao_notas}
                onChange={(e) => setFormData({ ...formData, evolucao_notas: e.target.value })}
                className="w-full p-4 bg-transparent border-none text-white placeholder-slate-600 focus:ring-0 resize-y min-h-[250px] sm:min-h-[350px] custom-scrollbar text-base"
                placeholder="Exemplo: O paciente relata diminuição das dores nos ombros. Mantém certa fraqueza muscular nos membros superiores. Exame revelou amplitude de movimento (ADM) aumentada em relação à última sessão..."
                required
              />
              <div className="bg-white/5 px-4 py-2 border-t border-white/5 flex justify-end">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Redator Dinâmico
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 max-w-sm hidden sm:block">
              Ao salvar, este registro ficará permanentemente salvo de forma criptografada atrelado ao banco do paciente na nuvem.
            </p>
            
            <div className="flex w-full sm:w-auto items-center gap-3">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={!formData.id_paciente || formData.evolucao_notas.trim().length < 5}
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
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all bg-indigo-500 rounded-xl hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20"
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
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
