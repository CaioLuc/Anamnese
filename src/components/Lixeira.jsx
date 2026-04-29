import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { lerPacientesDeletados, restaurarPaciente } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Trash2, RotateCcw, AlertTriangle, Info } from 'lucide-react';

/**
 * Lixeira — Tela de recuperação de pacientes deletados.
 * Exibe pacientes com soft-delete nos últimos 7 dias, permitindo restauração.
 */
export default function Lixeira({ onPatientRestored }) {
  const [deletados, setDeletados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmRestore, setConfirmRestore] = useState({ isOpen: false, paciente: null });
  const [restoringId, setRestoringId] = useState(null);
  const { showToast } = useToast();

  const loadDeletados = async () => {
    setIsLoading(true);
    try {
      const data = await lerPacientesDeletados();
      setDeletados(data);
    } catch (err) {
      logger.error(err);
      showToast({ type: 'error', message: 'Erro ao carregar a lixeira.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeletados();
  }, []);

  const handleRestore = async (id) => {
    setConfirmRestore({ isOpen: false, paciente: null });
    setRestoringId(id);
    try {
      await restaurarPaciente(id);
      showToast({ type: 'success', message: 'Paciente restaurado com sucesso!' });
      await loadDeletados();
      if (onPatientRestored) onPatientRestored();
    } catch (err) {
      logger.error(err);
      showToast({ type: 'error', message: 'Erro ao restaurar paciente. Tente novamente.' });
    } finally {
      setRestoringId(null);
    }
  };

  const getUrgencyColor = (dias) => {
    if (dias <= 1) return 'danger';
    if (dias <= 3) return 'warning';
    return 'neutral';
  };

  const Spinner = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando lixeira...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 w-full h-full flex flex-col p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
          <Trash2 size={32} style={{ color: 'var(--text-muted)' }} />
          Lixeira
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Pacientes excluídos nos últimos 7 dias. Após esse prazo, serão removidos permanentemente.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : deletados.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-bg)' }}>
              <Trash2 size={40} style={{ color: 'var(--status-success)' }} />
            </div>
            <h3 className="text-lg font-heading font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Lixeira vazia</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum paciente foi excluído recentemente. Isso é uma boa notícia!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
            {deletados.length} paciente{deletados.length > 1 ? 's' : ''} na lixeira
          </p>

          {deletados.map((pac) => {
            const isRestoring = restoringId === pac.id;
            return (
              <div
                key={pac.id}
                className={`group flex items-center justify-between p-4 rounded-2xl transition-all`}
                style={{
                    backgroundColor: isRestoring ? 'var(--bg-primary)' : 'var(--bg-card)',
                    border: `1px solid ${isRestoring ? 'var(--accent)' : 'var(--border)'}`,
                    opacity: isRestoring ? 0.6 : 1
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  >
                    {pac.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{pac.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Excluído em {pac.deletedDate?.toLocaleDateString('pt-BR') || '—'}
                      {pac.clinica && ` · ${pac.clinica}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Badge de urgência */}
                  <Badge variant={getUrgencyColor(pac.diasRestantes)}>
                    {pac.diasRestantes <= 0 ? 'Expirando' : `${pac.diasRestantes}d restante${pac.diasRestantes > 1 ? 's' : ''}`}
                  </Badge>

                  {/* Botão restaurar */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmRestore({ isOpen: true, paciente: pac })}
                    disabled={isRestoring}
                  >
                    <RotateCcw size={14} />
                    {isRestoring ? 'Restaurando...' : 'Restaurar'}
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-4 rounded-2xl flex items-start gap-3" style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning)' }}>
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--status-warning)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--status-warning)' }}>
              <strong>Nota:</strong> Pacientes permanecem na lixeira por até 7 dias. Após esse período, todos os dados (anamneses, sessões e evolução) serão excluídos permanentemente e não poderão ser recuperados.
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRestore.isOpen}
        title="Restaurar Paciente"
        message={`Deseja restaurar "${confirmRestore.paciente?.nome}" de volta à sua lista de pacientes ativos?`}
        onConfirm={() => handleRestore(confirmRestore.paciente?.id)}
        onCancel={() => setConfirmRestore({ isOpen: false, paciente: null })}
        variant="warning"
        confirmText="Sim, restaurar"
      />
    </div>
  );
}
