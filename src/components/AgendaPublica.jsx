import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resolverSlug, lerConfigAgendaPublica, lerAgendamentosDoDia, criarAgendamentoPublico } from '../services/agendaService';
import { formatCPF } from '../utils/formatUtils';

const DIAS_MAP = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

function gerarSlots(config, agendamentosOcupados, dataStr) {
  if (!config || !config.dias) return [];

  const dateObj = new Date(dataStr + 'T12:00:00');
  const diaSemana = DIAS_MAP[dateObj.getDay()];
  const diaConfig = config.dias[diaSemana];

  if (!diaConfig || !diaConfig.ativo) return [];

  const duracao = config.duracao_padrao || 50;
  const slots = [];

  const toMin = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const fromMin = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const inicio = toMin(diaConfig.inicio);
  const fim = toMin(diaConfig.fim);
  const intInicio = diaConfig.intervalo_inicio ? toMin(diaConfig.intervalo_inicio) : null;
  const intFim = diaConfig.intervalo_fim ? toMin(diaConfig.intervalo_fim) : null;

  // Horários já ocupados
  const ocupados = new Set(agendamentosOcupados.map(a => a.hora));

  for (let t = inicio; t + duracao <= fim; t += duracao) {
    const horaStr = fromMin(t);
    // Pular se cai no intervalo
    if (intInicio !== null && intFim !== null) {
      if (t < intFim && t + duracao > intInicio) continue;
    }
    // Pular se já ocupado
    if (ocupados.has(horaStr)) continue;

    slots.push(horaStr);
  }

  return slots;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AgendaPublica() {
  const { slug } = useParams();
  const [uid, setUid] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Date selection
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Booking form
  const [selectedSlot, setSelectedSlot] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formCPF, setFormCPF] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formObs, setFormObs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Generate next 14 days for date picker
  const dateOptions = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dateOptions.push(d.toISOString().slice(0, 10));
  }

  // Load psychologist config
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const resolvedUid = await resolverSlug(slug);
        if (!resolvedUid) {
          setError('Profissional não encontrado.');
          return;
        }
        setUid(resolvedUid);
        const cfg = await lerConfigAgendaPublica(resolvedUid);
        if (!cfg) {
          setError('Este profissional ainda não configurou sua agenda pública.');
          return;
        }
        setConfig(cfg);
      } catch (e) {
        console.error(e);
        setError('Erro ao carregar a agenda.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  // Load slots when date changes
  useEffect(() => {
    if (!selectedDate || !uid || !config) return;
    async function loadSlots() {
      setIsLoadingSlots(true);
      setSelectedSlot('');
      try {
        const ocupados = await lerAgendamentosDoDia(uid, selectedDate);
        const available = gerarSlots(config, ocupados, selectedDate);
        setSlots(available);
      } catch (e) {
        console.error(e);
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDate, uid, config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNome.trim()) return alert('Por favor, informe seu nome.');
    if (!formCPF.trim() || formCPF.replace(/\D/g, '').length < 11) return alert('Por favor, informe um CPF válido (11 dígitos).');
    if (!formTelefone.trim()) return alert('Por favor, informe seu telefone.');
    setIsSubmitting(true);
    try {
      await criarAgendamentoPublico(uid, {
        data: selectedDate,
        hora: selectedSlot,
        duracao_min: config.duracao_padrao || 50,
        nome_paciente: formNome.trim(),
        cpf_paciente: formCPF.replace(/\D/g, ''),
        telefone_paciente: formTelefone.trim(),
        observacoes: formObs.trim(),
      });
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDER =====

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <svg className="w-10 h-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{error}</h2>
          <p className="text-sm text-slate-500">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 p-8 shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Solicitação Enviada!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Seu pedido de agendamento para <strong>{formatDateLabel(selectedDate)}</strong> às <strong>{selectedSlot}</strong> foi enviado com sucesso.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {config.nome_publico} confirmará em breve. Aguarde o contato.
          </p>
          <button
            onClick={() => { setSuccess(false); setSelectedSlot(''); setFormNome(''); setFormCPF(''); setFormTelefone(''); setFormObs(''); setSelectedDate(''); }}
            className="mt-6 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Agendar outro horário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl text-white font-bold shadow-lg shadow-indigo-500/20">
            {config.nome_publico?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{config.nome_publico}</h1>
          {config.especialidade && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{config.especialidade}</p>
          )}
          <p className="text-xs text-indigo-400 mt-2 font-semibold">Caritas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Step 1: Select Date */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">1. Escolha uma data</h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {dateOptions.map(dateStr => {
              const d = new Date(dateStr + 'T12:00:00');
              const diaSemana = DIAS_MAP[d.getDay()];
              const diaConfig = config.dias?.[diaSemana];
              const disponivel = diaConfig?.ativo;
              const isSelected = dateStr === selectedDate;
              const dayNum = d.getDate();
              const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

              return (
                <button
                  key={dateStr}
                  onClick={() => disponivel && setSelectedDate(dateStr)}
                  disabled={!disponivel}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all
                    ${isSelected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : ''}
                    ${!isSelected && disponivel ? 'hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10' : ''}
                    ${!disponivel ? 'opacity-30 cursor-not-allowed text-slate-400' : ''}
                  `}
                >
                  <span className="capitalize text-[10px]">{weekday}</span>
                  <span className="text-lg mt-0.5">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Slot */}
        {selectedDate && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">2. Escolha um horário</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 capitalize">{formatDateLabel(selectedDate)}</p>

            {isLoadingSlots ? (
              <div className="flex justify-center py-6">
                <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map(hora => (
                  <button
                    key={hora}
                    onClick={() => setSelectedSlot(hora)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all border
                      ${selectedSlot === hora
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                      }
                    `}
                  >
                    {hora}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Form */}
        {selectedSlot && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">3. Seus dados</h2>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Seu nome *</label>
              <input
                type="text" required value={formNome}
                onChange={e => setFormNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">CPF *</label>
                <input
                  type="text" required value={formCPF}
                  onChange={e => setFormCPF(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="tel" required value={formTelefone}
                  onChange={e => setFormTelefone(e.target.value)}
                  placeholder="(21) 99999-0000"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Observação (opcional)</label>
              <textarea rows={2} value={formObs}
                onChange={e => setFormObs(e.target.value)}
                placeholder="Algo que gostaria de compartilhar antes da sessão..."
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm resize-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Enviando...' : 'Solicitar Agendamento'}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Ao solicitar, o profissional receberá seu pedido e confirmará em breve.
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-slate-400">
        Powered by <span className="font-bold text-indigo-400">Caritas</span>
      </div>
    </div>
  );
}
