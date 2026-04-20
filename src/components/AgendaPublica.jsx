import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resolverSlug, lerConfigAgendaPublica, lerAgendamentosDoDia, criarAgendamentoPublico } from '../services/agendaService';
import { formatCPF, validarCPF, formatTelefone } from '../utils/formatUtils';
import Button from './ui/Button';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Anti-spam: honeypot field (hidden from humans, filled by bots)
  const [honeypot, setHoneypot] = useState('');

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
    setFormErrors({});
    setSubmitError('');

    // Validação inline (H5/H9 — prevenção de erros sem alert)
    const errors = {};
    if (!formNome.trim()) errors.nome = 'Informe seu nome completo.';
    if (!formCPF.trim() || formCPF.replace(/\D/g, '').length < 11) errors.cpf = 'Informe um CPF válido (11 dígitos).';
    else if (!validarCPF(formCPF)) errors.cpf = 'CPF inválido. Verifique os dígitos.';
    if (!formTelefone.trim()) errors.telefone = 'Informe um telefone para contato.';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    // Anti-spam: honeypot check
    if (honeypot) { setSuccess(true); return; }

    // Rate limit: max 3 bookings per browser session
    const bookingCount = parseInt(sessionStorage.getItem('caritas_booking_count') || '0', 10);
    if (bookingCount >= 3) {
      setSubmitError('Você atingiu o limite de agendamentos por sessão. Tente novamente mais tarde.');
      return;
    }

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
      sessionStorage.setItem('caritas_booking_count', String(bookingCount + 1));
      setSuccess(true);
    } catch (e) {
      console.error(e);
      setSubmitError('Erro ao enviar solicitação. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDER =====

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <svg className="w-10 h-10 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-danger-bg)' }}>
            <AlertTriangle size={32} style={{ color: 'var(--status-danger)' }} />
          </div>
          <h2 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{error}</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Verifique o link e tente novamente.</p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="ds-card text-center max-w-md p-8" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--status-success-bg)' }}>
            <CheckCircle size={32} style={{ color: 'var(--status-success)' }} />
          </div>
          <h2 className="text-xl font-heading font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Solicitação Enviada!</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Seu pedido de agendamento para <strong style={{ color: 'var(--text-primary)' }}>{formatDateLabel(selectedDate)}</strong> às <strong style={{ color: 'var(--text-primary)' }}>{selectedSlot}</strong> foi enviado com sucesso.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {config.nome_publico} confirmará em breve. Aguarde o contato.
          </p>
          <Button
            className="mt-6 w-full"
            onClick={() => { setSuccess(false); setSelectedSlot(''); setFormNome(''); setFormCPF(''); setFormTelefone(''); setFormObs(''); setSelectedDate(''); }}
          >
            Agendar outro horário
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '0.5px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-6 py-6 text-center">
          <div 
            className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold" 
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', boxShadow: 'var(--shadow)' }}
          >
            {config.nome_publico?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>{config.nome_publico}</h1>
          {config.especialidade && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{config.especialidade}</p>
          )}
          <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--accent)' }}>Caritas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Step 1: Select Date */}
        <div className="ds-card p-5" style={{ backgroundColor: 'var(--bg-card)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>1. Escolha uma data</h2>
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
                    ${isSelected ? '' : disponivel ? 'hover:bg-slate-100 dark:hover:bg-white/5' : ''}
                    ${!disponivel ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                  style={{
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  <span className="capitalize text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>{weekday}</span>
                  <span className="text-lg mt-0.5">{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Slot */}
        {selectedDate && (
          <div className="ds-card p-5 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>2. Escolha um horário</h2>
            <p className="text-xs mb-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{formatDateLabel(selectedDate)}</p>

            {isLoadingSlots ? (
              <div className="flex justify-center py-6">
                <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map(hora => (
                  <button
                    key={hora}
                    onClick={() => setSelectedSlot(hora)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all border`}
                    style={{
                      backgroundColor: selectedSlot === hora ? 'var(--accent)' : 'transparent',
                      color: selectedSlot === hora ? '#FFFFFF' : 'var(--text-primary)',
                      border: `1px solid ${selectedSlot === hora ? 'var(--accent)' : 'var(--border)'}`,
                    }}
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
          <form onSubmit={handleSubmit} className="ds-card p-5 space-y-4 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>3. Seus dados</h2>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Seu nome *</label>
              <input
                type="text" required value={formNome}
                onChange={e => { setFormNome(e.target.value); setFormErrors(prev => ({...prev, nome: ''})); }}
                placeholder="Nome completo"
                className={`ds-input ${formErrors.nome ? 'border-red-400' : ''}`}
              />
              {formErrors.nome && <p className="text-xs text-red-400 mt-1">{formErrors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>CPF *</label>
                <input
                  type="text" required value={formCPF}
                  onChange={e => { setFormCPF(formatCPF(e.target.value)); setFormErrors(prev => ({...prev, cpf: ''})); }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`ds-input ${formErrors.cpf ? 'border-red-400' : ''}`}
                />
                {formErrors.cpf && <p className="text-xs text-red-400 mt-1">{formErrors.cpf}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefone / WhatsApp *</label>
                <input
                  type="tel" required value={formTelefone}
                  onChange={e => { setFormTelefone(formatTelefone(e.target.value)); setFormErrors(prev => ({...prev, telefone: ''})); }}
                  placeholder="(21) 99999-0000"
                  maxLength={15}
                  className={`ds-input ${formErrors.telefone ? 'border-red-400' : ''}`}
                />
                {formErrors.telefone && <p className="text-xs text-red-400 mt-1">{formErrors.telefone}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observação (opcional)</label>
              <textarea rows={2} value={formObs}
                onChange={e => setFormObs(e.target.value)}
                placeholder="Algo que gostaria de compartilhar antes da sessão..."
                className="ds-input resize-none" />
            </div>

            {/* Honeypot anti-spam — invisible to humans */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Enviando...' : 'Solicitar Agendamento'}
            </Button>

            {submitError && (
              <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '0.5px solid var(--status-danger)' }}>
                {submitError}
              </div>
            )}
            <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
              Ao solicitar, o profissional receberá seu pedido e confirmará em breve.
            </p>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        Powered by <span className="font-bold" style={{ color: 'var(--accent)' }}>Caritas</span>
      </div>
    </div>
  );
}
