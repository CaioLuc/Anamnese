import { useState, useEffect } from 'react';
import { listarTodosPsicologos, atualizarPlanoPsicologo, toggleAtivoPsicologo, getEstatisticasGlobais, contarPacientesDoPsicologo, getMetricasPsicologo, atualizarTrialPsicologo, salvarAvisoGlobal, lerAvisoGlobal } from '../services/adminService';
import { logoutFirebaseUser } from '../services/authService';

// ==========================================
// HELPERS
// ==========================================
function formatDate(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diasDesde(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function diasAte(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ==========================================
// SUB-COMPONENTS
// ==========================================
function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function PlanoBadge({ plano }) {
  const isPro = plano === 'profissional';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${isPro ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'}`}>
      {isPro ? '⭐ Pro' : '📋 Básico'}
    </span>
  );
}

function StatusBadge({ ativo }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${ativo !== false ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ativo !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
      {ativo !== false ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function TrialBadge({ trialAte }) {
  const dias = diasAte(trialAte);
  if (dias === null) return <span className="text-xs text-slate-400">Sem trial</span>;
  if (dias < 0) return <span className="px-2 py-0.5 text-xs font-bold text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">Expirado</span>;
  if (dias <= 7) return <span className="px-2 py-0.5 text-xs font-bold text-amber-500 bg-amber-500/10 rounded-lg border border-amber-500/20">{dias}d restantes</span>;
  return <span className="px-2 py-0.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">{dias}d restantes</span>;
}

// ==========================================
// MODAL RAIO-X
// ==========================================
function RaioXModal({ psi, onClose }) {
  const [metricas, setMetricas] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trialDate, setTrialDate] = useState('');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const m = await getMetricasPsicologo(psi.id);
      setMetricas(m);
      if (psi.trialAte) {
        const d = psi.trialAte?.toDate ? psi.trialAte.toDate() : new Date(psi.trialAte);
        if (!isNaN(d.getTime())) setTrialDate(d.toISOString().split('T')[0]);
      }
      setIsLoading(false);
    })();
  }, [psi.id]);

  const handleSaveTrial = async () => {
    if (!trialDate) return;
    await atualizarTrialPsicologo(psi.id, trialDate);
    alert('Vencimento atualizado!');
  };

  const diasCriacao = diasDesde(psi.createdAt);
  const diasUltimoLogin = diasDesde(psi.lastLogin || psi.updatedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl z-10 p-6 pb-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {(psi.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{psi.nome || psi.email}</h3>
              <p className="text-xs text-slate-400">{psi.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <PlanoBadge plano={psi.plano} />
            <StatusBadge ativo={psi.ativo} />
            <TrialBadge trialAte={psi.trialAte} />
          </div>

          {/* Info Rápida */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Conta criada em</p>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{formatDate(psi.createdAt)}</p>
              {diasCriacao !== null && <p className="text-xs text-slate-400">({diasCriacao} dias atrás)</p>}
            </div>
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Último acesso</p>
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{formatDate(psi.lastLogin || psi.updatedAt)}</p>
              {diasUltimoLogin !== null && (
                <p className={`text-xs ${diasUltimoLogin > 10 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                  ({diasUltimoLogin} dias atrás){diasUltimoLogin > 10 && ' ⚠️'}
                </p>
              )}
            </div>
          </div>

          {/* Métricas */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            </div>
          ) : metricas && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-indigo-500">{metricas.totalPacientes}</p>
                <p className="text-xs text-slate-500 mt-0.5">Pacientes</p>
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-cyan-500">{metricas.totalSessoes}</p>
                <p className="text-xs text-slate-500 mt-0.5">Sessões</p>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-purple-500">{metricas.totalAnamneses}</p>
                <p className="text-xs text-slate-500 mt-0.5">Anamneses</p>
              </div>
            </div>
          )}

          {/* Engajamento */}
          {metricas && metricas.totalPacientes > 0 && (
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Indicadores</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Média de <strong className="text-indigo-500">{(metricas.totalSessoes / metricas.totalPacientes).toFixed(1)}</strong> sessões por paciente
              </p>
            </div>
          )}

          {/* Trial / Vencimento */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gestão de Acesso / Trial</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSaveTrial}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>

          {/* UID (debug) */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-0.5">UID (Firebase)</p>
            <p className="text-xs font-mono text-slate-500 break-all select-all">{psi.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN ADMIN PANEL
// ==========================================
export default function AdminPanel() {
  const [psicologos, setPsicologos] = useState([]);
  const [stats, setStats] = useState({ total: 0, ativos: 0, inativos: 0, basicos: 0, profissionais: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [pacienteCounts, setPacienteCounts] = useState({});
  const [selectedPsi, setSelectedPsi] = useState(null);
  const [avisoGlobal, setAvisoGlobal] = useState('');
  const [avisoSaving, setAvisoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('psicologos'); // 'psicologos' | 'comunicacao'

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await listarTodosPsicologos();
      setPsicologos(data);
      const s = await getEstatisticasGlobais(data);
      setStats(s);

      const counts = {};
      for (const p of data) {
        counts[p.id] = await contarPacientesDoPsicologo(p.id);
      }
      setPacienteCounts(counts);

      // Carregar aviso global
      const aviso = await lerAvisoGlobal();
      setAvisoGlobal(aviso.mensagem || '');
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePlano = async (uid, plano) => {
    setActionLoading(uid);
    try { await atualizarPlanoPsicologo(uid, plano); await loadData(); } catch (e) { console.error(e); } finally { setActionLoading(null); }
  };

  const handleToggleAtivo = async (uid, currentStatus) => {
    setActionLoading(uid);
    try { await toggleAtivoPsicologo(uid, currentStatus === false); await loadData(); } catch (e) { console.error(e); } finally { setActionLoading(null); }
  };

  const handleSalvarAviso = async () => {
    setAvisoSaving(true);
    try { await salvarAvisoGlobal(avisoGlobal); } catch (e) { console.error(e); } finally { setAvisoSaving(false); }
  };

  const handleExportCSV = () => {
    const header = 'E-mail,Nome,Plano,Status,Pacientes,Criado Em\n';
    const rows = psicologos.map(p => {
      return `${p.email || ''},${(p.nome || '').replace(/,/g, ' ')},${p.plano || 'basico'},${p.ativo !== false ? 'Ativo' : 'Inativo'},${pacienteCounts[p.id] ?? '?'},${formatDate(p.createdAt)}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psicologos_psychobrain_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = psicologos.filter(p => {
    const term = searchTerm.toLowerCase();
    return (p.email || '').toLowerCase().includes(term) || (p.nome || '').toLowerCase().includes(term);
  });

  return (
    <div className="h-full w-full bg-slate-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Painel Administrativo</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">PsycoBrain — Gestão de Acessos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors" title="Exportar lista em CSV">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </button>
          <button onClick={() => logoutFirebaseUser()} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-white/5 px-6 flex gap-1 shrink-0">
        {[
          { id: 'psicologos', label: 'Psicólogos', icon: '👥' },
          { id: 'comunicacao', label: 'Comunicação', icon: '📢' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

        {activeTab === 'psicologos' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total" value={stats.total} color="bg-indigo-500/10" icon={<svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
              <StatCard label="Ativos" value={stats.ativos} color="bg-emerald-500/10" icon={<svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatCard label="Inativos" value={stats.inativos} color="bg-red-500/10" icon={<svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
              <StatCard label="Plano Básico" value={stats.basicos} color="bg-slate-500/10" icon={<span className="text-lg">📋</span>} />
              <StatCard label="Plano Pro" value={stats.profissionais} color="bg-amber-500/10" icon={<span className="text-lg">⭐</span>} />
            </div>

            {/* Search */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-lg">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Psicólogos Cadastrados</h3>
                <button onClick={loadData} className="text-indigo-500 hover:text-indigo-400 text-sm font-medium flex items-center gap-1">
                  <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Atualizar
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-12"><svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-500"><p>Nenhum psicólogo encontrado.</p></div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-white/5">
                  {filtered.map(psi => {
                    const diasLogin = diasDesde(psi.lastLogin || psi.updatedAt);
                    return (
                      <div key={psi.id} className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedPsi(psi)}>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {(psi.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{psi.nome || psi.email || psi.id}</p>
                              <p className="text-xs text-slate-400 truncate">{psi.email || 'E-mail não registrado'}</p>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <PlanoBadge plano={psi.plano} />
                            <StatusBadge ativo={psi.ativo} />
                            <TrialBadge trialAte={psi.trialAte} />
                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">{pacienteCounts[psi.id] !== undefined ? `${pacienteCounts[psi.id]} pac.` : '...'}</span>
                            {diasLogin !== null && (
                              <span className={`text-xs px-2 py-1 rounded-lg ${diasLogin > 10 ? 'text-red-400 bg-red-500/5 font-bold' : 'text-slate-400 bg-slate-100 dark:bg-white/5'}`}>
                                {diasLogin === 0 ? 'Hoje' : diasLogin === 1 ? 'Ontem' : `${diasLogin}d atrás`}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            {actionLoading === psi.id ? (
                              <svg className="w-5 h-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (
                              <>
                                {(!psi.plano || psi.plano === 'basico') ? (
                                  <button onClick={() => handlePlano(psi.id, 'profissional')} className="px-3 py-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors" title="Promover para Profissional">⭐ Pro</button>
                                ) : (
                                  <button onClick={() => handlePlano(psi.id, 'basico')} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-lg transition-colors" title="Rebaixar para Básico">📋 Basic</button>
                                )}
                                <button onClick={() => handleToggleAtivo(psi.id, psi.ativo)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${psi.ativo !== false ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 border-red-500/20' : 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'}`} title={psi.ativo !== false ? 'Desativar' : 'Ativar'}>
                                  {psi.ativo !== false ? '🔒' : '🔓'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'comunicacao' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-lg space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">📢 Aviso Global</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Esta mensagem aparecerá como banner no topo do Dashboard de todos os psicólogos. Deixe vazio para desativar.</p>
              </div>
              <textarea
                value={avisoGlobal}
                onChange={(e) => setAvisoGlobal(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                placeholder="Ex: Manutenção programada para domingo às 22h. O sistema ficará indisponível por 30 minutos."
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">{avisoGlobal ? `${avisoGlobal.length} caracteres` : 'Aviso desativado'}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAvisoGlobal(''); handleSalvarAviso(); }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-red-500 bg-slate-100 dark:bg-white/5 rounded-xl transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={handleSalvarAviso}
                    disabled={avisoSaving}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {avisoSaving ? 'Salvando...' : 'Publicar Aviso'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {avisoGlobal && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Prévia do aviso:</p>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-lg shrink-0">📢</span>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">{avisoGlobal}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Raio-X */}
      {selectedPsi && <RaioXModal psi={selectedPsi} onClose={() => setSelectedPsi(null)} />}
    </div>
  );
}
