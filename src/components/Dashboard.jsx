import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { lerTodasSessoes, lerTodasAnamneses } from '../services/patientService';
import { lerAvisoGlobal } from '../services/adminService';
import { useToast } from '../contexts/ToastContext';
import { UserPlus, FileText, Calendar, ClipboardList, Users, BarChart3, CheckCircle, X, Info } from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────
function parseDate(d) {
  if (!d) return null;
  if (d.toDate) return d.toDate();
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const [y, m, day] = d.split('-');
    if (y && m && day) return new Date(+y, +m - 1, +day);
    return new Date(d);
  }
  return null;
}

// ── Sub-components ───────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="ds-card flex flex-col items-center gap-3 p-5 sm:p-6 w-full transition-all duration-150 hover:border-[var(--accent)]"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <Icon size={24} style={{ color: 'var(--accent)' }} />
      <span className="text-sm font-medium text-center leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="ds-card p-5 sm:p-6 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={18} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="text-3xl sm:text-2xl font-heading font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function DashboardSummary({ patients, isLoading, onNavigate }) {
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [filtro, setFiltro] = useState('mes');
  const [avisoGlobal, setAvisoGlobal] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      setIsLoadingStats(true);
      try {
        const [s, a] = await Promise.all([lerTodasSessoes(), lerTodasAnamneses()]);
        const activeIds = new Set(patients.map(p => p.id));
        setSessoes(s.filter(sessao => activeIds.has(sessao.id_paciente)));
        setAnamneses(a.filter(ana => activeIds.has(ana.id_paciente)));
      } catch (e) {
        logger.error(e);
        showToast({ type: 'error', message: 'Não foi possível carregar os dados do dashboard. Verifique sua conexão.' });
      } finally {
        setIsLoadingStats(false);
      }
    }
    load();
    // Carregar aviso global
    lerAvisoGlobal().then(a => { if (a.ativo && a.mensagem) setAvisoGlobal(a.mensagem); }).catch(() => {});
  }, [patients]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString().slice(0, 10);

  // Sessões de hoje
  const sessoesHoje = sessoes.filter(s => s.data_sessao === todayStr);

  // Filtro de período
  let periodoStart, periodoEnd, periodoLabel;
  if (filtro === 'semana') {
    const dayOfWeek = now.getDay();
    periodoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    periodoEnd = new Date(periodoStart.getFullYear(), periodoStart.getMonth(), periodoStart.getDate() + 6, 23, 59, 59);
    periodoLabel = 'Semana';
  } else if (filtro === 'ano') {
    periodoStart = new Date(now.getFullYear(), 0, 1);
    periodoEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    periodoLabel = 'Ano';
  } else {
    periodoStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodoEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodoLabel = 'Mês';
  }

  const sessoesPeriodo = sessoes.filter(s => {
    const d = parseDate(s.data_sessao);
    return d && d >= periodoStart && d <= periodoEnd;
  });

  const presentesPeriodo = sessoesPeriodo.filter(s => s.status === 'Presente').length;
  const faltasPeriodo = sessoesPeriodo.filter(s => s.status === 'Faltou').length;

  // Pacientes mais recentes (últimos 5 cadastrados)
  const recentPatients = [...patients]
    .sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db - da;
    })
    .slice(0, 5);

  // Saudação dinâmica
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dayLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const Spinner = () => (
    <div className="flex items-center justify-center py-8">
      <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-10">

      {/* Aviso Global do Admin */}
      {avisoGlobal && (
        <div className="ds-card p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--status-info-bg)', borderColor: 'var(--status-info)' }}>
          <Info size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--status-info)' }} />
          <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--status-info-text)' }}>{avisoGlobal}</p>
          <button onClick={() => setAvisoGlobal('')} className="shrink-0 ml-auto transition-colors duration-150" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Saudação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {greeting}!
          </h2>
          <p className="mt-1 text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{dayLabel}</p>
        </div>
        {sessoesHoje.length > 0 && (
          <div className="ds-badge">
            <Calendar size={14} />
            <span className="text-sm font-medium">
              {sessoesHoje.length} sessão{sessoesHoje.length > 1 ? 'ões' : ''} registrada{sessoesHoje.length > 1 ? 's' : ''} hoje
            </span>
          </div>
        )}
      </div>

      {/* Atalhos Rápidos */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={UserPlus} label="Novo Paciente" onClick={() => onNavigate && onNavigate('pacientes', { addPatient: true })} />
          <QuickAction icon={FileText} label="Registrar Sessão" onClick={() => onNavigate && onNavigate('nova-sessao')} />
          <QuickAction icon={Calendar} label="Ver Agenda" onClick={() => onNavigate && onNavigate('agenda')} />
          <QuickAction icon={ClipboardList} label="Questionários" onClick={() => onNavigate && onNavigate('questionarios')} />
        </div>
      </div>

      {/* KPIs do Período */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Resumo do Período</h3>
          <div className="flex rounded-md p-0.5" style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
            {[{id:'semana',label:'Semana'},{id:'mes',label:'Mês'},{id:'ano',label:'Ano'}].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className="px-3 py-1 text-xs font-medium rounded transition-all duration-150"
                style={filtro === f.id 
                  ? { backgroundColor: 'var(--accent)', color: '#FFFFFF' } 
                  : { color: 'var(--text-secondary)' }
                }
              >{f.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Pacientes"
            value={isLoading ? '...' : patients.length}
            icon={Users}
            sub="Total ativo"
          />
          <StatCard
            label={`Sessões (${periodoLabel})`}
            value={isLoadingStats ? '...' : sessoesPeriodo.length}
            icon={FileText}
            sub={`${presentesPeriodo} presentes · ${faltasPeriodo} faltas`}
          />
          <StatCard
            label="Anamneses"
            value={isLoadingStats ? '...' : anamneses.length}
            icon={ClipboardList}
            sub="Total preenchidas"
          />
          <StatCard
            label="Taxa de Presença"
            value={isLoadingStats || sessoesPeriodo.length === 0 ? '—' : `${Math.round((presentesPeriodo / sessoesPeriodo.length) * 100)}%`}
            icon={CheckCircle}
            sub={`Este ${periodoLabel.toLowerCase()}`}
          />
        </div>
      </div>

      {/* Linha inferior: Pacientes recentes + Sessões de Hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pacientes Recentes */}
        <div className="ds-card overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <h3 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pacientes Recentes</h3>
            <button
              onClick={() => onNavigate && onNavigate('pacientes')}
              className="text-xs font-medium transition-colors duration-150"
              style={{ color: 'var(--accent)' }}
            >
              Ver todos
            </button>
          </div>
          {isLoading ? (
            <Spinner />
          ) : recentPatients.length === 0 ? (
            <div className="py-10 text-center">
              <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum paciente cadastrado ainda.</p>
              <button
                onClick={() => onNavigate && onNavigate('pacientes')}
                className="mt-3 text-xs transition-colors duration-150"
                style={{ color: 'var(--accent)' }}
              >
                Cadastrar agora
              </button>
            </div>
          ) : (
            <ul>
              {recentPatients.map(p => {
                const sessoesDoPaciente = sessoes.filter(s => s.id_paciente === p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3 transition-colors duration-150" style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
                      {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.nome}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {sessoesDoPaciente.length} sessão{sessoesDoPaciente.length !== 1 ? 'ões' : ''} registrada{sessoesDoPaciente.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {p.data_nascimento ? `${new Date().getFullYear() - new Date((p.data_nascimento || '').includes('T') ? p.data_nascimento : p.data_nascimento + 'T12:00:00').getFullYear()} anos` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sessões de Hoje */}
        <div className="ds-card overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '0.5px solid var(--border)' }}>
            <h3 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Sessões Hoje</h3>
            <span className="ds-badge text-xs">
              {todayStr.split('-').reverse().join('/')}
            </span>
          </div>
          {isLoadingStats ? (
            <Spinner />
          ) : sessoesHoje.length === 0 ? (
            <div className="py-10 text-center">
              <Calendar size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma sessão registrada para hoje.</p>
              <button
                onClick={() => onNavigate && onNavigate('nova-sessao')}
                className="mt-3 text-xs transition-colors duration-150"
                style={{ color: 'var(--accent)' }}
              >
                Registrar sessão
              </button>
            </div>
          ) : (
            <ul>
              {sessoesHoje.slice(0, 6).map(s => {
                const p = patients.find(pt => pt.id === s.id_paciente);
                const statusStyle = s.status === 'Presente' 
                  ? { backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success-text)' }
                  : s.status === 'Faltou' 
                  ? { backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }
                  : { backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' };
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {p?.nome || <span className="italic" style={{ color: 'var(--text-muted)' }}>Paciente removido</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.observacoes || 'Sem observações'}</p>
                    </div>
                    <span className="ds-badge text-xs flex-shrink-0" style={statusStyle}>
                      {s.status || '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}
