import { useState, useEffect } from 'react';
import { lerTodasSessoes, atualizarSessao } from '../services/patientService';

const PERIODOS = [
  { id: 'mes', label: 'Mês Atual' },
  { id: 'semana', label: 'Semana' },
  { id: 'semestre', label: 'Últimos 6 Meses' },
  { id: 'ano', label: 'Este Ano' },
];

function parseDate(d) {
  if (!d) return null;
  if (d.toDate) return d.toDate();
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const [y, m, d_part] = d.split('-');
    if (y && m && d_part) return new Date(+y, +m - 1, +d_part);
    return new Date(d);
  }
  return null;
}

function getRange(periodo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start, end;
  end = new Date(today); end.setHours(23, 59, 59, 999);

  if (periodo === 'semana') {
    start = new Date(today); start.setDate(today.getDate() - today.getDay());
  } else if (periodo === 'mes') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (periodo === 'semestre') {
    start = new Date(today); start.setMonth(today.getMonth() - 5);
    start.setDate(1);
  } else if (periodo === 'ano') {
    start = new Date(today.getFullYear(), 0, 1);
  }
  return { start, end };
}

function FinCard({ label, value, type, icon }) {
  const styles = {
    total: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-500 dark:text-indigo-400', iconBg: 'bg-indigo-500/20', iconText: 'text-indigo-500 dark:text-indigo-300' },
    pago: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-300' },
    pendente: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-300' }
  };
  const s = styles[type] || styles.total;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-6 flex flex-col gap-4 group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{label}</span>
        <div className={`p-2.5 rounded-xl ${s.iconBg} ${s.iconText}`}>{icon}</div>
      </div>
      <div className={`text-4xl font-black tracking-tight ${s.text}`}>
        <span className="text-2xl mr-1">R$</span>{value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function Financas({ patients, isLoadingPatients }) {
  const [periodo, setPeriodo] = useState('mes');
  const [sessoes, setSessoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadFinancas();
  }, []);

  const loadFinancas = async () => {
    setIsLoading(true);
    try {
      const data = await lerTodasSessoes();
      const activeIds = new Set(patients.map(p => p.id));
      setSessoes(data.filter(s => activeIds.has(s.id_paciente)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePago = async (sessao) => {
    setUpdatingId(sessao.id);
    try {
      const novoStatus = !sessao.pago;
      // Se estiver marcando como pago e não tem forma de pgto, define um default
      const att = { pago: novoStatus };
      if (novoStatus && !sessao.forma_pagamento) {
        att.forma_pagamento = 'Pix';
      } else if (!novoStatus) {
        att.forma_pagamento = '';
      }
      
      await atualizarSessao(sessao.id, att);
      
      // Update local state
      setSessoes(prev => prev.map(s => s.id === sessao.id ? { ...s, ...att } : s));
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const { start, end } = getRange(periodo);
  
  const sessoesPeriodo = sessoes.filter(s => {
    let d = parseDate(s.data_sessao);
    if (!d) return false;
    return d >= start && d <= end;
  });

  const previsaoTotal = sessoesPeriodo.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  const valorRecebido = sessoesPeriodo.filter(s => s.pago).reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  const valorPendente = previsaoTotal - valorRecebido;

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-10 space-y-8">
      
      {/* Header & Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financeiro</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Controle de faturamento, receitas e inadimplências.</p>
        </div>
        <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-1.5 flex items-center shadow-sm">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                periodo === p.id
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinCard 
          label="Previsão Geral" 
          value={previsaoTotal} 
          type="total" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <FinCard 
          label="Valor Recebido" 
          value={valorRecebido} 
          type="pago" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <FinCard 
          label="Inadimplência / A Receber" 
          value={valorPendente} 
          type="pendente" 
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Lista de Faturamentos */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-black/10">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Histórico Mapeado ({sessoesPeriodo.length} sessões)
          </h3>
        </div>
        
        {isLoading || isLoadingPatients ? (
          <div className="flex items-center justify-center py-16">
             <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : sessoesPeriodo.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
             Nenhuma sessão com valor mapeada no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-zinc-950/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Data</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Paciente</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Valor (R$)</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {sessoesPeriodo.sort((a,b) => new Date(b.data_sessao) - new Date(a.data_sessao)).map(s => {
                  const p = patients.find(pt => pt.id === s.id_paciente);
                  const isUpdating = updatingId === s.id;
                  const valorFormatado = s.valor ? parseFloat(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00';
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {s.data_sessao.split('-').reverse().join('/')}
                      </td>
                      <td className="px-6 py-4 text-slate-800 dark:text-slate-200 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xs font-bold ring-1 ring-indigo-500/20">
                             {p ? p.nome.charAt(0).toUpperCase() : '?'}
                           </div>
                           {p?.nome || <span className="italic text-slate-400">Paciente removido</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {valorFormatado}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          s.pago 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.pago ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}></div>
                          {s.pago ? (s.forma_pagamento || 'Pago') : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePago(s)}
                          disabled={isUpdating}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            s.pago 
                            ? 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5' 
                            : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white hover:border-transparent'
                          } disabled:opacity-50`}
                        >
                          {isUpdating ? '...' : (s.pago ? 'Desfazer' : 'Dar Baixa')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
