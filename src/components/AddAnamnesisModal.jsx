import { useState } from 'react';
import { criarAnamnese } from '../services/patientService';

export default function AddAnamnesisModal({ isOpen, onClose, patient, onAnamnesisAdded }) {
  const [formData, setFormData] = useState({
    queixa_principal: '',
    historico_familiar: '',
    observacoes_iniciais: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.queixa_principal) {
        throw new Error('A queixa principal é obrigatória.');
      }

      await criarAnamnese({
        id_paciente: patient.id,
        ...formData
      });
      
      if (onAnamnesisAdded) onAnamnesisAdded();
      
      setFormData({ queixa_principal: '', historico_familiar: '', observacoes_iniciais: '' });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao salvar evolução. Verifique sua conexão ou chaves do Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-2xl p-8 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registrar Evolução / Anamnese</h2>
          <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
            Paciente: <span className="text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-lg">{patient.nome}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Queixa Principal *</label>
            <textarea
              value={formData.queixa_principal}
              onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y"
              placeholder="Descreva o motivo principal da consulta..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Histórico Familiar</label>
            <textarea
              value={formData.historico_familiar}
              onChange={(e) => setFormData({ ...formData, historico_familiar: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] resize-y"
              placeholder="Condições hereditárias, histórico genético, etc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações Iniciais / Exame Físico</label>
            <textarea
              value={formData.observacoes_iniciais}
              onChange={(e) => setFormData({ ...formData, observacoes_iniciais: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-y"
              placeholder="Anotações gerais do profissional..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-white/5">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white transition-all bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
