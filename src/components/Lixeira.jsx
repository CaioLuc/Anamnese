import { useState, useEffect } from 'react';
import { lerPacientesDeletados, restaurarPaciente } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

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
      console.error(err);
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
      console.error(err);
      showToast({ type: 'error', message: 'Erro ao restaurar paciente. Tente novamente.' });
    } finally {
      setRestoringId(null);
    }
  };

  const getUrgencyColor = (dias) => {
    if (dias <= 1) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (dias <= 3) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  return (
    <div className="animate-in fade-in duration-500 w-full h-full flex flex-col p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Lixeira
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pacientes excluídos nos últimos 7 dias. Após esse prazo, serão removidos permanentemente.
        </p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-slate-500">Carregando lixeira...</p>
          </div>
        </div>
      ) : deletados.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Lixeira vazia</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum paciente foi excluído recentemente. Isso é uma boa notícia!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            {deletados.length} paciente{deletados.length > 1 ? 's' : ''} na lixeira
          </p>

          {deletados.map((pac) => {
            const isRestoring = restoringId === pac.id;
            return (
              <div
                key={pac.id}
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isRestoring 
                    ? 'bg-indigo-500/5 border-indigo-500/20 opacity-60' 
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg shrink-0 border border-slate-200 dark:border-white/10">
                    {pac.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{pac.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Excluído em {pac.deletedDate?.toLocaleDateString('pt-BR') || '—'}
                      {pac.clinica && ` · ${pac.clinica}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Badge de urgência */}
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getUrgencyColor(pac.diasRestantes)}`}>
                    {pac.diasRestantes <= 0 ? 'Expirando' : `${pac.diasRestantes}d restante${pac.diasRestantes > 1 ? 's' : ''}`}
                  </span>

                  {/* Botão restaurar */}
                  <button
                    onClick={() => setConfirmRestore({ isOpen: true, paciente: pac })}
                    disabled={isRestoring}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    )}
                    {isRestoring ? 'Restaurando...' : 'Restaurar'}
                  </button>
                </div>
              </div>
            );
          })}

          <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
            <p className="text-xs text-amber-500/80 leading-relaxed">
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
