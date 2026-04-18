import { useState, useEffect, useMemo } from 'react';
import { listarTodosPsicologos, atualizarPlanoPsicologo, toggleAtivoPsicologo, getEstatisticasGlobais, contarPacientesDoPsicologo, getMetricasPsicologo, atualizarTrialPsicologo, salvarAvisoGlobal, lerAvisoGlobal, obterLogsAuditoria, limparLogsAntigos } from '../services/adminService';
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
// ACTION TYPE CONFIG (labels, colors, icons)
// ==========================================
const ACTION_CONFIG = {
  // Auth
  LOGIN:                      { label: 'Login',                   icon: '🔑', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  LOGOUT:                     { label: 'Logout',                  icon: '🚪', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  // Pacientes
  CREATE_PATIENT:             { label: 'Paciente Criado',         icon: '👤', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  UPDATE_PATIENT:             { label: 'Paciente Editado',        icon: '✏️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  DELETE_PATIENT:             { label: 'Paciente Deletado',       icon: '🗑️', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  RESTORE_PATIENT:            { label: 'Paciente Restaurado',     icon: '♻️', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  VIEW_PATIENT_PROFILE:       { label: 'Prontuário Aberto',      icon: '📂', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  // Sessões
  CREATE_SESSION:             { label: 'Sessão Criada',           icon: '📝', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  UPDATE_SESSION:             { label: 'Sessão Editada',          icon: '✏️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  DELETE_SESSION:             { label: 'Sessão Deletada',         icon: '🗑️', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  SESSION_EVOLVED:            { label: 'Evolução Clínica',        icon: '📊', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  EDIT_SESSION_INLINE:        { label: 'Sessão Edit. Inline',     icon: '✏️', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  // Anamneses
  CREATE_ANAMNESIS:           { label: 'Anamnese Criada',         icon: '📋', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  UPDATE_ANAMNESIS:           { label: 'Anamnese Editada',        icon: '✏️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  DELETE_ANAMNESIS:           { label: 'Anamnese Deletada',       icon: '🗑️', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  SUBMIT_ANAMNESIS_FORM:      { label: 'Anamnese Salva (Form)',   icon: '📋', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  UPDATE_ANAMNESIS_FORM:      { label: 'Anamnese Edit. (Form)',   icon: '✏️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  SUBMIT_ANAMNESIS_ADOLESCENT:{ label: 'Anamnese Adolesc. Salva', icon: '🧒', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  UPDATE_ANAMNESIS_ADOLESCENT:{ label: 'Anamnese Adolesc. Edit.', icon: '✏️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  // Questionários & Clínicas
  CREATE_QUESTIONNAIRE:       { label: 'Questionário Criado',     icon: '📑', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  DELETE_QUESTIONNAIRE:       { label: 'Questionário Deletado',   icon: '🗑️', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  CREATE_CLINIC:              { label: 'Clínica Criada',          icon: '🏥', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  DELETE_CLINIC:              { label: 'Clínica Deletada',        icon: '🗑️', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  // Agenda
  CREATE_APPOINTMENT:         { label: 'Agendamento Criado',      icon: '📅', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  UPDATE_APPOINTMENT:         { label: 'Agendamento Editado',     icon: '✏️', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  DELETE_APPOINTMENT:         { label: 'Agendamento Deletado',    icon: '🗑️', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  SAVE_AGENDA_CONFIG:         { label: 'Config. Agenda Salva',    icon: '⚙️', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  // Finanças
  TOGGLE_PAYMENT:             { label: 'Pagamento Alternado',     icon: '💰', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  // PDF Exports
  EXPORT_PDF_EVOLUTION:       { label: 'PDF Evolução',            icon: '📄', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  EXPORT_PDF_ANAMNESIS:       { label: 'PDF Anamnese',            icon: '📄', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  EXPORT_PDF_SESSION:         { label: 'PDF Sessão',              icon: '📄', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  // Navegação & Busca
  NAVIGATE:                   { label: 'Navegação',               icon: '🧭', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  SEARCH_SELECT:              { label: 'Busca Global',            icon: '🔍', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

function ActionBadge({ type }) {
  const cfg = ACTION_CONFIG[type] || { label: type, icon: '❓', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cfg.color} whitespace-nowrap`}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function formatLogDate(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m > 0) return `${m}m ${rem}s`;
  return `${s}s`;
}

// ==========================================
// AUDITORIA TAB COMPONENT
// ==========================================
function AuditoriaTab({ logs, setLogs, isLoadingLogs, setIsLoadingLogs, logFilterType, setLogFilterType, logFilterEmail, setLogFilterEmail, expandedLogId, setExpandedLogId, isClearingLogs, setIsClearingLogs }) {
  
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await obterLogsAuditoria(500);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearOldLogs = async () => {
    if (!confirm('Deseja realmente apagar logs com mais de 30 dias?')) return;
    setIsClearingLogs(true);
    try {
      const count = await limparLogsAntigos(30);
      alert(`${count} log(s) antigo(s) removido(s).`);
      loadLogs();
    } catch (e) {
      alert('Erro ao limpar logs.');
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Unique action types for filter
  const uniqueTypes = [...new Set(logs.map(l => l.actionType))].sort();
  const uniqueEmails = [...new Set(logs.map(l => l.psicologoEmail).filter(Boolean))].sort();

  // Filtered logs
  const filtered = logs.filter(l => {
    if (logFilterType && l.actionType !== logFilterType) return false;
    if (logFilterEmail && l.psicologoEmail !== logFilterEmail) return false;
    return true;
  });

  // Stats
  const stats = {
    total: logs.length,
    hoje: logs.filter(l => {
      const d = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
      return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
    }).length,
    uniqueUsers: new Set(logs.map(l => l.psicologoEmail)).size,
    avgDuration: (() => {
      const withDuration = logs.filter(l => l.metadata?.durationMs);
      if (withDuration.length === 0) return null;
      const avg = withDuration.reduce((sum, l) => sum + l.metadata.durationMs, 0) / withDuration.length;
      return formatDuration(avg);
    })(),
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0"><span className="text-lg">📊</span></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total de Logs</p>
            </div>
          </div>
        </div>
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0"><span className="text-lg">📅</span></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.hoje}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ações Hoje</p>
            </div>
          </div>
        </div>
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0"><span className="text-lg">👥</span></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.uniqueUsers}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Usuários Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0"><span className="text-lg">⏱️</span></div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.avgDuration || '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tempo Médio (Forms)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row gap-3">
        <select
          value={logFilterType}
          onChange={(e) => setLogFilterType(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os tipos</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{ACTION_CONFIG[t]?.label || t}</option>
          ))}
        </select>
        <select
          value={logFilterEmail}
          onChange={(e) => setLogFilterEmail(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os psicólogos</option>
          {uniqueEmails.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="px-4 py-2 text-sm font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors flex items-center gap-1.5">
            <svg className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Atualizar
          </button>
          <button onClick={handleClearOldLogs} disabled={isClearingLogs} className="px-4 py-2 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {isClearingLogs ? 'Limpando...' : 'Limpar +30d'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400">
        Mostrando {filtered.length} de {logs.length} registros
        {(logFilterType || logFilterEmail) && <button onClick={() => { setLogFilterType(''); setLogFilterEmail(''); }} className="ml-2 text-indigo-400 hover:underline">Limpar filtros</button>}
      </p>

      {/* Logs List */}
      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg overflow-hidden">
        {isLoadingLogs ? (
          <div className="flex items-center justify-center p-12">
            <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <span className="text-3xl mb-2">📭</span>
            <p>Nenhum log encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filtered.map(log => {
              const isExpanded = expandedLogId === log.id;
              const meta = log.metadata || {};
              const dur = formatDuration(meta.durationMs);

              return (
                <div key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    {/* Action Badge */}
                    <div className="flex flex-col gap-2 items-start min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ActionBadge type={log.actionType} />
                        {dur && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            ⏱ {dur}
                          </span>
                        )}
                        {meta.completionRate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            📊 {meta.completionRate}
                          </span>
                        )}
                        {meta.status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.status === 'Presente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {meta.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{log.psicologoEmail || '—'}</span>
                        <span>·</span>
                        <span>{formatLogDate(log.createdAt)}</span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {/* Expanded Metadata */}
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 dark:bg-zinc-950 rounded-xl p-4 border border-slate-200 dark:border-white/5 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Metadados da Ação</p>
                        
                        {Object.keys(meta).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Sem metadados adicionais.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(meta).map(([key, val]) => (
                              <div key={key} className="flex flex-col bg-white/50 dark:bg-white/5 rounded-lg p-2.5 border border-slate-100 dark:border-white/5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{key}</span>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 break-all mt-0.5">
                                  {typeof val === 'boolean' ? (val ? '✅ Sim' : '❌ Não') : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Extra info */}
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                          <div className="flex flex-col bg-white/50 dark:bg-white/5 rounded-lg p-2.5 border border-slate-100 dark:border-white/5 flex-1 min-w-[140px]">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">UID Firebase</span>
                            <span className="text-[11px] font-mono text-slate-500 break-all mt-0.5">{log.psicologoId || '—'}</span>
                          </div>
                          {log.userAgent && (
                            <div className="flex flex-col bg-white/50 dark:bg-white/5 rounded-lg p-2.5 border border-slate-100 dark:border-white/5 flex-1 min-w-[140px]">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Navegador</span>
                              <span className="text-[11px] text-slate-500 break-all mt-0.5">{log.userAgent.slice(0, 100)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState('psicologos'); // 'psicologos' | 'comunicacao' | 'auditoria'

  // Logs (Auditoria)
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilterType, setLogFilterType] = useState('');
  const [logFilterEmail, setLogFilterEmail] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

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
    a.download = `psicologos_caritas_${new Date().toISOString().split('T')[0]}.csv`;
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Caritas — Gestão de Acessos</p>
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
          { id: 'auditoria', label: 'Auditoria / Logs', icon: '📊' },
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

        {activeTab === 'auditoria' && <AuditoriaTab
          logs={logs}
          setLogs={setLogs}
          isLoadingLogs={isLoadingLogs}
          setIsLoadingLogs={setIsLoadingLogs}
          logFilterType={logFilterType}
          setLogFilterType={setLogFilterType}
          logFilterEmail={logFilterEmail}
          setLogFilterEmail={setLogFilterEmail}
          expandedLogId={expandedLogId}
          setExpandedLogId={setExpandedLogId}
          isClearingLogs={isClearingLogs}
          setIsClearingLogs={setIsClearingLogs}
        />}
      </div>

      {/* Modal Raio-X */}
      {selectedPsi && <RaioXModal psi={selectedPsi} onClose={() => setSelectedPsi(null)} />}
    </div>
  );
}
