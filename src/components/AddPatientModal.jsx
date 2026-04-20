import { useState, useEffect } from 'react';
import { criarPaciente, atualizarPaciente, buscarPacientePorCPF, lerClinicas } from '../services/patientService';
import { formatCPF, cleanCPF, validarCPF, formatTelefone } from '../utils/formatUtils';
import { useEscapeKey } from '../hooks/useKeyboard';

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
  const [clinicas, setClinicas] = useState([]);


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
    
    if (isOpen) {
      lerClinicas().then(data => {
        setClinicas(data);
        if (!patientToEdit && data.length > 0) {
          setFormData(prev => ({ ...prev, clinica: data[0].nome }));
        }
      }).catch(console.error);
    }
  }, [patientToEdit, isOpen]);

  // Fechar com Escape (H7)
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.nome || !formData.data_nascimento) {
        throw new Error('Nome e Data de Nascimento são obrigatórios.');
      }

      if (!formData.cpf) {
        throw new Error('O CPF é obrigatório.');
      }

      // Validação de CPF com dígitos verificadores (H5)
      if (!validarCPF(formData.cpf)) {
        throw new Error('CPF inválido. Verifique se os dígitos estão corretos.');
      }

      const cpfLimpo = cleanCPF(formData.cpf);

      // Verificar CPF duplicado para o mesmo psicólogo
      const existente = await buscarPacientePorCPF(cpfLimpo);
      if (existente) {
        // Se estiver editando o mesmo paciente, ignorar
        if (!patientToEdit || existente.id !== patientToEdit.id) {
          throw new Error(`Já existe um paciente cadastrado com este CPF: ${existente.nome}. Não é possível duplicar.`);
        }
      }

      const dataToSave = { ...formData, cpf: cpfLimpo };

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'var(--overlay)' }}>
      <div className="ds-card relative w-full max-w-md p-8 overflow-y-auto max-h-[90vh] custom-scrollbar pointer-events-auto" style={{ borderRadius: '16px' }}>
        <button onClick={onClose} className="absolute top-6 right-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-heading font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Nome Completo *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: toTitleCase(e.target.value) })}
              className="ds-input"
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Data de Nascimento *</label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="ds-input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>CPF *</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className={`ds-input ${
                  formData.cpf && cleanCPF(formData.cpf).length === 11 && !validarCPF(formData.cpf)
                    ? 'border-red-400'
                    : ''
                }`}
                placeholder="000.000.000-00"
                required
              />
              {formData.cpf && cleanCPF(formData.cpf).length === 11 && !validarCPF(formData.cpf) && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--status-danger)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  CPF inválido. Verifique os dígitos.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Telefone</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                className="ds-input"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Valor da Sessão (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_sessao}
                onChange={(e) => setFormData({ ...formData, valor_sessao: e.target.value })}
                className="ds-input"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Local de Atendimento</label>
            {clinicas.length > 0 ? (
              <select
                value={formData.clinica}
                onChange={(e) => setFormData({ ...formData, clinica: e.target.value })}
                className="ds-input appearance-none"
              >
                <option value="">Selecione o local...</option>
                {clinicas.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.clinica}
                onChange={(e) => setFormData({ ...formData, clinica: e.target.value })}
                className="ds-input"
                placeholder="Ex: Consultório Particular, Clínica Bem Estar..."
              />
            )}
            {clinicas.length === 0 && (
               <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Configure seus locais de atendimento na guia Clínicas.</p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost px-6 py-2.5"> Cancelar </button>
            <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary px-6 py-2.5">
              {isSubmitting ? 'Salvando...' : (patientToEdit ? 'Salvar Alterações' : 'Salvar Paciente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
