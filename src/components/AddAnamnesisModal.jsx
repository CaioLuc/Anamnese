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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity" style={{ backgroundColor: 'var(--overlay)' }}>
      <div className="ds-card relative w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar" style={{ borderRadius: '16px' }}>
        <button onClick={onClose} className="absolute top-6 right-6 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Registrar Evolução / Anamnese</h2>
          <p className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            Paciente: <span className="ds-badge font-medium">{patient.nome}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Queixa Principal *</label>
            <textarea
              value={formData.queixa_principal}
              onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })}
              className="ds-input min-h-[100px] resize-y"
              placeholder="Descreva o motivo principal da consulta..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Histórico Familiar</label>
            <textarea
              value={formData.historico_familiar}
              onChange={(e) => setFormData({ ...formData, historico_familiar: e.target.value })}
              className="ds-input min-h-[80px] resize-y"
              placeholder="Condições hereditárias, histórico genético, etc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Observações Iniciais / Exame Físico</label>
            <textarea
              value={formData.observacoes_iniciais}
              onChange={(e) => setFormData({ ...formData, observacoes_iniciais: e.target.value })}
              className="ds-input min-h-[120px] resize-y"
              placeholder="Anotações gerais do profissional..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost px-6 py-2.5">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary px-6 py-2.5">
              {isSubmitting ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
