import { useState, useEffect } from 'react';
import { lerTodasSessoes, lerTodasAnamneses } from '../services/patientService';
import { lerAvisoGlobal } from '../services/adminService';
import { useToast } from '../contexts/ToastContext';

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

function QuickAction({ icon, label, color, onClick }) {
  const colors = {
    indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:border-indigo-500/50 hover:from-indigo-500/30',
    cyan:   'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/50 hover:from-cyan-500/30',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400 hover:border-violet-500/50 hover:from-violet-500/30',
    emerald:'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50 hover:from-emerald-500/30',
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl border bg-gradient-to-br ${colors[color]} transition-all duration-200 hover:scale-[1.03] hover:shadow-lg w-full`}
    >
      <div className="text-4xl sm:text-3xl">{icon}</div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
    cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400' },
    emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-5 sm:p-6 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`text-2xl sm:text-xl ${c.text}`}>{icon}</span>
      </div>
      <div className={`text-4xl sm:text-3xl font-extrabold ${c.text}`}>{value}</div>
      {sub && <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
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
        console.error(e);
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

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-6xl mx-auto space-y-6 pb-10">

      {/* Aviso Global do Admin */}
      {avisoGlobal && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5">📢</span>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">{avisoGlobal}</p>
          <button onClick={() => setAvisoGlobal('')} className="shrink-0 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Saudação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {greeting}! 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 capitalize">{dayLabel}</p>
        </div>
        {sessoesHoje.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <span className="text-indigo-400 text-lg">📅</span>
            <span className="text-sm font-semibold text-indigo-400">
              {sessoesHoje.length} sessão{sessoesHoje.length > 1 ? 'ões' : ''} registrada{sessoesHoje.length > 1 ? 's' : ''} hoje
            </span>
          </div>
        )}
      </div>

      {/* Atalhos Rápidos */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Ações Rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon="👤" label="Novo Paciente" color="indigo" onClick={() => onNavigate && onNavigate('pacientes')} />
          <QuickAction icon="📝" label="Registrar Sessão" color="cyan" onClick={() => onNavigate && onNavigate('nova-sessao')} />
          <QuickAction icon="📅" label="Ver Agenda" color="violet" onClick={() => onNavigate && onNavigate('agenda')} />
          <QuickAction icon="📋" label="Questionários" color="emerald" onClick={() => onNavigate && onNavigate('questionarios')} />
        </div>
      </div>

      {/* KPIs do Período */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resumo do Período</h3>
          <div className="flex bg-slate-200 dark:bg-zinc-800 rounded-lg p-0.5">
            {[{id:'semana',label:'Semana'},{id:'mes',label:'Mês'},{id:'ano',label:'Ano'}].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filtro === f.id ? 'bg-indigo-500 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >{f.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Pacientes"
            value={isLoading ? '…' : patients.length}
            icon="👥"
            color="indigo"
            sub="Total ativo"
          />
          <StatCard
            label={`Sessões (${periodoLabel})`}
            value={isLoadingStats ? '…' : sessoesPeriodo.length}
            icon="📝"
            color="cyan"
            sub={`${presentesPeriodo} presentes · ${faltasPeriodo} faltas`}
          />
          <StatCard
            label="Anamneses"
            value={isLoadingStats ? '…' : anamneses.length}
            icon="📋"
            color="violet"
            sub="Total preenchidas"
          />
          <StatCard
            label="Taxa de Presença"
            value={isLoadingStats || sessoesPeriodo.length === 0 ? '—' : `${Math.round((presentesPeriodo / sessoesPeriodo.length) * 100)}%`}
            icon="✅"
            color="emerald"
            sub={`Este ${periodoLabel.toLowerCase()}`}
          />
        </div>
      </div>

      {/* Linha inferior: Pacientes recentes + Sessões de Hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pacientes Recentes */}
        <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Pacientes Recentes</h3>
            <button
              onClick={() => onNavigate && onNavigate('pacientes')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Ver todos →
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : recentPatients.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">🧑‍⚕️</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum paciente cadastrado ainda.</p>
              <button
                onClick={() => onNavigate && onNavigate('pacientes')}
                className="mt-3 text-xs text-indigo-400 hover:underline"
              >
                Cadastrar agora →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {recentPatients.map(p => {
                const sessoesDoPaciente = sessoes.filter(s => s.id_paciente === p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {p.nome?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{p.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sessoesDoPaciente.length} sessão{sessoesDoPaciente.length !== 1 ? 'ões' : ''} registrada{sessoesDoPaciente.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {p.data_nascimento ? `${new Date().getFullYear() - new Date((p.data_nascimento || '').includes('T') ? p.data_nascimento : p.data_nascimento + 'T12:00:00').getFullYear()} anos` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Sessões de Hoje */}
        <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sessões Hoje</h3>
            <span className="text-xs bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full">
              {todayStr.split('-').reverse().join('/')}
            </span>
          </div>
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : sessoesHoje.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">☕</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma sessão registrada para hoje.</p>
              <button
                onClick={() => onNavigate && onNavigate('nova-sessao')}
                className="mt-3 text-xs text-cyan-400 hover:underline"
              >
                Registrar sessão →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {sessoesHoje.slice(0, 6).map(s => {
                const p = patients.find(pt => pt.id === s.id_paciente);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold text-sm flex-shrink-0">
                      {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {p?.nome || <span className="italic text-slate-400">Paciente removido</span>}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.observacoes || 'Sem observações'}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      s.status === 'Presente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      s.status === 'Faltou' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
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
