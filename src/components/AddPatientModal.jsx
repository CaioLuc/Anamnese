import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { criarPaciente, atualizarPaciente, buscarPacientePorCPF, lerClinicas } from '../services/patientService';
import { formatCPF, cleanCPF, validarCPF, formatTelefone } from '../utils/formatUtils';
import { useEscapeKey } from '../hooks/useKeyboard';
import { useToast } from '../contexts/ToastContext';

const toTitleCase = (str) => {
  const preps = ["de", "da", "do", "das", "dos", "e"];
  return str
    .trim()
    .split(/\s+/)
    .map((word, index) => {
       const lower = word.toLowerCase();
       if (index > 0 && preps.includes(lower)) return lower;
       // Palavra com maiúscula interna digitada de propósito (ex.: McDonald) é mantida; caixa alta total é normalizada
       const base = word !== word.toUpperCase() && /\p{Lu}/u.test(word.slice(1)) ? word : lower;
       // Maiúscula no início da palavra e após hífen/apóstrofo (ex.: Maria-José, D'Ávila)
       return base.replace(/(^|[-'’])(\p{L})/gu, (_, sep, letra) => sep + letra.toUpperCase());
    })
    .join(' ');
};

export default function AddPatientModal({ 
  isOpen, 
  onClose, 
  onPatientAdded, 
  patientToEdit = null,
}) {
  const [formData, setFormData] = useState({ nome: '', data_nascimento: '', telefone: '', cpf: '', valor_sessao: '', clinica: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clinicas, setClinicas] = useState([]);
  const { showToast } = useToast();


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
    
    if (!isOpen) return;
    let active = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    lerClinicas().then(data => {
      if (!active) return;
      setClinicas(data);
      if (!patientToEdit && data.length > 0) {
        setFormData(prev => ({ ...prev, clinica: data[0].nome }));
      }
    }).catch(logger.error);

    return () => {
      active = false;
      document.body.style.overflow = prevOverflow;
    };
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
      let existente;
      try {
        existente = await buscarPacientePorCPF(cpfLimpo);
      } catch (err) {
        // Sem a verificação não dá para garantir que não há duplicata: aborta
        logger.error(err);
        showToast({ type: 'error', message: 'Não foi possível verificar o CPF. Tente novamente.' });
        return;
      }
      if (existente) {
        // Se estiver editando o mesmo paciente, ignorar
        if (!patientToEdit || existente.id !== patientToEdit.id) {
          if (existente.deletedAt) {
            throw new Error('Já existe um paciente com este CPF na Lixeira. Restaure-o em Lixeira.');
          }
          throw new Error(`Já existe um paciente cadastrado com este CPF: ${existente.nome}. Não é possível duplicar.`);
        }
      }

      // Normaliza o nome também aqui: Enter envia o formulário sem disparar o onBlur
      const dataToSave = { ...formData, nome: toTitleCase(formData.nome), cpf: cpfLimpo };

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
      logger.error(err);
      setError(err.message || 'Erro ao salvar o paciente. Verifique sua conexão ou chaves do Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}
        onClick={(e) => e.stopPropagation()}
        className="ds-card relative w-full max-w-md p-5 sm:p-8 rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[92dvh] sm:max-h-[90dvh] custom-scrollbar pointer-events-auto safe-bottom animate-in slide-in-from-bottom-6 sm:zoom-in-95"
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

        <h2 className="text-xl sm:text-2xl font-heading font-bold mb-5 sm:mb-6 pr-10" style={{ color: 'var(--text-primary)' }}>
          {patientToEdit ? 'Editar Paciente' : 'Novo Paciente'}
        </h2>

        {error && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)', color: 'var(--status-danger-text)' }}>
            {error}
          </div>
        )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Nome Completo *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              onBlur={(e) => setFormData(prev => ({ ...prev, nome: toTitleCase(e.target.value) }))}
              className="ds-input"
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost w-full sm:w-auto px-6 py-2.5"> Cancelar </button>
            <button type="submit" disabled={isSubmitting} className="ds-btn ds-btn-primary w-full sm:w-auto px-6 py-2.5">
              {isSubmitting ? 'Salvando...' : (patientToEdit ? 'Salvar Alterações' : 'Salvar Paciente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
