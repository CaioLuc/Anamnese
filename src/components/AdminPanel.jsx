import logger from '../utils/logger';
import { useState, useEffect, useMemo, useContext } from 'react';
import { listarTodosPsicologos, atualizarPlanoPsicologo, toggleAtivoPsicologo, getEstatisticasGlobais, contarPacientesDoPsicologo, getMetricasPsicologo, atualizarTrialPsicologo, salvarAvisoGlobal, lerAvisoGlobal, obterLogsAuditoria, limparLogsAntigos } from '../services/adminService';
import { logoutFirebaseUser } from '../services/authService';
import { exportarDadosCSV } from '../services/exportService';
import { processarRelatorioUsabilidade } from '../utils/usabilityAnalyzer';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { 
  Users, Activity, Bell, Download, LogOut, ShieldAlert, X,
  Search, ShieldCheck, Shield, Users as UsersIcon, FileText, Database,
  Settings, Clock, CheckCircle2, XCircle, AlertTriangle, AlertCircle, RefreshCw, Trash2, ChevronDown
} from 'lucide-react';

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
function StatCard({ label, value, colorType, icon: Icon }) {
  return (
    <div className="ds-card p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `var(--status-${colorType}-bg)`, color: `var(--status-${colorType})` }}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-heading font-extrabold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function PlanoBadge({ plano }) {
  const isPro = plano === 'profissional';
  return (
    <Badge variant={isPro ? 'warning' : 'neutral'}>
      {isPro ? '⭐ Pro' : '📋 Básico'}
    </Badge>
  );
}

function StatusBadge({ ativo }) {
  return (
    <Badge variant={ativo !== false ? 'success' : 'danger'}>
      <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: ativo !== false ? 'var(--status-success)' : 'var(--status-danger)' }}></span>
      {ativo !== false ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

function TrialBadge({ trialAte }) {
  const dias = diasAte(trialAte);
  if (dias === null) return <Badge variant="neutral">Sem trial</Badge>;
  if (dias < 0) return <Badge variant="danger">Expirado</Badge>;
  if (dias <= 7) return <Badge variant="warning">{dias}d restantes</Badge>;
  return <Badge variant="success">{dias}d restantes</Badge>;
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
      <div className="relative w-full max-w-lg rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="sticky top-0 z-10 p-6 pb-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
              {(psi.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{psi.nome || psi.email}</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{psi.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
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
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Conta criada em</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(psi.createdAt)}</p>
              {diasCriacao !== null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>({diasCriacao} dias atrás)</p>}
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Último acesso</p>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatDate(psi.lastLogin || psi.updatedAt)}</p>
              {diasUltimoLogin !== null && (
                <p className={`text-xs ${diasUltimoLogin > 10 ? 'font-bold text-red-500' : ''}`} style={diasUltimoLogin <= 10 ? { color: 'var(--text-muted)' } : {}}>
                  ({diasUltimoLogin} dias atrás){diasUltimoLogin > 10 && ' ⚠️'}
                </p>
              )}
            </div>
          </div>

          {/* Métricas */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : metricas && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>{metricas.totalPacientes}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Pacientes</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info)' }}>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--status-info)' }}>{metricas.totalSessoes}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Sessões</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning)' }}>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--status-warning)' }}>{metricas.totalAnamneses}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Anamneses</p>
              </div>
            </div>
          )}

          {/* Engajamento */}
          {metricas && metricas.totalPacientes > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Indicadores</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Média de <strong style={{ color: 'var(--accent)' }}>{(metricas.totalSessoes / metricas.totalPacientes).toFixed(1)}</strong> sessões por paciente
              </p>
            </div>
          )}

          {/* Trial / Vencimento */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gestão de Acesso / Trial</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={trialDate}
                onChange={(e) => setTrialDate(e.target.value)}
                className="ds-input flex-1"
              />
              <Button onClick={handleSaveTrial}>Salvar</Button>
            </div>
          </div>

          {/* UID (debug) */}
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>UID (Firebase)</p>
            <p className="text-xs font-mono break-all select-all" style={{ color: 'var(--text-muted)' }}>{psi.id}</p>
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
  LOGIN:                      { label: 'Login',                   icon: '🔑', color: 'success' },
  LOGOUT:                     { label: 'Logout',                  icon: '🚪', color: 'neutral' },
  // Pacientes
  CREATE_PATIENT:             { label: 'Paciente Criado',         icon: '👤', color: 'info' },
  UPDATE_PATIENT:             { label: 'Paciente Editado',        icon: '✏️', color: 'info' },
  DELETE_PATIENT:             { label: 'Paciente Deletado',       icon: '🗑️', color: 'danger' },
  RESTORE_PATIENT:            { label: 'Paciente Restaurado',     icon: '♻️', color: 'success' },
  VIEW_PATIENT_PROFILE:       { label: 'Prontuário Aberto',      icon: '📂', color: 'info' },
  // Sessões
  CREATE_SESSION:             { label: 'Sessão Criada',           icon: '📝', color: 'info' },
  UPDATE_SESSION:             { label: 'Sessão Editada',          icon: '✏️', color: 'info' },
  DELETE_SESSION:             { label: 'Sessão Deletada',         icon: '🗑️', color: 'danger' },
  SESSION_EVOLVED:            { label: 'Evolução Clínica',        icon: '📊', color: 'warning' },
  EDIT_SESSION_INLINE:        { label: 'Sessão Edit. Inline',     icon: '✏️', color: 'info' },
  // Anamneses
  CREATE_ANAMNESIS:           { label: 'Anamnese Criada',         icon: '📋', color: 'warning' },
  UPDATE_ANAMNESIS:           { label: 'Anamnese Editada',        icon: '✏️', color: 'warning' },
  DELETE_ANAMNESIS:           { label: 'Anamnese Deletada',       icon: '🗑️', color: 'danger' },
  SUBMIT_ANAMNESIS_FORM:      { label: 'Anamnese Salva (Form)',   icon: '📋', color: 'warning' },
  UPDATE_ANAMNESIS_FORM:      { label: 'Anamnese Edit. (Form)',   icon: '✏️', color: 'warning' },
  SUBMIT_ANAMNESIS_ADOLESCENT:{ label: 'Anamnese Adolesc. Salva', icon: '🧒', color: 'info' },
  UPDATE_ANAMNESIS_ADOLESCENT:{ label: 'Anamnese Adolesc. Edit.', icon: '✏️', color: 'info' },
  // Questionários & Clínicas
  CREATE_QUESTIONNAIRE:       { label: 'Questionário Criado',     icon: '📑', color: 'warning' },
  DELETE_QUESTIONNAIRE:       { label: 'Questionário Deletado',   icon: '🗑️', color: 'danger' },
  CREATE_CLINIC:              { label: 'Clínica Criada',          icon: '🏥', color: 'success' },
  DELETE_CLINIC:              { label: 'Clínica Deletada',        icon: '🗑️', color: 'danger' },
  // Agenda
  CREATE_APPOINTMENT:         { label: 'Agendamento Criado',      icon: '📅', color: 'info' },
  UPDATE_APPOINTMENT:         { label: 'Agendamento Editado',     icon: '✏️', color: 'info' },
  DELETE_APPOINTMENT:         { label: 'Agendamento Deletado',    icon: '🗑️', color: 'danger' },
  SAVE_AGENDA_CONFIG:         { label: 'Config. Agenda Salva',    icon: '⚙️', color: 'neutral' },
  // Finanças
  TOGGLE_PAYMENT:             { label: 'Pagamento Alternado',     icon: '💰', color: 'success' },
  // PDF Exports
  EXPORT_PDF_EVOLUTION:       { label: 'PDF Evolução',            icon: '📄', color: 'danger' },
  EXPORT_PDF_ANAMNESIS:       { label: 'PDF Anamnese',            icon: '📄', color: 'danger' },
  EXPORT_PDF_SESSION:         { label: 'PDF Sessão',              icon: '📄', color: 'danger' },
  // Navegação & Busca
  NAVIGATE:                   { label: 'Navegação',               icon: '🧭', color: 'neutral' },
  SEARCH_SELECT:              { label: 'Busca Global',            icon: '🔍', color: 'neutral' },
};

function ActionBadge({ type }) {
  const cfg = ACTION_CONFIG[type] || { label: type, icon: '❓', color: 'neutral' };
  return (
    <Badge variant={cfg.color}>
      <span>{cfg.icon}</span> {cfg.label}
    </Badge>
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
      const data = await obterLogsAuditoria(2000);
      setLogs(data);
    } catch (e) {
      logger.error(e);
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
      {/* DECIDE Report Card */}
      <DecideReportCard logs={logs} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total de Logs" value={stats.total} colorType="info" icon={Database} />
        <StatCard label="Ações Hoje" value={stats.hoje} colorType="success" icon={Activity} />
        <StatCard label="Usuários Ativos" value={stats.uniqueUsers} colorType="warning" icon={UsersIcon} />
        <StatCard label="Tempo Médio (Forms)" value={stats.avgDuration || '—'} colorType="danger" icon={Clock} />
      </div>

      {/* Filters */}
      <div className="ds-card p-4 flex flex-col sm:flex-row gap-3" style={{ backgroundColor: 'var(--bg-card)' }}>
        <select
          value={logFilterType}
          onChange={(e) => setLogFilterType(e.target.value)}
          className="ds-input flex-1"
        >
          <option value="">Todos os tipos</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{ACTION_CONFIG[t]?.label || t}</option>
          ))}
        </select>
        <select
          value={logFilterEmail}
          onChange={(e) => setLogFilterEmail(e.target.value)}
          className="ds-input flex-1"
        >
          <option value="">Todos os psicólogos</option>
          {uniqueEmails.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button onClick={loadLogs} variant="secondary">
            <RefreshCw size={16} className={isLoadingLogs ? 'animate-spin' : ''} /> Atualizar
          </Button>
          <Button onClick={handleClearOldLogs} disabled={isClearingLogs} variant="ghost" style={{ color: 'var(--status-danger)' }}>
            <Trash2 size={16} /> {isClearingLogs ? 'Limpando...' : 'Limpar +30d'}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Mostrando {filtered.length} de {logs.length} registros
        {(logFilterType || logFilterEmail) && <button onClick={() => { setLogFilterType(''); setLogFilterEmail(''); }} className="ml-2 hover:underline" style={{ color: 'var(--accent)' }}>Limpar filtros</button>}
      </p>

      {/* Logs List */}
      <div className="ds-card overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        {isLoadingLogs ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12" style={{ color: 'var(--text-muted)' }}>
            <Database size={48} className="mb-2 opacity-20" />
            <p>Nenhum log encontrado.</p>
          </div>
        ) : (
          <div style={{ divideColor: 'var(--border)', divideWidth: '0.5px', divideStyle: 'solid' }}>
            {filtered.map(log => {
              const isExpanded = expandedLogId === log.id;
              const meta = log.metadata || {};
              const dur = formatDuration(meta.durationMs);

              return (
                <div key={log.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    {/* Action Badge */}
                    <div className="flex flex-col gap-2 items-start min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ActionBadge type={log.actionType} />
                        {dur && (
                          <Badge variant="warning">⏱ {dur}</Badge>
                        )}
                        {meta.completionRate && (
                          <Badge variant="info">📊 {meta.completionRate}</Badge>
                        )}
                        {meta.status && (
                          <Badge variant={meta.status === 'Presente' ? 'success' : 'danger'}>{meta.status}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{log.psicologoEmail || '—'}</span>
                        <span>·</span>
                        <span>{formatLogDate(log.createdAt)}</span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <ChevronDown size={16} className={`transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  {/* Expanded Metadata */}
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-in fade-in duration-150">
                      <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Metadados da Ação</p>
                        
                        {Object.keys(meta).length === 0 ? (
                          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Sem metadados adicionais.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(meta).map(([key, val]) => (
                              <div key={key} className="flex flex-col rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{key}</span>
                                <span className="text-sm font-medium break-all mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                  {typeof val === 'boolean' ? (val ? '✅ Sim' : '❌ Não') : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Extra info */}
                        <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--border)' }}>
                          <div className="flex flex-col rounded-lg p-2.5 flex-1 min-w-[140px]" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>UID Firebase</span>
                            <span className="text-[11px] font-mono break-all mt-0.5" style={{ color: 'var(--text-secondary)' }}>{log.psicologoId || '—'}</span>
                          </div>
                          {log.userAgent && (
                            <div className="flex flex-col rounded-lg p-2.5 flex-1 min-w-[140px]" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Navegador</span>
                              <span className="text-[11px] break-all mt-0.5" style={{ color: 'var(--text-secondary)' }}>{log.userAgent.slice(0, 100)}...</span>
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
// DECIDE REPORT COMPONENT
// ==========================================
function DecideReportCard({ logs }) {
  const [emailPattern, setEmailPattern] = useState('@teste.com');
  const [preview, setPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePreview = () => {
    if (!logs || logs.length === 0) return;
    const result = processarRelatorioUsabilidade(logs, emailPattern);
    setPreview(result);
  };

  const handleDownloadZip = async () => {
    if (!preview || preview.csvs.length === 0) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const folder = zip.folder('relatorio_usabilidade_decide');
      preview.csvs.forEach(csv => {
        folder.file(csv.name, csv.content);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_decide_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      logger.error('Erro ao gerar ZIP:', e);
      alert('Erro ao gerar arquivo ZIP.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSingleCSV = (csv) => {
    const blob = new Blob([csv.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csv.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ds-card overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '2px solid var(--accent)' }}>
      {/* Header */}
      <div className="p-5 flex items-start gap-4" style={{ background: 'linear-gradient(135deg, var(--accent-light), var(--bg-card))' }}>
        <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-heading font-extrabold" style={{ color: 'var(--text-primary)' }}>📊 Relatório de Usabilidade — Framework DECIDE</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Gera 6 planilhas CSV completas para análise acadêmica dos testes de usabilidade com os participantes.</p>
        </div>
      </div>

      {/* Config */}
      <div className="p-5 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Filtro de e-mail dos participantes</label>
            <input
              type="text"
              value={emailPattern}
              onChange={e => setEmailPattern(e.target.value)}
              placeholder="@teste.com"
              className="ds-input"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handlePreview} variant="secondary">
              🔍 Pré-visualizar
            </Button>
          </div>
        </div>

        {/* Preview Stats */}
        {preview && preview.stats.total > 0 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Participantes', value: preview.stats.total, color: 'info' },
                { label: 'Total de Logs', value: preview.stats.totalLogs, color: 'neutral' },
                { label: '100% Sucesso', value: preview.stats.completaramTodas, color: 'success' },
                { label: 'Taxa Média', value: `${preview.stats.taxaMediaSucesso}%`, color: 'warning' },
                { label: 'Tempo Médio', value: `${preview.stats.tempoMedioMin} min`, color: 'danger' },
                { label: 'Erros/Retrabalho', value: preview.stats.totalErros, color: 'danger' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: `var(--status-${s.color}-bg)`, border: `1px solid var(--status-${s.color})` }}>
                  <p className="text-xl font-extrabold" style={{ color: `var(--status-${s.color})` }}>{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* CSV List */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Planilhas incluídas no relatório:</p>
              </div>
              {preview.csvs.map((csv, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderTop: '0.5px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📄</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{csv.name}</span>
                  </div>
                  <button
                    onClick={() => handleDownloadSingleCSV(csv)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
                  >
                    ⬇ Baixar
                  </button>
                </div>
              ))}
            </div>

            {/* Download All */}
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              {isDownloading ? (
                <><RefreshCw size={16} className="animate-spin" /> Gerando ZIP...</>
              ) : (
                <>📦 Baixar Relatório Completo (ZIP com {preview.csvs.length} planilhas)</>
              )}
            </button>
          </div>
        )}

        {preview && preview.stats.total === 0 && (
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--status-warning-bg)', border: '1px solid var(--status-warning)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--status-warning-text)' }}>
              ⚠️ Nenhum participante encontrado com o padrão "{emailPattern}". Verifique o filtro.
            </p>
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
  const { showToast } = useToast();
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
  const [isExporting, setIsExporting] = useState(false);

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
      logger.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePlano = async (uid, plano) => {
    setActionLoading(uid);
    try { await atualizarPlanoPsicologo(uid, plano); await loadData(); } catch (e) { logger.error(e); } finally { setActionLoading(null); }
  };

  const handleToggleAtivo = async (uid, currentStatus) => {
    setActionLoading(uid);
    try { await toggleAtivoPsicologo(uid, currentStatus === false); await loadData(); } catch (e) { logger.error(e); } finally { setActionLoading(null); }
  };

  const handleSalvarAviso = async () => {
    setAvisoSaving(true);
    try { 
      await salvarAvisoGlobal(avisoGlobal); 
      showToast('Aviso salvo!', 'O aviso global foi publicado com sucesso.', 'success');
    } catch (e) { 
      logger.error(e); 
      showToast('Erro ao Salvar', 'Você não tem permissão para isso ou houve falha na rede.', 'error');
    } finally { 
      setAvisoSaving(false); 
    }
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
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-extrabold" style={{ color: 'var(--text-primary)' }}>Painel Administrativo</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Caritas — Gestão de Acessos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="secondary" size="sm" className="hidden sm:flex">
            <Download size={14} /> Psicólogos (CSV)
          </Button>
          <Button 
            onClick={async () => {
              if (isExporting) return;
              setIsExporting(true);
              try {
                const result = await exportarDadosCSV();
                if (showToast) showToast({ type: 'success', message: `Exportados ${result.pacientes} pacientes, ${result.sessoes} sessões e ${result.anamneses} anamneses.` });
              } catch (err) {
                logger.error('Erro na exportação:', err);
                if (showToast) showToast({ type: 'error', message: 'Erro ao exportar dados.' });
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting}
            variant="secondary"
            size="sm"
            className="hidden sm:flex"
          >
            <Download size={14} /> {isExporting ? 'Exportando...' : 'Dados Clínicos (CSV)'}
          </Button>
          <Button onClick={() => logoutFirebaseUser()} variant="ghost" size="sm" style={{ color: 'var(--status-danger)' }}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 shrink-0" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'psicologos', label: 'Psicólogos', icon: Users },
          { id: 'auditoria', label: 'Auditoria / Logs', icon: Database },
          { id: 'comunicacao', label: 'Comunicação', icon: Bell },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2`}
            style={{ 
                borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

        {activeTab === 'psicologos' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total" value={stats.total} colorType="info" icon={Users} />
              <StatCard label="Ativos" value={stats.ativos} colorType="success" icon={CheckCircle2} />
              <StatCard label="Inativos" value={stats.inativos} colorType="danger" icon={XCircle} />
              <StatCard label="Plano Básico" value={stats.basicos} colorType="neutral" icon={FileText} />
              <StatCard label="Plano Pro" value={stats.profissionais} colorType="warning" icon={ShieldCheck} />
            </div>

            {/* Search */}
            <div className="ds-card p-4" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="ds-input pl-10" />
              </div>
            </div>

            {/* Table */}
            <div className="ds-card overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                <h3 className="font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Psicólogos Cadastrados</h3>
                <Button variant="ghost" size="sm" onClick={loadData}>
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Atualizar
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12" style={{ color: 'var(--text-muted)' }}><p>Nenhum psicólogo encontrado.</p></div>
              ) : (
                <div style={{ divideColor: 'var(--border)', divideWidth: '0.5px', divideStyle: 'solid' }}>
                  {filtered.map(psi => {
                    const diasLogin = diasDesde(psi.lastLogin || psi.updatedAt);
                    return (
                      <div key={psi.id} className="p-5 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setSelectedPsi(psi)} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
                              {(psi.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{psi.nome || psi.email || psi.id}</p>
                              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{psi.email || 'E-mail não registrado'}</p>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <PlanoBadge plano={psi.plano} />
                            <StatusBadge ativo={psi.ativo} />
                            <TrialBadge trialAte={psi.trialAte} />
                            <Badge variant="neutral">{pacienteCounts[psi.id] !== undefined ? `${pacienteCounts[psi.id]} pac.` : '...'}</Badge>
                            {diasLogin !== null && (
                              <Badge variant={diasLogin > 10 ? 'danger' : 'neutral'}>
                                {diasLogin === 0 ? 'Hoje' : diasLogin === 1 ? 'Ontem' : `${diasLogin}d atrás`}
                              </Badge>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                            {actionLoading === psi.id ? (
                              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
                            ) : (
                              <>
                                {(!psi.plano || psi.plano === 'basico') ? (
                                  <Button size="sm" variant="secondary" onClick={() => handlePlano(psi.id, 'profissional')} title="Promover para Profissional">⭐ Pro</Button>
                                ) : (
                                  <Button size="sm" variant="secondary" onClick={() => handlePlano(psi.id, 'basico')} title="Rebaixar para Básico">📋 Basic</Button>
                                )}
                                <Button size="sm" variant={psi.ativo !== false ? 'secondary' : 'primary'} onClick={() => handleToggleAtivo(psi.id, psi.ativo)} title={psi.ativo !== false ? 'Desativar' : 'Ativar'}>
                                  {psi.ativo !== false ? '🔒 Desativar' : '🔓 Ativar'}
                                </Button>
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
            <div className="ds-card p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div>
                <h3 className="font-heading font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Bell size={20} style={{ color: 'var(--accent)' }} /> Aviso Global
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Esta mensagem aparecerá como banner no topo do Dashboard de todos os psicólogos. Deixe vazio para desativar.</p>
              </div>
              <textarea
                value={avisoGlobal}
                onChange={(e) => setAvisoGlobal(e.target.value)}
                rows={3}
                className="ds-input resize-none"
                placeholder="Ex: Manutenção programada para domingo às 22h. O sistema ficará indisponível por 30 minutos."
              />
              <div className="flex justify-between items-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{avisoGlobal ? `${avisoGlobal.length} caracteres` : 'Aviso desativado'}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setAvisoGlobal(''); handleSalvarAviso(); }}>Limpar</Button>
                  <Button onClick={handleSalvarAviso} disabled={avisoSaving}>
                    {avisoSaving ? 'Salvando...' : 'Publicar Aviso'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {avisoGlobal && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Prévia do aviso:</p>
                <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--status-info-bg)', border: '1px solid var(--status-info)' }}>
                  <Bell size={20} className="shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--status-info)' }}>{avisoGlobal}</p>
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
