import logger from '../utils/logger';
import { useState, useEffect } from 'react';
import { lerTodasSessoes, lerTodasAnamneses } from '../services/patientService';
import { lerAgendamentosPorData } from '../services/agendaService';
import { lerAvisoGlobal } from '../services/adminService';
import { useToast } from '../contexts/ToastContext';
import { parseDate, dataLocalISO, formatCurrency } from '../utils/formatUtils';
import Skeleton from './ui/Skeleton';
import Badge from './ui/Badge';
import {
  UserPlus, FilePlus2, Calendar, ClipboardList, X, Info, ChevronRight, Wallet, CheckCircle2, Clock,
} from 'lucide-react';

const STATUS_AGENDA = {
  pendente: { label: 'A confirmar', variant: 'warning' },
  agendado: { label: 'Agendado', variant: 'info' },
  confirmado: { label: 'Confirmado', variant: 'success' },
  realizado: { label: 'Realizado', variant: 'success' },
  faltou: { label: 'Faltou', variant: 'danger' },
};

const PERIODOS = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

function Painel({ titulo, acao, onAcao, children, className = '' }) {
  return (
    <section className={`ds-card overflow-hidden ${className}`}>
      <header className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>{titulo}</h2>
        {acao && (
          <button onClick={onAcao} className="text-sm font-semibold inline-flex items-center gap-0.5 min-h-[36px] hover:underline" style={{ color: 'var(--accent)' }}>
            {acao} <ChevronRight size={15} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function Vazio({ icon, texto, acao, onAcao }) {
  const Icon = icon;
  return (
    <div className="px-5 py-9 text-center">
      <Icon size={26} className="mx-auto mb-2.5" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{texto}</p>
      {acao && (
        <button onClick={onAcao} className="mt-3 text-sm font-semibold min-h-[36px] hover:underline" style={{ color: 'var(--accent)' }}>
          {acao}
        </button>
      )}
    </div>
  );
}

function intervaloDoPeriodo(filtro, agora) {
  if (filtro === 'semana') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - agora.getDay());
    return [inicio, new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59)];
  }
  if (filtro === 'ano') {
    return [new Date(agora.getFullYear(), 0, 1), new Date(agora.getFullYear(), 11, 31, 23, 59, 59)];
  }
  return [new Date(agora.getFullYear(), agora.getMonth(), 1), new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)];
}

export default function DashboardSummary({ patients, isLoading, onNavigate, perfil }) {
  const [sessoes, setSessoes] = useState([]);
  const [anamneses, setAnamneses] = useState([]);
  const [agendaHoje, setAgendaHoje] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [filtro, setFiltro] = useState('mes');
  const [avisoGlobal, setAvisoGlobal] = useState('');
  const { showToast } = useToast();

  const hoje = dataLocalISO();

  useEffect(() => {
    let ativo = true;
    async function load() {
      setIsLoadingStats(true);
      try {
        const [s, a] = await Promise.all([lerTodasSessoes(), lerTodasAnamneses()]);
        if (!ativo) return;
        const activeIds = new Set(patients.map(p => p.id));
        setSessoes(s.filter(sessao => activeIds.has(sessao.id_paciente)));
        setAnamneses(a.filter(ana => activeIds.has(ana.id_paciente)));
      } catch (e) {
        logger.error(e);
        showToast({ type: 'error', message: 'Não foi possível carregar o resumo. Verifique sua conexão.' });
      } finally {
        if (ativo) setIsLoadingStats(false);
      }
    }
    load();
    lerAgendamentosPorData(hoje)
      .then((lista) => {
        if (!ativo) return;
        setAgendaHoje(lista
          .filter(ag => ag.status !== 'cancelado')
          .sort((x, y) => String(x.hora).localeCompare(String(y.hora))));
      })
      .catch((e) => logger.warn('Agenda do dia indisponível:', e));
    lerAvisoGlobal().then(a => { if (ativo && a.ativo && a.mensagem) setAvisoGlobal(a.mensagem); }).catch(() => {});
    return () => { ativo = false; };
  }, [patients, showToast, hoje]);

  const agora = new Date();
  const [periodoStart, periodoEnd] = intervaloDoPeriodo(filtro, agora);
  const sessoesPeriodo = sessoes.filter(s => {
    const d = parseDate(s.data_sessao);
    return d && d >= periodoStart && d <= periodoEnd;
  });
  const presentes = sessoesPeriodo.filter(s => s.status === 'Presente').length;
  const faltas = sessoesPeriodo.filter(s => s.status === 'Faltou').length;
  const comStatus = presentes + faltas;

  // Pendências que pedem ação
  const idsComAnamnese = new Set(anamneses.map(a => a.id_paciente));
  const semAnamnese = patients.filter(p => !idsComAnamnese.has(p.id));
  const aReceber = sessoes.filter(s => !s.pago && parseFloat(s.valor) > 0);
  const totalAReceber = aReceber.reduce((acc, s) => acc + Math.round((parseFloat(s.valor) || 0) * 100), 0) / 100;
  const sessoesHoje = sessoes.filter(s => s.data_sessao === hoje);

  const hour = agora.getHours();
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroNome = (perfil?.nome || '').trim().split(/\s+/).find(p => p && !/^(dr|dra|psi)\.?$/i.test(p));
  const dataLonga = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dataExtenso = dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1);
  const nomeDoPaciente = (id, fallback) => patients.find(p => p.id === id)?.nome || fallback || 'Paciente';

  const resumo = [
    { label: 'Pacientes ativos', valor: isLoading ? null : patients.length },
    { label: 'Sessões no período', valor: isLoadingStats ? null : sessoesPeriodo.length },
    { label: 'Presença', valor: isLoadingStats ? null : (comStatus ? `${Math.round((presentes / comStatus) * 100)}%` : '—') },
    { label: 'A receber', valor: isLoadingStats ? null : `R$ ${formatCurrency(totalAReceber)}` },
  ];

  return (
    <div className="w-full space-y-6 animate-in">

      {avisoGlobal && (
        <div className="p-4 rounded-[var(--radius)] flex items-start gap-3" role="status" style={{ backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info-text)' }}>
          <Info size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed flex-1">{avisoGlobal}</p>
          <button onClick={() => setAvisoGlobal('')} className="shrink-0 -m-1 p-1 rounded" aria-label="Dispensar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{dataExtenso}</p>
          <h1 className="mt-1 text-[1.85rem] sm:text-[2.2rem] leading-tight font-medium" style={{ color: 'var(--text-primary)' }}>
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''}.
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            {agendaHoje.length
              ? `Você tem ${agendaHoje.length} ${agendaHoje.length === 1 ? 'atendimento' : 'atendimentos'} na agenda de hoje.`
              : 'Nenhum atendimento na agenda de hoje.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate('pacientes', { addPatient: true })} className="ds-btn ds-btn-secondary">
            <UserPlus size={17} /> Novo paciente
          </button>
          <button onClick={() => onNavigate('nova-sessao')} className="ds-btn ds-btn-primary">
            <FilePlus2 size={17} /> Registrar sessão
          </button>
        </div>
      </div>

      {/* Resumo do período */}
      <section className="ds-card" aria-label="Resumo do período">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Resumo</h2>
          <div className="ds-segmented">
            {PERIODOS.map(p => (
              <button key={p.id} aria-pressed={filtro === p.id} onClick={() => setFiltro(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {resumo.map((item, i) => (
            <div
              key={item.label}
              className={`px-5 py-4 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              <dt className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{item.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                {item.valor === null ? <Skeleton className="h-7 w-16 mt-1" /> : item.valor}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agenda de hoje */}
        <Painel titulo="Agenda de hoje" acao="Abrir agenda" onAcao={() => onNavigate('agenda')} className="lg:col-span-2">
          {agendaHoje.length === 0 ? (
            <Vazio icon={Calendar} texto="Sem atendimentos marcados para hoje." acao="Marcar atendimento" onAcao={() => onNavigate('agenda')} />
          ) : (
            <ul>
              {agendaHoje.map(ag => {
                const st = STATUS_AGENDA[ag.status] || STATUS_AGENDA.agendado;
                return (
                  <li key={ag.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="w-14 shrink-0 text-[15px] font-semibold tabular" style={{ color: 'var(--text-primary)' }}>{ag.hora}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{nomeDoPaciente(ag.id_paciente, ag.nome_paciente)}</p>
                      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{ag.duracao_min || 50} min{ag.origem === 'publico' ? ' · pelo link público' : ''}</p>
                    </div>
                    <Badge variant={st.variant} size="md">{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        {/* Pendências */}
        <Painel titulo="Pendências">
          {isLoadingStats ? (
            <div className="p-5"><Skeleton count={3} /></div>
          ) : semAnamnese.length === 0 && aReceber.length === 0 ? (
            <Vazio icon={CheckCircle2} texto="Tudo em dia por aqui." />
          ) : (
            <ul>
              {semAnamnese.length > 0 && (
                <li style={{ borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => onNavigate('pacientes')} className="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-secondary)]">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--warm-light)', color: 'var(--warm)' }}>
                      <ClipboardList size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {semAnamnese.length} {semAnamnese.length === 1 ? 'paciente sem anamnese' : 'pacientes sem anamnese'}
                      </span>
                      <span className="block text-[13px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {semAnamnese.slice(0, 3).map(p => (p.nome || '').split(' ')[0]).join(', ')}{semAnamnese.length > 3 ? '…' : ''}
                      </span>
                    </span>
                    <ChevronRight size={17} className="mt-2" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </li>
              )}
              {aReceber.length > 0 && (
                <li style={{ borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => onNavigate('financas')} className="w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-secondary)]">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
                      <Wallet size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] font-semibold tabular" style={{ color: 'var(--text-primary)' }}>R$ {formatCurrency(totalAReceber)} a receber</span>
                      <span className="block text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {aReceber.length} {aReceber.length === 1 ? 'sessão sem baixa' : 'sessões sem baixa'}
                      </span>
                    </span>
                    <ChevronRight size={17} className="mt-2" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </li>
              )}
            </ul>
          )}
        </Painel>
      </div>

      {/* Sessões registradas hoje (sem conteúdo clínico na tela inicial) */}
      <Painel titulo="Registradas hoje" acao="Ver pacientes" onAcao={() => onNavigate('pacientes')}>
        {isLoadingStats ? (
          <div className="p-5"><Skeleton count={2} /></div>
        ) : sessoesHoje.length === 0 ? (
          <Vazio icon={Clock} texto="Nenhuma evolução registrada hoje." acao="Registrar sessão" onAcao={() => onNavigate('nova-sessao')} />
        ) : (
          <ul className="grid sm:grid-cols-2">
            {sessoesHoje.map(s => {
              const paciente = patients.find(p => p.id === s.id_paciente);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => paciente && onNavigate('pacientes', { openPatient: paciente })}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {nomeDoPaciente(s.id_paciente).charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 text-[15px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{nomeDoPaciente(s.id_paciente, 'Paciente removido')}</span>
                    {s.status && <Badge variant={s.status === 'Presente' ? 'success' : s.status === 'Faltou' ? 'danger' : 'warning'} size="md">{s.status}</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Painel>
    </div>
  );
}
