import logger from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import {
  criarAgendamento, lerAgendamentos,
  atualizarAgendamento, deletarAgendamento, lerConfigAgenda
} from '../services/agendaService';
import { buscarPacientePorCPF, criarPaciente } from '../services/patientService';
import ConfirmDialog from './ConfirmDialog';
import ConfigAgenda from './ConfigAgenda';
import { useToast } from '../contexts/ToastContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Settings, Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalendarIcon, MessageCircle, Repeat } from 'lucide-react';

const STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   color: 'warning' },
  agendado:   { label: 'Agendado',   color: 'info' },
  confirmado: { label: 'Confirmado', color: 'success' },
  realizado:  { label: 'Realizado',  color: 'success' },
  faltou:     { label: 'Faltou',     color: 'danger' },
  cancelado:  { label: 'Cancelado',  color: 'neutral' },
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

  // Recurring appointment state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeekday, setRecurringWeekday] = useState(3); // 0=Dom, 3=Qua
  const [recurringCount, setRecurringCount] = useState(4);
  const [recurringStartDate, setRecurringStartDate] = useState('');

  const loadAgendamentos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await lerAgendamentos();
      setAgendamentos(data);
    } catch (e) {
      logger.error(e);
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
    setIsRecurring(false);
    setRecurringWeekday(3);
    setRecurringCount(4);
    setRecurringStartDate(dateStr || new Date().toISOString().split('T')[0]);
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
      } else if (isRecurring) {
        // Calculate all dates for recurring appointments
        const dates = calcularDatasRecorrentes(recurringStartDate, recurringWeekday, recurringCount);
        if (dates.length === 0) {
          showToast({ type: 'warning', message: 'Nenhuma data encontrada. Verifique a data inicial e o dia da semana.' });
          setIsSubmitting(false);
          return;
        }
        // Create all appointments in parallel
        await Promise.all(
          dates.map(dateStr =>
            criarAgendamento({ ...form, data: dateStr })
          )
        );
        showToast({ type: 'success', message: `${dates.length} agendamentos criados com sucesso!` });
      } else {
        await criarAgendamento(form);
      }
      setShowModal(false);
      await loadAgendamentos();
      // Auto-select the saved day so it appears immediately in the side panel
      const targetDate = isRecurring ? recurringStartDate : form.data;
      if (targetDate) {
        const [year, month, day] = targetDate.split('-').map(Number);
        if (year === currentYear && month === currentMonth + 1) {
          setSelectedDay(day);
        }
      }
    } catch (err) {
      logger.error('Erro ao salvar agendamento:', err);
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

  // Recurring dates calculator
  const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  function calcularDatasRecorrentes(startDateStr, weekday, count) {
    const dates = [];
    if (!startDateStr) return dates;
    let current = new Date(startDateStr + 'T12:00:00');
    // Move to next occurrence of the weekday
    while (current.getDay() !== weekday) {
      current.setDate(current.getDate() + 1);
    }
    for (let i = 0; i < count; i++) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 7);
    }
    return dates;
  }

  // Preview of recurring dates
  const recurringPreview = isRecurring
    ? calcularDatasRecorrentes(recurringStartDate, recurringWeekday, recurringCount)
    : [];

  if (showConfig) {
    return <ConfigAgenda onClose={() => setShowConfig(false)} />;
  }

  const Spinner = () => (
    <div className="flex-1 flex items-center justify-center">
      <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Agenda</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Organize seus atendimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowConfig(true)}>
            <Settings size={18} />
            Configurar
          </Button>
          <Button variant="primary" onClick={() => openNew()}>
            <Plus size={18} />
            Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 ds-card p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-heading font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              {monthName} {currentYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
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
              
              const selectedStyles = isSelected 
                ? { backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }
                : { border: '1px solid transparent' };

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative rounded-xl p-1.5 min-h-[56px] flex flex-col items-center text-xs font-semibold transition-all hover:bg-slate-100 dark:hover:bg-white/5`}
                  style={{ ...selectedStyles, color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}
                >
                  <span 
                    className={`w-6 h-6 flex items-center justify-center rounded-full mb-1`}
                    style={isToday ? { backgroundColor: 'var(--accent)', color: '#FFFFFF' } : {}}
                  >
                    {day}
                  </span>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-auto">
                    {dayAgendamentos.slice(0, 3).map((ag, idx) => {
                        const statusColor = ag.status === 'faltou' ? 'var(--status-danger)' 
                            : ag.status === 'realizado' ? 'var(--status-success)' 
                            : ag.status === 'cancelado' ? 'var(--text-muted)' 
                            : 'var(--status-info)';
                        return <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />;
                    })}
                    {dayAgendamentos.length > 3 && <span className="text-[8px] mt-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>+{dayAgendamentos.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4" style={{ borderTop: '0.5px solid var(--border)' }}>
            {[
                ['var(--status-info)','Agendado'],
                ['var(--status-success)','Realizado'],
                ['var(--status-danger)','Faltou'],
                ['var(--text-muted)','Cancelado']
            ].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: selected day or upcoming */}
        <div className="ds-card p-5 flex flex-col" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {selectedDay
                ? `${selectedDay} de ${monthName}`
                : 'Selecione um dia'}
            </h3>
            {selectedDay && (
              <button
                onClick={() => openNew(selectedDay)}
                className="text-xs font-semibold flex items-center gap-1 transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                <Plus size={14} />
                Adicionar
              </button>
            )}
          </div>

          {!selectedDay ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <CalendarIcon size={48} className="mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Clique em um dia para ver os agendamentos</p>
            </div>
          ) : isLoading ? (
            <Spinner />
          ) : selectedDayAgendamentos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum agendamento neste dia.</p>
              <button onClick={() => openNew(selectedDay)} className="mt-3 text-xs hover:underline" style={{ color: 'var(--accent)' }}>+ Adicionar</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {selectedDayAgendamentos.map(ag => {
                const sc = STATUS_CONFIG[ag.status] || STATUS_CONFIG.agendado;
                return (
                  <div 
                    key={ag.id} 
                    className="rounded-xl p-4 transition-all"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ag.nome_paciente || 'Paciente'}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ag.hora} · {ag.duracao_min} min</p>
                        {ag.telefone_paciente && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tel: {ag.telefone_paciente}</p>}
                        {ag.observacoes && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{ag.observacoes}</p>}
                        {ag.origem === 'publico' && (
                            <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info)', border: '0.5px solid var(--status-info)' }}>
                                Via Link Público
                            </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={sc.color}>{sc.label}</Badge>
                        
                        <div className="flex gap-1.5 mt-2 items-center">
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
                                  logger.error("Erro ao iniciar atendimento:", e);
                                  showToast({ type: 'error', message: 'Não foi possível iniciar o atendimento. Verifique sua conexão e tente novamente.' });
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '0.5px solid var(--accent)' }}
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
                              className="p-1.5 rounded transition-colors"
                              style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)', border: '0.5px solid var(--status-success)' }}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                          <button 
                            onClick={() => openEdit(ag)} 
                            className="p-1.5 rounded transition-colors"
                            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ isOpen: true, id: ag.id })} 
                            className="p-1.5 rounded transition-colors"
                            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay)' }}>
          <div className="ds-card w-full max-w-lg p-6 animate-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-lg font-heading font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
              {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Patient search */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Paciente</label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                  placeholder="Buscar paciente..."
                  className="ds-input"
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div 
                    className="absolute z-[160] w-full mt-1 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto custom-scrollbar"
                    style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}
                  >
                    {filteredPatients.map(p => (
                      <button key={p.id} type="button" onClick={() => handleSelectPatient(p)}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                        style={{ color: 'var(--text-primary)' }}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                            {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                        {p.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data</label>
                  <input type="date" required value={form.data}
                    onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Horário</label>
                  <input type="time" required value={form.hora}
                    onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                    className="ds-input" />
                </div>
              </div>

              {/* Duration + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Duração (min)</label>
                  <input type="number" min="15" max="180" step="5" value={form.duracao_min}
                    onChange={e => setForm(p => ({ ...p, duracao_min: Number(e.target.value) }))}
                    className="ds-input" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="ds-input">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Observações</label>
                <textarea rows={2} value={form.observacoes}
                  onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                  className="ds-input resize-none" />
              </div>

              {/* Recurring toggle - only for new appointments */}
              {!editingId && (
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setIsRecurring(!isRecurring)}
                      className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer"
                      style={{ backgroundColor: isRecurring ? 'var(--accent)' : 'var(--border)' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: isRecurring ? 'translateX(22px)' : 'translateX(2px)' }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Repeat size={16} style={{ color: isRecurring ? 'var(--accent)' : 'var(--text-secondary)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Agendamento Recorrente</span>
                    </div>
                  </label>

                  {isRecurring && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dia da Semana</label>
                          <select
                            value={recurringWeekday}
                            onChange={e => setRecurringWeekday(Number(e.target.value))}
                            className="ds-input"
                          >
                            {WEEKDAY_NAMES.map((name, i) => (
                              <option key={i} value={i}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Repetições</label>
                          <input
                            type="number"
                            min="2"
                            max="52"
                            value={recurringCount}
                            onChange={e => setRecurringCount(Math.min(52, Math.max(2, Number(e.target.value))))}
                            className="ds-input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>A partir de</label>
                          <input
                            type="date"
                            value={recurringStartDate}
                            onChange={e => setRecurringStartDate(e.target.value)}
                            className="ds-input"
                          />
                        </div>
                      </div>

                      {/* Preview */}
                      {recurringPreview.length > 0 && (
                        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-primary)', border: '0.5px solid var(--border)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>
                            📅 {recurringPreview.length} agendamentos serão criados:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {recurringPreview.map((d, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-1 rounded-md font-medium"
                                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                              >
                                {d.split('-').reverse().join('/')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" className="flex-1" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : isRecurring ? `Agendar ${recurringPreview.length}x` : 'Agendar'}
                </Button>
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
        variant="danger"
      />
    </div>
  );
}
