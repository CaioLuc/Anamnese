import { useState, useEffect } from 'react';
import { criarPaciente, atualizarPaciente } from '../services/patientService';
import { formatCPF, cleanCPF } from '../utils/formatUtils';

const toTitleCase = (str) => {
  const preps = ["de", "da", "do", "das", "dos", "e"];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
       if (index > 0 && preps.includes(word)) return word;
       return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export default function AddPatientModal({ isOpen, onClose, onPatientAdded, patientToEdit = null }) {
  const [formData, setFormData] = useState({ nome: '', data_nascimento: '', telefone: '', cpf: '', valor_sessao: '', clinica: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (patientToEdit) {
      setFormData({
        nome: patientToEdit.nome || '',
        data_nascimento: patientToEdit.data_nascimento || '',
        telefone: patientToEdit.telefone || '',
        cpf: formatCPF(patientToEdit.cpf) || '',
        valor_sessao: patientToEdit.valor_sessao || '',
        clinica: patientToEdit.clinica || ''
      });
    } else {
      setFormData({ nome: '', data_nascimento: '', telefone: '', cpf: '', valor_sessao: '', clinica: '' });
    }
    setError('');
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.nome || !formData.data_nascimento) {
        throw new Error('Nome e Data de Nascimento são obrigatórios.');
      }

      const dataToSave = { ...formData, cpf: cleanCPF(formData.cpf) };

      if (patientToEdit) {
        await atualizarPaciente(patientToEdit.id, dataToSave);
        onPatientAdded({ id: patientToEdit.id, ...dataToSave }, true); // true = isEdit
      } else {
        const id = await criarPaciente(dataToSave);
        onPatientAdded({ id, ...dataToSave }, false);
      }
      
      setFormData({ nome: '', data_nascimento: '', telefone: '', cpf: '', valor_sessao: '', clinica: '' });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao salvar o paciente. Verifique sua conexão ou chaves do Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar pointer-events-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          {patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome Completo *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: toTitleCase(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data de Nascimento *</label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">CPF (Opcional)</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Valor da Sessão (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_sessao}
                onChange={(e) => setFormData({ ...formData, valor_sessao: e.target.value })}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Local de Atendimento</label>
            <input
              type="text"
              value={formData.clinica}
              onChange={(e) => setFormData({ ...formData, clinica: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Consultório Particular, Clínica Bem Estar..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"> Cancelar </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white transition-all bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : (patientToEdit ? 'Salvar Alterações' : 'Salvar Paciente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
