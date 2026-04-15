import { useState, useEffect } from 'react';
import { lerClinicas, criarClinica, deletarClinica, lerPerfilPsicologo } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';

export default function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [nomeClinica, setNomeClinica] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [maxLocais, setMaxLocais] = useState(1);
  const [planoAtual, setPlanoAtual] = useState('basico');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, clinica: null });

  useEffect(() => {
    loadClinicas();
    loadPerfil();
  }, []);

  const loadPerfil = async () => {
    try {
      const perfil = await lerPerfilPsicologo();
      if (perfil) {
        setMaxLocais(perfil.max_locais || 1);
        setPlanoAtual(perfil.plano || 'basico');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadClinicas = async () => {
    setIsLoading(true);
    try {
      const data = await lerClinicas();
      setClinicas(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar locais de atendimento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nomeClinica.trim()) return;
    setIsSubmitting(true);
    setError('');

    try {
      // Verificar limite do plano
      if (clinicas.length >= maxLocais) {
        throw new Error(`Limite do seu plano atingido (${maxLocais} local). Atualize para o plano Profissional para adicionar mais locais.`);
      }
      // Verificar se já existe com mesmo nome (case insensitive)
      const nomeLimpo = nomeClinica.trim();
      const exists = clinicas.some(c => c.nome.toLowerCase() === nomeLimpo.toLowerCase());
      if (exists) {
        throw new Error('Local de atendimento já cadastrado com este nome.');
      }

      await criarClinica({ nome: nomeLimpo });
      setNomeClinica('');
      await loadClinicas();
    } catch (err) {
      setError(err.message || 'Erro ao criar local de atendimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmDelete({ isOpen: false, clinica: null });
    try {
      await deletarClinica(id);
      await loadClinicas();
    } catch (err) {
      setError('Erro ao remover local.');
    }
  };

  return (
    <>
    <div className="animate-in fade-in duration-500 w-full h-full flex flex-col p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Locais de Atendimento</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Gerencie suas clínicas ou locais de atendimento. Eles aparecerão na lista ao cadastrar novos pacientes.
        </p>
      </div>

      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-2xl rounded-3xl p-6 sm:p-8 mb-8">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome do Local/Clínica</label>
            <input
              type="text"
              value={nomeClinica}
              onChange={(e) => setNomeClinica(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Clínica Bem Estar, Consultório Online..."
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting || !nomeClinica.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-500 text-white rounded-xl shadow-md hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Adicionando...' : 'Adicionar Local'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/50">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Locais Cadastrados</h3>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : clinicas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <svg className="w-12 h-12 mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p>Nenhum local cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-200 dark:divide-white/5">
            {clinicas.map(c => (
              <li key={c.id} className="flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{c.nome}</h4>
                    <span className="text-xs text-slate-500">Adicionado em {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'recentemente'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setConfirmDelete({ isOpen: true, clinica: c })}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remover"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    <ConfirmDialog
      isOpen={confirmDelete.isOpen}
      title="Remover Local de Atendimento"
      message={`Deseja remover "${confirmDelete.clinica?.nome}"? Pacientes já vinculados a este local não serão afetados, mas a opção sumirá da lista de novas seleções.`}
      onConfirm={() => handleDelete(confirmDelete.clinica?.id)}
      onCancel={() => setConfirmDelete({ isOpen: false, clinica: null })}
    />
    </>
  );
}
