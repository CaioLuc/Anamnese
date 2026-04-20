import { useState, useEffect } from 'react';
import { lerClinicas, criarClinica, deletarClinica, lerPerfilPsicologo } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';
import Button from './ui/Button';
import { Building2, Plus, Trash2 } from 'lucide-react';

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

  const Spinner = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>
  );

  return (
    <>
    <div className="animate-in fade-in duration-500 w-full h-full flex flex-col p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Locais de Atendimento</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Gerencie suas clínicas ou locais de atendimento. Eles aparecerão na lista ao cadastrar novos pacientes.
        </p>
      </div>

      <div className="ds-card p-6 sm:p-8 mb-8" style={{ backgroundColor: 'var(--bg-card)' }}>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do Local/Clínica</label>
            <input
              type="text"
              value={nomeClinica}
              onChange={(e) => setNomeClinica(e.target.value)}
              className="ds-input"
              placeholder="Ex: Clínica Bem Estar, Consultório Online..."
              required
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || !nomeClinica.trim()}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Adicionando...' : <><Plus size={18} /> Adicionar Local</>}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      <div className="ds-card overflow-hidden flex-1 flex flex-col min-h-0" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="p-5" style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>Locais Cadastrados</h3>
        </div>
        
        {isLoading ? (
          <Spinner />
        ) : clinicas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Building2 size={48} className="mb-3 opacity-20" style={{ color: 'var(--text-primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Nenhum local cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto custom-scrollbar" style={{ divideColor: 'var(--border)', divideWidth: '0.5px', divideStyle: 'solid' }}>
            {clinicas.map(c => (
              <li key={c.id} className="flex items-center justify-between p-5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderBottom: '0.5px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nome}</h4>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Adicionado em {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'recentemente'}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete({ isOpen: true, clinica: c })}
                  title="Remover"
                  className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  style={{ color: 'var(--status-danger)' }}
                >
                  <Trash2 size={20} />
                </Button>
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
      variant="danger"
    />
    </>
  );
}
