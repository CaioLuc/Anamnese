import logger from '../utils/logger';

// Limite regulamentar do plano CARITAS para Líder Clínico
export const MAX_PSICOLOGOS_EQUIPE = 8;

export const STORAGE_KEY_EQUIPE = 'caritas_lider_equipe';
export const STORAGE_KEY_TRIAGEM = 'caritas_lider_triagem';

const memoryStore = {};

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function setStorageItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
    memoryStore[key] = val;
  } catch {
    memoryStore[key] = val;
  }
}

export function limparStorageLider() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_EQUIPE);
      localStorage.removeItem(STORAGE_KEY_TRIAGEM);
    }
  } catch {
    // storage cleanup fallback
  }
  delete memoryStore[STORAGE_KEY_EQUIPE];
  delete memoryStore[STORAGE_KEY_TRIAGEM];
}

// Equipe inicial demonstrativa para teste/desenvolvimento
const EQUIPE_INICIAL = [
  {
    id: 'psi-1',
    nome: 'Dra. Camila Alencar',
    crp: '06/142981',
    email: 'camila.alencar@clinica.com.br',
    especialidade: 'TCC - Transtornos de Ansiedade',
    maxPacientes: 25,
    pacientesAtivos: 21,
    sessoesMes: 64,
    evolucoesPendentes: 0,
    taxaPresenca: 94,
    status: 'ativo',
  },
  {
    id: 'psi-2',
    nome: 'Dr. Lucas Ferreira',
    crp: '06/158302',
    email: 'lucas.ferreira@clinica.com.br',
    especialidade: 'Psicanálise Adulto',
    maxPacientes: 25,
    pacientesAtivos: 24,
    sessoesMes: 72,
    evolucoesPendentes: 2, // Alerta > 48h
    taxaPresenca: 91,
    status: 'ativo',
  },
  {
    id: 'psi-3',
    nome: 'Dra. Juliana Prado',
    crp: '06/160441',
    email: 'juliana.prado@clinica.com.br',
    especialidade: 'Infanto-Juvenil e Parentalidade',
    maxPacientes: 20,
    pacientesAtivos: 14,
    sessoesMes: 48,
    evolucoesPendentes: 0,
    taxaPresenca: 96,
    status: 'ativo',
  },
  {
    id: 'psi-4',
    nome: 'Dr. Thiago Moraes',
    crp: '06/171203',
    email: 'thiago.moraes@clinica.com.br',
    especialidade: 'Fenomenologia Existencial',
    maxPacientes: 20,
    pacientesAtivos: 18,
    sessoesMes: 52,
    evolucoesPendentes: 1, // Alerta
    taxaPresenca: 88,
    status: 'ativo',
  },
];

const TRIAGEM_INICIAL = [
  {
    id: 'tri-1',
    nome: 'Carlos Eduardo Ramos',
    idade: 34,
    queixaResumo: 'Sintomas de Burnout e sobrecarga de trabalho',
    urgencia: 'alta',
    preferenciaAbordagem: 'TCC',
    dataCadastro: new Date().toISOString().split('T')[0],
  },
  {
    id: 'tri-2',
    nome: 'Ana Beatriz Souza',
    idade: 16,
    queixaResumo: 'Dificuldades escolares e isolamento social',
    urgencia: 'media',
    preferenciaAbordagem: 'Infanto-Juvenil',
    dataCadastro: new Date().toISOString().split('T')[0],
  },
];

/**
 * Carrega a equipe supervisionada pelo Líder Clínico
 */
export function obterEquipeLider() {
  try {
    const raw = getStorageItem(STORAGE_KEY_EQUIPE);
    if (!raw) {
      setStorageItem(STORAGE_KEY_EQUIPE, JSON.stringify(EQUIPE_INICIAL));
      return [...EQUIPE_INICIAL];
    }
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Erro ao ler equipe:', err);
    return [...EQUIPE_INICIAL];
  }
}

/**
 * Salva a lista de membros no storage
 */
export function salvarEquipeLider(equipe) {
  try {
    setStorageItem(STORAGE_KEY_EQUIPE, JSON.stringify(equipe));
  } catch (err) {
    logger.error('Erro ao salvar equipe:', err);
  }
}

/**
 * Adiciona um psicólogo à equipe (limite de 8 profissionais)
 */
export function adicionarMembroEquipe(membro) {
  const equipe = obterEquipeLider();
  if (equipe.length >= MAX_PSICOLOGOS_EQUIPE) {
    throw new Error(`Limite máximo atingido: a equipe de supervisão pode ter até ${MAX_PSICOLOGOS_EQUIPE} psicólogos.`);
  }

  const novoMembro = {
    id: `psi-${Date.now()}`,
    nome: membro.nome || 'Novo Psicólogo',
    crp: membro.crp || '00/000000',
    email: membro.email || '',
    especialidade: membro.especialidade || 'Psicologia Clínica Geral',
    maxPacientes: Number(membro.maxPacientes) || 25,
    pacientesAtivos: 0,
    sessoesMes: 0,
    evolucoesPendentes: 0,
    taxaPresenca: 100,
    status: 'ativo',
    ...membro,
  };

  const novaEquipe = [...equipe, novoMembro];
  salvarEquipeLider(novaEquipe);
  return novoMembro;
}

/**
 * Remove psicólogo da equipe
 */
export function removerMembroEquipe(psicologoId) {
  const equipe = obterEquipeLider();
  const novaEquipe = equipe.filter((p) => p.id !== psicologoId);
  salvarEquipeLider(novaEquipe);
  return novaEquipe;
}

/**
 * Calcula os KPIs consolidados da equipe clínica
 */
export function calcularMetricasEquipe(equipe) {
  const totalProfissionais = equipe.length;
  const totalPacientesAtivos = equipe.reduce((acc, p) => acc + (p.pacientesAtivos || 0), 0);
  const capacidadeTotal = equipe.reduce((acc, p) => acc + (p.maxPacientes || 25), 0);
  const totalSessoesMes = equipe.reduce((acc, p) => acc + (p.sessoesMes || 0), 0);
  const totalPendencias48h = equipe.reduce((acc, p) => acc + (p.evolucoesPendentes || 0), 0);

  const taxaOcupacaoGeral = capacidadeTotal > 0
    ? Math.round((totalPacientesAtivos / capacidadeTotal) * 100)
    : 0;

  const somaPresenca = equipe.reduce((acc, p) => acc + (p.taxaPresenca || 0), 0);
  const mediaPresenca = totalProfissionais > 0
    ? Math.round(somaPresenca / totalProfissionais)
    : 100;

  return {
    totalProfissionais,
    capacidadeEquipe: MAX_PSICOLOGOS_EQUIPE,
    totalPacientesAtivos,
    capacidadeTotal,
    taxaOcupacaoGeral,
    totalSessoesMes,
    totalPendencias48h,
    mediaPresenca,
  };
}

/**
 * Carrega fila de triagem
 */
export function obterFilaTriagem() {
  try {
    const raw = getStorageItem(STORAGE_KEY_TRIAGEM);
    if (!raw) {
      setStorageItem(STORAGE_KEY_TRIAGEM, JSON.stringify(TRIAGEM_INICIAL));
      return [...TRIAGEM_INICIAL];
    }
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Erro ao ler triagem:', err);
    return [...TRIAGEM_INICIAL];
  }
}

/**
 * Salva a fila de triagem
 */
export function salvarFilaTriagem(triagem) {
  try {
    setStorageItem(STORAGE_KEY_TRIAGEM, JSON.stringify(triagem));
  } catch (err) {
    logger.error('Erro ao salvar triagem:', err);
  }
}

/**
 * Encaminha paciente da triagem para psicólogo da equipe
 */
export function encaminharPacienteTriagem(pacienteTriagemId, psicologoId) {
  const triagem = obterFilaTriagem();
  const paciente = triagem.find((t) => t.id === pacienteTriagemId);
  if (!paciente) throw new Error('Paciente não encontrado na triagem.');

  const equipe = obterEquipeLider();
  const psiIndex = equipe.findIndex((p) => p.id === psicologoId);
  if (psiIndex === -1) throw new Error('Psicólogo não encontrado na equipe.');

  // Incrementa paciente ativo do profissional
  equipe[psiIndex].pacientesAtivos = (equipe[psiIndex].pacientesAtivos || 0) + 1;
  salvarEquipeLider(equipe);

  // Remove da fila de triagem
  const novaTriagem = triagem.filter((t) => t.id !== pacienteTriagemId);
  salvarFilaTriagem(novaTriagem);

  return { paciente, psicologo: equipe[psiIndex] };
}
