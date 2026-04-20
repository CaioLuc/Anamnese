import { useState, useEffect, useMemo, useCallback } from 'react';
import { lerTodasSessoes, atualizarSessao } from '../services/patientService';
import { gerarRelatorioFinanceiroPDF } from '../services/pdfUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { trackAction } from '../services/logService';
import Pagination from './ui/Pagination';

const PERIODOS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês Atual' },
  { id: 'semestre', label: '6 Meses' },
  { id: 'ano', label: 'Este Ano' },
  { id: 'todos', label: 'Tudo' },
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
  let start;
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  if (periodo === 'semana') {
    start = new Date(today); start.setDate(today.getDate() - today.getDay());
  } else if (periodo === 'mes') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (periodo === 'semestre') {
    start = new Date(today); start.setMonth(today.getMonth() - 5); start.setDate(1);
  } else if (periodo === 'ano') {
    start = new Date(today.getFullYear(), 0, 1);
  } else {
    // 'todos'
    start = new Date(2000, 0, 1);
  }
  return { start, end };
}

function formatCurrency(val) {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// KPI Card
function FinCard({ label, value, subtext, type, icon }) {
  const styles = {
    total:    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-500/20', iconText: 'text-indigo-500 dark:text-indigo-300' },
    pago:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-300' },
    pendente: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-300' },
    count:    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-300' },
  };
  const s = styles[type] || styles.total;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-5 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-xl ${s.iconBg} ${s.iconText}`}>{icon}</div>
      </div>
      <div className={`text-3xl font-black tracking-tight ${s.text}`}>
        {typeof value === 'number' ? <><span className="text-xl mr-0.5">R$</span>{formatCurrency(value)}</> : value}
      </div>
      {subtext && <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">{subtext}</p>}
    </div>
  );
}

// Payment method selector
const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão Crédito', 'Cartão Débito', 'Transferência', 'Convênio'];

export default function Financas({ patients, isLoadingPatients }) {
  const [periodo, setPeriodo] = useState('mes');
  const [sessoes, setSessoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filterPago, setFilterPago] = useState('todos'); // 'todos' | 'pago' | 'pendente'
  const [sortBy, setSortBy] = useState('data_desc'); // 'data_desc' | 'data_asc' | 'valor_desc' | 'nome'
  const [editingPayment, setEditingPayment] = useState(null); // sessao.id being edited
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const getSessaoValor = useCallback((s) => {
    let valStr = s.valor;
    if (!valStr || valStr === '0' || valStr === 0) {
      const patient = patients.find(p => p.id === s.id_paciente);
      if (patient && patient.valor_sessao) {
        valStr = patient.valor_sessao;
      } else {
        valStr = '0';
      }
    }
    if (typeof valStr === 'string' && valStr.includes(',')) {
      valStr = valStr.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(valStr) || 0;
  }, [patients]);

  useEffect(() => {
    if (!isLoadingPatients) loadFinancas();
  }, [isLoadingPatients]);

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

  const handleTogglePago = async (sessao, formaOverride) => {
    setUpdatingId(sessao.id);
    try {
      const novoStatus = formaOverride !== undefined ? true : !sessao.pago;
      const att = { pago: novoStatus };
      if (novoStatus) {
        att.forma_pagamento = formaOverride || sessao.forma_pagamento || 'Pix';
      } else {
        att.forma_pagamento = '';
      }
      
      await atualizarSessao(sessao.id, sessao.id_paciente, att);
      setSessoes(prev => prev.map(s => s.id === sessao.id ? { ...s, ...att } : s));
      trackAction('TOGGLE_PAYMENT', { 
        sessionId: sessao.id, patientId: sessao.id_paciente, 
        pago: novoStatus, forma: att.forma_pagamento || '', 
        valor: sessao.valor || '0' 
      });
      setEditingPayment(null);
    } catch (err) {
      console.error('Erro ao atualizar pagamento:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeForma = async (sessao, novaForma) => {
    setUpdatingId(sessao.id);
    try {
      await atualizarSessao(sessao.id, sessao.id_paciente, { forma_pagamento: novaForma });
      setSessoes(prev => prev.map(s => s.id === sessao.id ? { ...s, forma_pagamento: novaForma } : s));
    } catch (err) {
      console.error('Erro ao alterar forma de pagamento:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const { start, end } = getRange(periodo);
  
  const sessoesPeriodo = useMemo(() => {
    return sessoes.filter(s => {
      const d = parseDate(s.data_sessao);
      if (!d) return false;
      return d >= start && d <= end;
    });
  }, [sessoes, periodo]);

  // Filtered + sorted
  const sessoesFiltradas = useMemo(() => {
    let list = [...sessoesPeriodo];
    
    // Filter by payment status
    if (filterPago === 'pago') list = list.filter(s => s.pago);
    else if (filterPago === 'pendente') list = list.filter(s => !s.pago);

    // Sort
    if (sortBy === 'data_desc') list.sort((a, b) => (b.data_sessao || '').localeCompare(a.data_sessao || ''));
    else if (sortBy === 'data_asc') list.sort((a, b) => (a.data_sessao || '').localeCompare(b.data_sessao || ''));
    else if (sortBy === 'valor_desc') list.sort((a, b) => getSessaoValor(b) - getSessaoValor(a));
    else if (sortBy === 'nome') {
      const pMap = Object.fromEntries(patients.map(p => [p.id, p.nome || '']));
      list.sort((a, b) => (pMap[a.id_paciente] || '').localeCompare(pMap[b.id_paciente] || ''));
    }

    return list;
  }, [sessoesPeriodo, filterPago, sortBy, patients]);

  // Pagination
  const totalPages = Math.ceil(sessoesFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessoes = sessoesFiltradas.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [periodo, filterPago, sortBy]);

  // KPIs
  const stats = useMemo(() => {
    const total = sessoesPeriodo.reduce((acc, s) => acc + getSessaoValor(s), 0);
    const pagas = sessoesPeriodo.filter(s => s.pago);
    const pendentes = sessoesPeriodo.filter(s => !s.pago);
    const recebido = pagas.reduce((acc, s) => acc + getSessaoValor(s), 0);
    const pendente = pendentes.reduce((acc, s) => acc + getSessaoValor(s), 0);
    const sessoesSemValor = sessoesPeriodo.filter(s => getSessaoValor(s) === 0);
    const ticketMedio = sessoesPeriodo.length > 0 ? total / sessoesPeriodo.length : 0;
    
    // Payment methods breakdown
    const formasMap = {};
    pagas.forEach(s => {
      const f = s.forma_pagamento || 'Não informado';
      formasMap[f] = (formasMap[f] || 0) + getSessaoValor(s);
    });

    // Per-patient breakdown
    const patientMap = {};
    sessoesPeriodo.forEach(s => {
      if (!patientMap[s.id_paciente]) patientMap[s.id_paciente] = { total: 0, pago: 0, pendente: 0, count: 0 };
      const v = getSessaoValor(s);
      patientMap[s.id_paciente].total += v;
      patientMap[s.id_paciente].count++;
      if (s.pago) patientMap[s.id_paciente].pago += v;
      else patientMap[s.id_paciente].pendente += v;
    });

    return { total, recebido, pendente, pagas: pagas.length, pendentes: pendentes.length, 
             sessoesSemValor: sessoesSemValor.length, ticketMedio, formasMap, patientMap,
             totalSessoes: sessoesPeriodo.length };
  }, [sessoesPeriodo]);

  // Chart: payment methods pie
  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
  const pieData = useMemo(() => {
    return Object.entries(stats.formasMap).map(([name, value]) => ({ name, value }));
  }, [stats.formasMap]);

  // Chart: bar data
  const barData = useMemo(() => [
    { name: 'Recebido', valor: stats.recebido, fill: '#10b981' },
    { name: 'Pendente', valor: stats.pendente, fill: '#ef4444' },
  ], [stats]);

  const handleExportPDF = () => {
    const label = PERIODOS.find(p => p.id === periodo)?.label || periodo;
    gerarRelatorioFinanceiroPDF(sessoesPeriodo, patients, label, { 
      previsaoTotal: stats.total, valorRecebido: stats.recebido, valorPendente: stats.pendente 
    });
    trackAction('EXPORT_PDF_FINANCIAL', { periodo, totalSessoes: stats.totalSessoes, total: stats.total, recebido: stats.recebido });
  };

  return (
    <div className="animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-10 space-y-6">
      
      {/* Header & Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financeiro</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Controle de faturamento, receitas e inadimplências.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-1 flex items-center shadow-sm">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periodo === p.id
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform text-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            PDF
          </button>
        </div>
      </div>

      {/* Warning: sessions without value */}
      {stats.sessoesSemValor > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {stats.sessoesSemValor} sessão(ões) sem valor definido
            </p>
            <p className="text-xs text-amber-500/80 mt-0.5">
              Defina o valor da sessão no cadastro do paciente para que o financeiro funcione corretamente.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FinCard 
          label="Previsão Total" 
          value={stats.total} 
          subtext={`${stats.totalSessoes} sessões no período`}
          type="total" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <FinCard 
          label="Recebido" 
          value={stats.recebido} 
          subtext={`${stats.pagas} sessões pagas`}
          type="pago" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <FinCard 
          label="A Receber" 
          value={stats.pendente} 
          subtext={`${stats.pendentes} sessões pendentes`}
          type="pendente" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <FinCard 
          label="Ticket Médio" 
          value={stats.ticketMedio} 
          subtext="valor médio por sessão"
          type="count" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      {/* Charts Side by Side */}
      {sessoesPeriodo.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Recebido vs Pendente</h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" strokeOpacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 11 }} />
                  <ReTooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value) => [`R$ ${formatCurrency(value)}`, 'Valor']}
                    contentStyle={{borderRadius: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(99,102,241,0.2)'}} 
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Payment Methods */}
          {pieData.length > 0 && (
            <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">Formas de Pagamento</h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <ReTooltip formatter={(value) => [`R$ ${formatCurrency(value)}`, 'Valor']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Row */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Filtrar:</span>
          {[
            { id: 'todos', label: 'Todos', count: stats.totalSessoes },
            { id: 'pago', label: 'Pagos', count: stats.pagas },
            { id: 'pendente', label: 'Pendentes', count: stats.pendentes },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterPago(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                filterPago === f.id
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="sm:ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="data_desc">Data (recente)</option>
            <option value="data_asc">Data (antigo)</option>
            <option value="valor_desc">Maior valor</option>
            <option value="nome">Nome do paciente</option>
          </select>
        </div>
      </div>

      {/* Session Table */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Sessões ({sessoesFiltradas.length})
          </h3>
        </div>
        
        {isLoading || isLoadingPatients ? (
          <div className="flex items-center justify-center py-16">
             <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : sessoesFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma sessão encontrada para este filtro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-zinc-950/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-5 py-3 font-semibold">Paciente</th>
                  <th className="px-5 py-3 font-semibold">Valor</th>
                  <th className="px-5 py-3 font-semibold text-center">Status</th>
                  <th className="px-5 py-3 font-semibold">Forma</th>
                  <th className="px-5 py-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {paginatedSessoes.map(s => {
                  const p = patients.find(pt => pt.id === s.id_paciente);
                  const isUpdating = updatingId === s.id;
                  const valor = getSessaoValor(s);
                  const isEditing = editingPayment === s.id;
                  
                  return (
                    <tr key={s.id} className={`transition-colors ${isUpdating ? 'opacity-50' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                        {formatDateBR(s.data_sessao)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                           <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold ring-1 ring-indigo-500/20 shrink-0">
                             {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                           </div>
                           <span className="text-slate-800 dark:text-slate-200 font-medium text-xs">{p?.nome || <span className="italic text-slate-400">Removido</span>}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 font-bold whitespace-nowrap text-xs ${valor === 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                        {valor === 0 ? (
                          <span className="text-amber-500/70 italic">Sem valor</span>
                        ) : (
                          `R$ ${formatCurrency(valor)}`
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          s.pago 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${s.pago ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          {s.pago ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {s.pago ? (
                          <select
                            value={s.forma_pagamento || ''}
                            onChange={(e) => handleChangeForma(s, e.target.value)}
                            disabled={isUpdating}
                            className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="">—</option>
                            {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        {!s.pago && !isEditing ? (
                          <button
                            onClick={() => setEditingPayment(s.id)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white hover:border-transparent transition-all disabled:opacity-50"
                          >
                            💰 Dar Baixa
                          </button>
                        ) : !s.pago && isEditing ? (
                          <div className="flex items-center gap-1.5">
                            {FORMAS_PAGAMENTO.slice(0, 3).map(f => (
                              <button
                                key={f}
                                onClick={() => handleTogglePago(s, f)}
                                disabled={isUpdating}
                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                {f}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditingPayment(null)}
                              className="px-1.5 py-1 rounded-md text-[10px] text-slate-400 hover:text-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTogglePago(s)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-all disabled:opacity-50"
                          >
                            Desfazer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sessoesFiltradas.length}
              startIndex={startIndex}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="sessões"
            />
          </div>
        )}
      </div>

    </div>
  );
}
