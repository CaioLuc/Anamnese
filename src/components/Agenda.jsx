import { useState, useEffect, useCallback } from 'react';
import {
  criarAgendamento, lerAgendamentos,
  atualizarAgendamento, deletarAgendamento, lerConfigAgenda
} from '../services/agendaService';
import { buscarPacientePorCPF, criarPaciente } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';
import ConfigAgenda from './ConfigAgenda';
import { useToast } from '../contexts/ToastContext';

const STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  agendado:   { label: 'Agendado',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  confirmado: { label: 'Confirmado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  realizado:  { label: 'Realizado',  color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  faltou:     { label: 'Faltou',     color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  cancelado:  { label: 'Cancelado',  color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const emptyForm = {
  id_paciente: '',
  nome_paciente: '',
  data: '',
  hora: '09:00',
  duracao_min: 50,
  status: 'agendado',
  observacoes: '',
};

export default function Agenda({ patients, onAtender, onRefreshPatients }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [agendamentos, setAgendamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [showConfig, setShowConfig] = useState(false);

  const loadAgendamentos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await lerAgendamentos();
      setAgendamentos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAgendamentos(); }, [loadAgendamentos]);

  // Calendar helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const getAgendamentosForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return agendamentos.filter(a => a.data === dateStr).sort((a, b) => a.hora > b.hora ? 1 : -1);
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString('pt-BR', { month: 'long' });

  // Modal helpers
  const openNew = (day = null) => {
    const dateStr = day
      ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';
    setForm({ ...emptyForm, data: dateStr });
    setPatientSearch('');
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (ag) => {
    setForm({
      id_paciente: ag.id_paciente,
      nome_paciente: ag.nome_paciente || '',
      data: ag.data,
      hora: ag.hora,
      duracao_min: ag.duracao_min,
      status: ag.status,
      observacoes: ag.observacoes || '',
    });
    setPatientSearch(ag.nome_paciente || '');
    setEditingId(ag.id);
    setShowModal(true);
  };

  const handleSelectPatient = (p) => {
    setForm(prev => ({ ...prev, id_paciente: p.id, nome_paciente: p.nome }));
    setPatientSearch(p.nome);
    setShowPatientDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_paciente) {
      showToast({ type: 'warning', message: 'Selecione um paciente da lista antes de agendar.' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingId) {
        await atualizarAgendamento(editingId, form);
      } else {
        await criarAgendamento(form);
      }
      setShowModal(false);
      await loadAgendamentos();
      // Auto-select the saved day so it appears immediately in the side panel
      if (form.data) {
        const [year, month, day] = form.data.split('-').map(Number);
        if (year === currentYear && month === currentMonth + 1) {
          setSelectedDay(day);
        }
      }
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      const msg = err?.code === 'permission-denied'
        ? 'Sem permissão. Adicione a coleção "agendamentos" nas Regras do Firestore.'
        : (err?.message || 'Erro desconhecido ao salvar.');
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await deletarAgendamento(confirmDelete.id);
    setConfirmDelete({ isOpen: false, id: null });
    await loadAgendamentos();
  };

  const { showToast } = useToast();

  const filteredPatients = patients.filter(p =>
    p.nome?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const selectedDayAgendamentos = selectedDay ? getAgendamentosForDay(selectedDay) : [];

  if (showConfig) {
    return <ConfigAgenda onClose={() => setShowConfig(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Agenda</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Organize seus atendimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-white/10 hover:border-indigo-500/40 text-slate-600 dark:text-slate-400 hover:text-indigo-400 text-sm font-semibold rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configurar
          </button>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-3xl p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {monthName} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-600 dark:text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAgendamentos = getAgendamentosForDay(day);
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative rounded-xl p-1.5 min-h-[56px] flex flex-col items-center text-xs font-semibold transition-all
                    ${isSelected ? 'bg-indigo-500/20 border border-indigo-500/40' : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'}
                    ${isToday ? 'text-indigo-400' : 'text-slate-700 dark:text-slate-300'}
                  `}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-indigo-500 text-slate-900 dark:text-white' : ''}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {dayAgendamentos.slice(0, 3).map((ag, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${ag.status === 'faltou' ? 'bg-red-400' : ag.status === 'realizado' ? 'bg-emerald-400' : ag.status === 'cancelado' ? 'bg-zinc-500' : 'bg-blue-400'}`} />
                    ))}
                    {dayAgendamentos.length > 3 && <span className="text-[8px] text-slate-600 dark:text-slate-400">+{dayAgendamentos.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
            {[['bg-blue-400','Agendado'],['bg-emerald-400','Realizado'],['bg-red-400','Faltou'],['bg-zinc-500','Cancelado']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <div className={`w-2 h-2 rounded-full ${c}`}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: selected day or upcoming */}
        <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {selectedDay
                ? `${selectedDay} de ${monthName}`
                : 'Selecione um dia'}
            </h3>
            {selectedDay && (
              <button
                onClick={() => openNew(selectedDay)}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Adicionar
              </button>
            )}
          </div>

          {!selectedDay ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Clique em um dia para ver os agendamentos</p>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          ) : selectedDayAgendamentos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600">
              <p className="text-sm">Nenhum agendamento neste dia.</p>
              <button onClick={() => openNew(selectedDay)} className="mt-3 text-xs text-indigo-400 hover:underline">+ Adicionar</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {selectedDayAgendamentos.map(ag => {
                const sc = STATUS_CONFIG[ag.status] || STATUS_CONFIG.agendado;
                return (
                  <div key={ag.id} className="bg-slate-100 dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ag.nome_paciente || 'Paciente'}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{ag.hora} · {ag.duracao_min} min</p>
                        {ag.telefone_paciente && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tel: {ag.telefone_paciente}</p>}
                        {ag.observacoes && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{ag.observacoes}</p>}
                        {ag.origem === 'publico' && <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full font-semibold">Via Link Público</span>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sc.color}`}>{sc.label}</span>
                        <div className="flex gap-1 mt-1 items-center">
                          {ag.status !== 'realizado' && ag.status !== 'cancelado' && (
                            <button
                              onClick={async () => {
                                try {
                                  // 1. Tentar encontrar paciente
                                  let patient = null;

                                  // Se tem id_paciente (agendamento interno), buscar direto
                                  if (ag.id_paciente) {
                                    patient = patients.find(p => p.id === ag.id_paciente);
                                  }

                                  // Se veio do link público e tem CPF, buscar por CPF
                                  if (!patient && ag.cpf_paciente) {
                                    patient = await buscarPacientePorCPF(ag.cpf_paciente);
                                  }

                                  // Se não encontrou: criar paciente novo automaticamente
                                  if (!patient && ag.origem === 'publico') {
                                    // Carregar config para pegar o valor da consulta
                                    let valorSessao = '';
                                    try {
                                      const config = await lerConfigAgenda();
                                      if (config?.valor_consulta) valorSessao = config.valor_consulta;
                                    } catch (_) {}

                                    const novoId = await criarPaciente({
                                      nome: ag.nome_paciente || 'Paciente',
                                      telefone: ag.telefone_paciente || '',
                                      cpf: ag.cpf_paciente || '',
                                      valor_sessao: valorSessao,
                                      data_nascimento: '',
                                      clinica: '',
                                    });
                                    patient = {
                                      id: novoId,
                                      nome: ag.nome_paciente,
                                      telefone: ag.telefone_paciente,
                                      cpf: ag.cpf_paciente,
                                      valor_sessao: valorSessao,
                                    };

                                    // Vincular o paciente ao agendamento
                                    await atualizarAgendamento(ag.id, { id_paciente: novoId });

                                    // Atualizar lista de pacientes no App
                                    if (onRefreshPatients) await onRefreshPatients();
                                  }

                                  // 2. Atualizar status do agendamento
                                  await atualizarAgendamento(ag.id, { ...ag, status: 'realizado' });
                                  await loadAgendamentos();

                                  // 3. Redirecionar
                                  if (onAtender && patient) onAtender(patient);
                                } catch (e) {
                                  console.error("Erro ao iniciar atendimento:", e);
                                  showToast({ type: 'error', message: 'Não foi possível iniciar o atendimento. Verifique sua conexão e tente novamente.' });
                                }
                              }}
                              className="mr-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded shadow-sm hover:bg-indigo-500 hover:text-slate-900 dark:hover:text-white transition-all"
                              title="Iniciar Sessão"
                            >
                              Atender
                            </button>
                          )}
                          {ag.telefone_paciente && (
                            <a
                              href={`https://wa.me/${ag.telefone_paciente.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${ag.nome_paciente || ''}! Sua sessão está marcada para ${ag.data?.split('-').reverse().join('/')} às ${ag.hora}. Confirma?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          )}
                          <button onClick={() => openEdit(ag)} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => setConfirmDelete({ isOpen: true, id: ag.id })} className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
              {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Patient search */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Paciente</label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                  placeholder="Buscar paciente..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute z-[160] w-full mt-1 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
                    {filteredPatients.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelectPatient(p)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-white hover:bg-indigo-500 hover:text-white flex items-center gap-3 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">{p?.nome?.charAt(0)?.toUpperCase() || '?'}</span>
                        {p.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Data</label>
                  <input type="date" required value={form.data}
                    onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Horário</label>
                  <input type="time" required value={form.hora}
                    onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Duration + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Duração (min)</label>
                  <input type="number" min="15" max="180" step="5" value={form.duracao_min}
                    onChange={e => setForm(p => ({ ...p, duracao_min: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observações</label>
                <textarea rows={2} value={form.observacoes}
                  onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm resize-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all">
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Excluir Agendamento"
        message="Deseja excluir este agendamento? Esta ação é irreversível."
        confirmText="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
      />
    </div>
  );
}
