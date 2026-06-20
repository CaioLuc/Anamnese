/**
 * usabilityAnalyzer.js
 * 
 * Módulo de análise de usabilidade para o Framework DECIDE.
 * Processa logs brutos do Firebase (action_logs) e gera 6 relatórios CSV
 * completos para estudo acadêmico.
 * 
 * Agnóstico de banco — funciona com qualquer array de logs.
 */

// ============================================================
// CONFIGURAÇÃO DE TAREFAS DO ROTEIRO
// ============================================================
const TAREFAS_ROTEIRO = [
  { numero: 1, nome: 'Login no Sistema',           actionType: 'LOGIN',                 descricao: 'Acessar o sistema com as credenciais de teste' },
  { numero: 2, nome: 'Criar Local de Atendimento', actionType: 'CREATE_CLINIC',          descricao: 'Navegar até Clínicas/Locais e criar "Clínica Teste"' },
  { numero: 3, nome: 'Cadastrar Paciente',          actionType: 'CREATE_PATIENT',         descricao: 'Cadastrar novo paciente com dados inventados e CPF válido' },
  { numero: 4, nome: 'Efetuar Agendamento',         actionType: 'CREATE_APPOINTMENT',     descricao: 'Navegar até Agenda e agendar consulta com o paciente' },
  { numero: 5, nome: 'Preencher Anamnese',           actionType: 'SUBMIT_ANAMNESIS_FORM',  descricao: 'Preencher as 7 seções do formulário de anamnese de adulto' },
  { numero: 6, nome: 'Preencher Evolução',           actionType: 'SESSION_EVOLVED',        descricao: 'Criar uma nova evolução/sessão com o paciente' },
  { numero: 7, nome: 'Trocar Forma de Pagamento',   actionType: 'TOGGLE_PAYMENT',         descricao: 'Navegar ao Financeiro e trocar a forma de pagamento' },
];

// Ações que indicam dificuldade/retrabalho
const ACOES_ERRO = [
  'DELETE_PATIENT', 'DELETE_CLINIC', 'DELETE_APPOINTMENT', 
  'DELETE_SESSION', 'DELETE_ANAMNESIS', 'DELETE_QUESTIONNAIRE',
  'RESTORE_PATIENT'
];

// Labels legíveis para cada tipo de ação
const ACTION_LABELS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  NAVIGATE: 'Navegação',
  CREATE_PATIENT: 'Paciente Criado',
  UPDATE_PATIENT: 'Paciente Editado',
  DELETE_PATIENT: 'Paciente Deletado',
  RESTORE_PATIENT: 'Paciente Restaurado',
  VIEW_PATIENT_PROFILE: 'Prontuário Aberto',
  CREATE_CLINIC: 'Clínica Criada',
  DELETE_CLINIC: 'Clínica Deletada',
  CREATE_APPOINTMENT: 'Agendamento Criado',
  UPDATE_APPOINTMENT: 'Agendamento Editado',
  DELETE_APPOINTMENT: 'Agendamento Deletado',
  SAVE_AGENDA_CONFIG: 'Config. Agenda Salva',
  SUBMIT_ANAMNESIS_FORM: 'Anamnese Salva',
  UPDATE_ANAMNESIS_FORM: 'Anamnese Editada',
  SUBMIT_ANAMNESIS_ADOLESCENT: 'Anamnese Adolesc. Salva',
  UPDATE_ANAMNESIS_ADOLESCENT: 'Anamnese Adolesc. Editada',
  CREATE_ANAMNESIS: 'Anamnese Criada',
  UPDATE_ANAMNESIS: 'Anamnese Editada',
  DELETE_ANAMNESIS: 'Anamnese Deletada',
  CREATE_SESSION: 'Sessão Criada',
  UPDATE_SESSION: 'Sessão Editada',
  DELETE_SESSION: 'Sessão Deletada',
  SESSION_EVOLVED: 'Evolução Clínica',
  EDIT_SESSION_INLINE: 'Sessão Edit. Inline',
  TOGGLE_PAYMENT: 'Pagamento Alternado',
  CREATE_QUESTIONNAIRE: 'Questionário Criado',
  DELETE_QUESTIONNAIRE: 'Questionário Deletado',
  SEARCH_SELECT: 'Busca Global',
  EXPORT_PDF_EVOLUTION: 'PDF Evolução',
  EXPORT_PDF_ANAMNESIS: 'PDF Anamnese',
  EXPORT_PDF_SESSION: 'PDF Sessão',
  EXPORT_PDF_FINANCIAL: 'PDF Financeiro',
  EXPORT_PDF_PENDENCIAS: 'PDF Pendências',
  EXPORT_PDF_RECIBO: 'PDF Recibo',
  EXPORT_PDF_COMPLETE_RECORD: 'PDF Prontuário Completo',
};

// ============================================================
// HELPERS
// ============================================================

function toDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatTimestamp(val) {
  const d = toDate(val);
  if (!d) return '';
  return d.toLocaleString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });
}

function formatDurationSec(ms) {
  if (!ms || ms < 0) return '';
  return (ms / 1000).toFixed(1);
}

function formatDurationMin(ms) {
  if (!ms || ms < 0) return '';
  return (ms / 60000).toFixed(2);
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sqDiffs = arr.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

function parseUserAgent(ua) {
  if (!ua) return 'Desconhecido';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Outro';
}

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  let s = String(val).replace(/"/g, '""');
  if (s.includes(';') || s.includes('\n') || s.includes('"') || s.includes(',')) {
    s = `"${s}"`;
  }
  return s;
}

function buildCSV(headers, rows) {
  const headerLine = headers.map(h => csvEscape(h)).join(';');
  const dataLines = rows.map(row => row.map(cell => csvEscape(cell)).join(';'));
  return '\uFEFF' + [headerLine, ...dataLines].join('\n'); // BOM for Excel UTF-8
}

// ============================================================
// CORE ANALYSIS
// ============================================================

/**
 * Agrupa logs por email de participante.
 * @param {Array} logs - Logs brutos do Firebase
 * @param {string} emailPattern - Padrão de email para filtrar (ex: '@teste.com')
 * @returns {Object} { email: [logs ordenados por tempo] }
 */
function groupByParticipant(logs, emailPattern) {
  const groups = {};

  logs.forEach(log => {
    const email = (log.psicologoEmail || '').toLowerCase();
    if (emailPattern && !email.includes(emailPattern.toLowerCase())) return;

    if (!groups[email]) groups[email] = [];
    groups[email].push(log);
  });

  // Ordenar logs de cada participante por timestamp
  Object.keys(groups).forEach(email => {
    groups[email].sort((a, b) => {
      const da = toDate(a.createdAt);
      const db = toDate(b.createdAt);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
  });

  return groups;
}

/**
 * Analisa as tarefas de um participante.
 * Retorna detalhes de cada tarefa (concluída, tempo, tentativas).
 */
function analyzeParticipantTasks(logs) {
  const tasks = TAREFAS_ROTEIRO.map(tarefa => {
    const matchingLogs = logs.filter(l => l.actionType === tarefa.actionType);
    const deleteLogs = logs.filter(l => {
      // Conta tentativas de retrabalho para a mesma "área"
      if (tarefa.actionType === 'CREATE_PATIENT') return l.actionType === 'DELETE_PATIENT';
      if (tarefa.actionType === 'CREATE_CLINIC') return l.actionType === 'DELETE_CLINIC';
      if (tarefa.actionType === 'CREATE_APPOINTMENT') return l.actionType === 'DELETE_APPOINTMENT';
      if (tarefa.actionType === 'SUBMIT_ANAMNESIS_FORM') return l.actionType === 'DELETE_ANAMNESIS';
      if (tarefa.actionType === 'SESSION_EVOLVED') return l.actionType === 'DELETE_SESSION';
      return false;
    });

    const concluida = matchingLogs.length > 0;
    const firstMatch = matchingLogs[0];
    const tentativas = matchingLogs.length + deleteLogs.length;

    // Calcular tempo: do momento que a ação anterior foi concluída até esta
    let tempoMs = null;
    if (firstMatch && firstMatch.metadata?.durationMs) {
      tempoMs = firstMatch.metadata.durationMs;
    }

    return {
      ...tarefa,
      concluida,
      timestamp: firstMatch ? toDate(firstMatch.createdAt) : null,
      tempoMs,
      tentativas: Math.max(tentativas, concluida ? 1 : 0),
      completionRate: firstMatch?.metadata?.completionRate || null,
      logId: firstMatch?.id || null,
    };
  });

  // Calcular tempo entre tarefas (delta sequencial)
  for (let i = 1; i < tasks.length; i++) {
    if (tasks[i].timestamp && tasks[i - 1].timestamp) {
      tasks[i].tempoEntreMs = tasks[i].timestamp.getTime() - tasks[i - 1].timestamp.getTime();
    }
  }

  return tasks;
}

/**
 * Analisa um único participante.
 */
function analyzeParticipant(email, logs) {
  const loginLog = logs.find(l => l.actionType === 'LOGIN');
  const lastLog = logs[logs.length - 1];
  const loginTime = toDate(loginLog?.createdAt);
  const lastTime = toDate(lastLog?.createdAt);

  const tempoTotalMs = (loginTime && lastTime) ? lastTime.getTime() - loginTime.getTime() : null;

  const tasks = analyzeParticipantTasks(logs);
  const tarefasConcluidas = tasks.filter(t => t.concluida).length;
  const taxaSucesso = (tarefasConcluidas / TAREFAS_ROTEIRO.length * 100);

  const totalAcoes = logs.length;
  const totalNavegacoes = logs.filter(l => l.actionType === 'NAVIGATE').length;
  const totalErros = logs.filter(l => ACOES_ERRO.includes(l.actionType)).length;
  const totalBuscas = logs.filter(l => l.actionType === 'SEARCH_SELECT').length;
  const totalPDFs = logs.filter(l => l.actionType.startsWith('EXPORT_PDF')).length;

  const navegacoes = logs.filter(l => l.actionType === 'NAVIGATE');
  const userAgent = parseUserAgent(logs[0]?.userAgent);

  // Páginas mais visitadas
  const pageVisits = {};
  navegacoes.forEach(n => {
    const dest = n.metadata?.to || 'desconhecido';
    pageVisits[dest] = (pageVisits[dest] || 0) + 1;
  });

  return {
    email,
    userAgent,
    loginTime,
    lastTime,
    tempoTotalMs,
    tempoTotalMin: tempoTotalMs ? tempoTotalMs / 60000 : null,
    totalAcoes,
    totalNavegacoes,
    totalErros,
    totalBuscas,
    totalPDFs,
    tarefasConcluidas,
    totalTarefas: TAREFAS_ROTEIRO.length,
    taxaSucesso,
    completouTodas: tarefasConcluidas === TAREFAS_ROTEIRO.length,
    tasks,
    navegacoes,
    pageVisits,
    logs,
  };
}

// ============================================================
// CSV GENERATORS
// ============================================================

/**
 * CSV 1 — Resumo de Participantes
 */
export function gerarCSVResumo(participants) {
  const headers = [
    'Participante', 'Navegador', 'Inicio_Sessao', 'Fim_Sessao',
    'Tempo_Total_Minutos', 'Total_Acoes', 'Total_Navegacoes', 'Total_Buscas',
    'Total_Erros_Retrabalho', 'Total_PDFs_Exportados',
    'Tarefas_Concluidas', 'Total_Tarefas', 'Taxa_Sucesso_Pct', 'Completou_Todas'
  ];

  const rows = participants.map(p => [
    p.email,
    p.userAgent,
    formatTimestamp(p.loginTime),
    formatTimestamp(p.lastTime),
    p.tempoTotalMin ? p.tempoTotalMin.toFixed(2) : '',
    p.totalAcoes,
    p.totalNavegacoes,
    p.totalBuscas,
    p.totalErros,
    p.totalPDFs,
    p.tarefasConcluidas,
    p.totalTarefas,
    p.taxaSucesso.toFixed(1),
    p.completouTodas ? 'Sim' : 'Não',
  ]);

  return buildCSV(headers, rows);
}

/**
 * CSV 2 — Tarefas por Participante
 */
export function gerarCSVTarefas(participants) {
  const headers = [
    'Participante', 'Tarefa_Numero', 'Tarefa_Nome', 'Descricao',
    'Concluida', 'Timestamp_Conclusao', 'Tempo_Entre_Tarefas_Seg',
    'Duracao_Formulario_Seg', 'Taxa_Preenchimento', 'Tentativas', 'Acao_Log'
  ];

  const rows = [];
  participants.forEach(p => {
    p.tasks.forEach(t => {
      rows.push([
        p.email,
        t.numero,
        t.nome,
        t.descricao,
        t.concluida ? 'Sim' : 'Não',
        formatTimestamp(t.timestamp),
        t.tempoEntreMs ? formatDurationSec(t.tempoEntreMs) : '',
        t.tempoMs ? formatDurationSec(t.tempoMs) : '',
        t.completionRate || '',
        t.tentativas,
        t.actionType,
      ]);
    });
  });

  return buildCSV(headers, rows);
}

/**
 * CSV 3 — Timeline Completa
 */
export function gerarCSVTimeline(participants) {
  const headers = [
    'Participante', 'Timestamp', 'Segundos_Desde_Login', 'Acao_Codigo',
    'Acao_Legivel', 'Duracao_Ms', 'Metadados'
  ];

  const rows = [];
  participants.forEach(p => {
    const loginTs = p.loginTime ? p.loginTime.getTime() : 0;

    p.logs.forEach(log => {
      const logTime = toDate(log.createdAt);
      const delta = (logTime && loginTs) ? ((logTime.getTime() - loginTs) / 1000).toFixed(1) : '';

      // Metadados sem campos pesados (userAgent)
      const meta = { ...log.metadata };
      const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

      rows.push([
        p.email,
        formatTimestamp(log.createdAt),
        delta,
        log.actionType,
        ACTION_LABELS[log.actionType] || log.actionType,
        log.metadata?.durationMs || '',
        metaStr,
      ]);
    });
  });

  return buildCSV(headers, rows);
}

/**
 * CSV 4 — Navegação e Fluxos
 */
export function gerarCSVNavegacao(participants) {
  const headers = [
    'Participante', 'Timestamp', 'Segundos_Desde_Login',
    'Pagina_Origem', 'Pagina_Destino', 'Tempo_Na_Pagina_Seg'
  ];

  const rows = [];
  participants.forEach(p => {
    const loginTs = p.loginTime ? p.loginTime.getTime() : 0;
    const navs = p.navegacoes;

    navs.forEach((nav, i) => {
      const navTime = toDate(nav.createdAt);
      const delta = (navTime && loginTs) ? ((navTime.getTime() - loginTs) / 1000).toFixed(1) : '';

      // Tempo na página = diferença até a próxima navegação
      let tempoNaPagina = '';
      if (i < navs.length - 1) {
        const nextTime = toDate(navs[i + 1].createdAt);
        if (navTime && nextTime) {
          tempoNaPagina = ((nextTime.getTime() - navTime.getTime()) / 1000).toFixed(1);
        }
      }

      rows.push([
        p.email,
        formatTimestamp(nav.createdAt),
        delta,
        nav.metadata?.from || '',
        nav.metadata?.to || '',
        tempoNaPagina,
      ]);
    });
  });

  return buildCSV(headers, rows);
}

/**
 * CSV 5 — Estatísticas Agregadas
 */
export function gerarCSVEstatisticas(participants) {
  const headers = ['Metrica', 'Valor', 'Detalhes'];
  const rows = [];

  const n = participants.length;
  rows.push(['Total de Participantes', n, '']);

  // Taxas de sucesso
  const taxas = participants.map(p => p.taxaSucesso);
  const completaramTodas = participants.filter(p => p.completouTodas).length;
  rows.push(['Taxa de Sucesso Média (%)', (taxas.reduce((a, b) => a + b, 0) / n).toFixed(1), '']);
  rows.push(['Participantes com 100% sucesso', completaramTodas, `${(completaramTodas / n * 100).toFixed(1)}%`]);

  // Tempos totais
  const tempos = participants.map(p => p.tempoTotalMs).filter(Boolean);
  if (tempos.length > 0) {
    const avgMs = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    rows.push(['Tempo Médio Total (min)', (avgMs / 60000).toFixed(2), `±${(stdDev(tempos) / 60000).toFixed(2)} min`]);
    rows.push(['Tempo Mediano Total (min)', (median(tempos) / 60000).toFixed(2), '']);
    rows.push(['Tempo Mínimo (min)', (Math.min(...tempos) / 60000).toFixed(2), '']);
    rows.push(['Tempo Máximo (min)', (Math.max(...tempos) / 60000).toFixed(2), '']);
  }

  // Total de ações
  const acoes = participants.map(p => p.totalAcoes);
  rows.push(['Ações Médias por Participante', (acoes.reduce((a, b) => a + b, 0) / n).toFixed(1), '']);
  rows.push(['Navegações Médias por Participante', (participants.map(p => p.totalNavegacoes).reduce((a, b) => a + b, 0) / n).toFixed(1), '']);

  // Erros
  const erros = participants.map(p => p.totalErros);
  const totalErros = erros.reduce((a, b) => a + b, 0);
  rows.push(['Total de Erros/Retrabalho (todos)', totalErros, '']);
  rows.push(['Erros Médios por Participante', (totalErros / n).toFixed(2), '']);

  rows.push(['', '', '']); // Linha vazia separadora
  rows.push(['=== ANÁLISE POR TAREFA ===', '', '']);

  // Por tarefa
  TAREFAS_ROTEIRO.forEach(tarefa => {
    const taskResults = participants.map(p => p.tasks.find(t => t.numero === tarefa.numero));
    const concluiram = taskResults.filter(t => t?.concluida).length;
    const taxaConclusao = (concluiram / n * 100).toFixed(1);

    // Tempos entre tarefas
    const temposEntre = taskResults.map(t => t?.tempoEntreMs).filter(Boolean);
    const avgTempoEntre = temposEntre.length > 0 ? (temposEntre.reduce((a, b) => a + b, 0) / temposEntre.length) : 0;

    // Tentativas
    const tentativas = taskResults.map(t => t?.tentativas || 0);
    const avgTentativas = (tentativas.reduce((a, b) => a + b, 0) / n).toFixed(2);

    rows.push([`Tarefa ${tarefa.numero}: ${tarefa.nome}`, '', '']);
    rows.push([`  → Taxa de Conclusão (%)`, taxaConclusao, `${concluiram}/${n} participantes`]);
    if (temposEntre.length > 0) {
      rows.push([`  → Tempo Médio (seg)`, (avgTempoEntre / 1000).toFixed(1), `±${(stdDev(temposEntre) / 1000).toFixed(1)}s | Mediana: ${(median(temposEntre) / 1000).toFixed(1)}s`]);
    }
    rows.push([`  → Tentativas Médias`, avgTentativas, '']);
  });

  // Tarefa mais difícil / fácil
  rows.push(['', '', '']);
  const taxasPorTarefa = TAREFAS_ROTEIRO.map(tarefa => {
    const concluiram = participants.filter(p => p.tasks.find(t => t.numero === tarefa.numero)?.concluida).length;
    return { ...tarefa, taxa: concluiram / n * 100 };
  });
  const maisF = taxasPorTarefa.reduce((a, b) => a.taxa > b.taxa ? a : b);
  const maisD = taxasPorTarefa.reduce((a, b) => a.taxa < b.taxa ? a : b);
  rows.push(['Tarefa Mais Fácil', `${maisF.nome}`, `${maisF.taxa.toFixed(1)}% de sucesso`]);
  rows.push(['Tarefa Mais Difícil', `${maisD.nome}`, `${maisD.taxa.toFixed(1)}% de sucesso`]);

  return buildCSV(headers, rows);
}

/**
 * CSV 6 — Erros e Dificuldades
 */
export function gerarCSVErros(participants) {
  const headers = [
    'Participante', 'Timestamp', 'Segundos_Desde_Login',
    'Tipo_Acao', 'Acao_Legivel', 'Categoria', 'Contexto'
  ];

  const rows = [];
  participants.forEach(p => {
    const loginTs = p.loginTime ? p.loginTime.getTime() : 0;

    // Erros explícitos (deletes, restores)
    p.logs.forEach(log => {
      if (!ACOES_ERRO.includes(log.actionType)) return;

      const logTime = toDate(log.createdAt);
      const delta = (logTime && loginTs) ? ((logTime.getTime() - loginTs) / 1000).toFixed(1) : '';

      let categoria = 'Retrabalho';
      if (log.actionType === 'RESTORE_PATIENT') categoria = 'Correção de Exclusão';
      if (log.actionType.includes('DELETE')) categoria = 'Exclusão/Retrabalho';

      const contexto = log.metadata ? JSON.stringify(log.metadata) : '';

      rows.push([
        p.email,
        formatTimestamp(log.createdAt),
        delta,
        log.actionType,
        ACTION_LABELS[log.actionType] || log.actionType,
        categoria,
        contexto,
      ]);
    });

    // Detectar navegação excessiva (mais de 3 navegações seguidas sem ação)
    let navSequence = 0;
    p.logs.forEach((log, i) => {
      if (log.actionType === 'NAVIGATE') {
        navSequence++;
        if (navSequence >= 4) {
          const logTime = toDate(log.createdAt);
          const delta = (logTime && loginTs) ? ((logTime.getTime() - loginTs) / 1000).toFixed(1) : '';
          rows.push([
            p.email,
            formatTimestamp(log.createdAt),
            delta,
            'EXCESSIVE_NAVIGATION',
            'Navegação Excessiva',
            'Confusão de Navegação',
            `${navSequence} navegações seguidas sem ação produtiva. Destinos: ${log.metadata?.from || '?'} → ${log.metadata?.to || '?'}`,
          ]);
        }
      } else {
        navSequence = 0;
      }
    });
  });

  return buildCSV(headers, rows);
}

// ============================================================
// MAIN EXPORT — Processa tudo e retorna os 6 CSVs
// ============================================================

/**
 * Processa todos os logs e gera os 6 relatórios.
 * 
 * @param {Array} logs - Logs brutos do Firebase (action_logs)
 * @param {string} emailPattern - Padrão de email para filtrar participantes (ex: '@teste.com')
 * @returns {{ participants: Array, csvs: { name: string, content: string }[], stats: Object }}
 */
export function processarRelatorioUsabilidade(logs, emailPattern = '@teste.com') {
  // 1. Agrupar por participante
  const groups = groupByParticipant(logs, emailPattern);

  // 2. Analisar cada participante
  const participants = Object.entries(groups)
    .map(([email, userLogs]) => analyzeParticipant(email, userLogs))
    .sort((a, b) => a.email.localeCompare(b.email));

  if (participants.length === 0) {
    return { participants: [], csvs: [], stats: { total: 0 } };
  }

  // 3. Gerar os 6 CSVs
  const csvs = [
    { name: '1_resumo_participantes.csv', content: gerarCSVResumo(participants) },
    { name: '2_tarefas_por_participante.csv', content: gerarCSVTarefas(participants) },
    { name: '3_timeline_completa.csv', content: gerarCSVTimeline(participants) },
    { name: '4_navegacao_fluxos.csv', content: gerarCSVNavegacao(participants) },
    { name: '5_metricas_estatisticas.csv', content: gerarCSVEstatisticas(participants) },
    { name: '6_erros_e_dificuldades.csv', content: gerarCSVErros(participants) },
  ];

  // 4. Stats para preview na UI
  const tempos = participants.map(p => p.tempoTotalMs).filter(Boolean);
  const stats = {
    total: participants.length,
    totalLogs: logs.length,
    completaramTodas: participants.filter(p => p.completouTodas).length,
    taxaMediaSucesso: (participants.reduce((a, p) => a + p.taxaSucesso, 0) / participants.length).toFixed(1),
    tempoMedioMin: tempos.length > 0 ? (tempos.reduce((a, b) => a + b, 0) / tempos.length / 60000).toFixed(1) : '—',
    totalErros: participants.reduce((a, p) => a + p.totalErros, 0),
  };

  return { participants, csvs, stats };
}
