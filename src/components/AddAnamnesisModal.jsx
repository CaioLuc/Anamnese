import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { criarAnamnese } from '../services/patientService';
import { useEscapeKey } from '../hooks/useKeyboard';

export default function AddAnamnesisModal({ isOpen, onClose, patient, onAnamnesisAdded }) {
  const [formData, setFormData] = useState({
    queixa_principal: '',
    historico_familiar: '',
    observacoes_iniciais: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

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
      logger.error(err);
      setError(err.message || 'Erro ao salvar evolução. Verifique sua conexão ou chaves do Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar Evolução / Anamnese"
        onClick={(e) => e.stopPropagation()}
        className="ds-card relative w-full max-w-2xl p-5 sm:p-8 rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto custom-scrollbar safe-bottom animate-in slide-in-from-bottom-6 sm:zoom-in-95"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5 sm:mb-6 pr-10">
          <h2 className="text-xl sm:text-2xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Registrar Evolução / Anamnese</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Paciente: <span className="ds-badge font-medium">{patient.nome}</span>
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost w-full sm:w-auto px-6 py-2.5">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary w-full sm:w-auto px-6 py-2.5">
              {isSubmitting ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
