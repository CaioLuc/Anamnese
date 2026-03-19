import { useState, useEffect } from 'react';
import { lerTodasSessoes, lerTodasAnamneses } from '../services/patientService';

const PERIODOS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'semestre', label: 'Semestre' },
  { id: 'ano', label: 'Ano' },
  { id: 'personalizado', label: 'Personalizado' },
];

function parseDate(d) {
  if (!d) return null;
  // Firebase Timestamp
  if (d.toDate) return d.toDate();
  // Native Date object
  if (d instanceof Date) return d;
  // String format (likely YYYY-MM-DD)
  if (typeof d === 'string') {
    const [y, m, d_part] = d.split('-');
    if (y && m && d_part) return new Date(+y, +m - 1, +d_part);
    return new Date(d); // Fallback for other string formats
  }
  return null;
}

function getRange(periodo, customStart, customEnd) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start, end;
  end = new Date(today); end.setHours(23, 59, 59, 999);

  if (periodo === 'semana') {
    start = new Date(today); start.setDate(today.getDate() - today.getDay());
  } else if (periodo === 'mes') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (periodo === 'semestre') {
    const semStart = today.getMonth() < 6 ? 0 : 6;
    start = new Date(today.getFullYear(), semStart, 1);
  } else if (periodo === 'ano') {
    start = new Date(today.getFullYear(), 0, 1);
  } else if (periodo === 'personalizado') {
    start = customStart ? parseDate(customStart) : new Date(today.getFullYear(), 0, 1);
    end = customEnd ? parseDate(customEnd) : today;
    if (end) { end.setHours(23, 59, 59, 999); }
  }
  return { start, end };
}

function filterByRange(items, dateField, start, end) {
  return items.filter(item => {
    let d = parseDate(item[dateField]);
    if (!d) return false;
    return d >= start && d <= end;
  });
}

function StatCard({ label, value, icon, color, sub }) {
  const colors = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', icon: 'text-indigo-300' },
    cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   icon: 'text-cyan-300' },
    emerald:{ bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',text: 'text-emerald-400',icon: 'text-emerald-300' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', icon: 'text-violet-300' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  icon: 'text-amber-300' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg} ${c.icon}`}>{icon}</div>
      </div>
      <div className={`text-4xl font-extrabold ${c.text}`}>{value}</div>
      {sub && <div className="text-xs text-slate-600 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

export default function DashboardSummary({ patients, isLoading }) {
  const [periodo, setPeriodo] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoadingStats(true);
      try {
        const [s, a] = await Promise.all([lerTodasSessoes(), lerTodasAnamneses()]);
        setSessoes(s);
        setAnamneses(a);
      } catch (e) { console.error(e); }
      finally { setIsLoadingStats(false); }
    }
    load();
  }, []);

  const { start, end } = getRange(periodo, customStart, customEnd);

  const sessoesPeriodo = filterByRange(sessoes, 'data_sessao', start, end);
  const anamnesesPeriodo = filterByRange(anamneses, 'createdAt', start, end);

  const presentes = sessoesPeriodo.filter(s => s.status === 'Presente').length;
  const faltou = sessoesPeriodo.filter(s => s.status === 'Faltou').length;
  const adultos = anamnesesPeriodo.filter(a => a.tipo !== 'adolescente').length;
  const adolescentes = anamnesesPeriodo.filter(a => a.tipo === 'adolescente').length;

  const now = new Date();
  const periodoLabel = PERIODOS.find(p => p.id === periodo)?.label || '';

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Visão geral do consultório — {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mr-2">Período:</span>
        {PERIODOS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
              periodo === p.id
                ? 'bg-indigo-500 text-slate-900 dark:text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 dark:text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:border-indigo-500/50 hover:text-slate-900 dark:hover:text-white bg-transparent'
            }`}
          >
            {p.label}
          </button>
        ))}
        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-slate-600 dark:text-slate-400 text-xs">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-sm bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        )}
      </div>

      {/* KPIs - Linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total de Pacientes"
          value={isLoading ? '...' : patients.length}
          color="indigo"
          sub="Todos os pacientes cadastrados"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label={`Evoluções (${periodoLabel})`}
          value={isLoadingStats ? '...' : sessoesPeriodo.length}
          color="cyan"
          sub={`${presentes} presentes · ${faltou} faltas`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label={`Anamneses (${periodoLabel})`}
          value={isLoadingStats ? '...' : anamnesesPeriodo.length}
          color="emerald"
          sub={`${adultos} adultos · ${adolescentes} adolescentes`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="Total de Evoluções"
          value={isLoadingStats ? '...' : sessoes.length}
          color="violet"
          sub="Total histórico de sessões"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      {/* KPIs - Linha 2: Presença e Detalhes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={`Presenças (${periodoLabel})`}
          value={isLoadingStats ? '...' : presentes}
          color="emerald"
          sub={sessoesPeriodo.length > 0 ? `${Math.round((presentes / sessoesPeriodo.length) * 100)}% de comparecimento` : 'Nenhuma sessão'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label={`Faltas (${periodoLabel})`}
          value={isLoadingStats ? '...' : faltou}
          color="amber"
          sub={sessoesPeriodo.length > 0 ? `${Math.round((faltou / sessoesPeriodo.length) * 100)}% de ausência` : 'Nenhuma sessão'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total de Anamneses"
          value={isLoadingStats ? '...' : anamneses.length}
          color="indigo"
          sub={`${anamneses.filter(a => a.tipo !== 'adolescente').length} adultos · ${anamneses.filter(a => a.tipo === 'adolescente').length} adolescentes`}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
      </div>

      {/* Tabela de Sessões recentes */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Evoluções do período</h3>
          <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">{sessoesPeriodo.length} registros</span>
        </div>
        {isLoadingStats ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-7 h-7 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : sessoesPeriodo.length === 0 ? (
          <div className="py-12 text-center text-slate-600 dark:text-slate-400 text-sm">Nenhuma evolução encontrada no período selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Paciente</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 hidden md:table-cell">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessoesPeriodo.slice(0, 15).map(s => {
                  const p = patients.find(pt => pt.id === s.id_paciente);
                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {s.data_sessao ? s.data_sessao.split('-').reverse().join('/') : '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                            {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          {p?.nome || <span className="text-slate-600 italic">Paciente removido</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          s.status === 'Presente' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          s.status === 'Faltou' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>{s.status || '—'}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell max-w-xs truncate">
                        {s.observacoes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sessoesPeriodo.length > 15 && (
              <div className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 text-center">
                Mostrando 15 de {sessoesPeriodo.length} registros. Exporte o PDF ou filtre por data para ver mais.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
