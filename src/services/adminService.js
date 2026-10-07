import { collection, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query, orderBy, limit, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';
import { trackAction, obterLogsLocais } from './logService';
import logger from '../utils/logger';

// ==========================================
// ADMIN: Lista de e-mails com permissão de admin
// Bootstrap fallback — garante acesso mesmo se Firestore estiver vazio
// ==========================================
const BOOTSTRAP_ADMIN_EMAIL = '241.14.035@uniriosead.com';

// Cache local de e-mails admin (carregado do Firestore)
let _adminEmailsCache = null;

/**
 * Carrega a lista de admins do Firestore (coleção `admins`).
 * Usa cache em memória para evitar queries repetidas.
 */
async function loadAdminEmails() {
  if (_adminEmailsCache) return _adminEmailsCache;
  try {
    const adminsCol = collection(db, 'admins');
    const snap = await getDocs(adminsCol);
    _adminEmailsCache = snap.docs.map(d => (d.data().email || '').toLowerCase());
    return _adminEmailsCache;
  } catch (e) {
    logger.error('Erro ao carregar admins do Firestore:', e);
    return [BOOTSTRAP_ADMIN_EMAIL.toLowerCase()];
  }
}

/**
 * Verifica se um e-mail é de admin.
 * Primeiro verifica o fallback bootstrap, depois consulta Firestore.
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const emailLimpo = email.trim().toLowerCase();
  // Bootstrap fallback — sempre funciona, mesmo sem Firestore
  if (emailLimpo === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return true;
  // Se cache já carregou, verifica nele também
  if (_adminEmailsCache) return _adminEmailsCache.includes(emailLimpo);
  return false;
}

/**
 * Versão async de isAdminEmail — consulta Firestore se cache não existe.
 */
export async function isAdminEmailAsync(email) {
  if (!email) return false;
  const emailLimpo = email.trim().toLowerCase();
  if (emailLimpo === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return true;
  const emails = await loadAdminEmails();
  return emails.includes(emailLimpo);
}

/**
 * Invalida o cache de admins (chamado ao adicionar/remover admin).
 */
export function invalidarCacheAdmins() {
  _adminEmailsCache = null;
}

// ==========================================
// ADMIN: Verificar se o doc admin existe no Firestore
// ==========================================
export async function verificarOuCriarAdmin() {
  const uid = auth.currentUser?.uid;
  const email = auth.currentUser?.email;
  if (!uid || !isAdminEmail(email)) return false;

  const adminRef = doc(db, 'admins', uid);
  const snap = await getDoc(adminRef);
  if (!snap.exists()) {
    await setDoc(adminRef, { email, createdAt: serverTimestamp() });
  }
  return true;
}

// ==========================================
// ADMIN: Listar todos os psicólogos
// ==========================================
export async function listarTodosPsicologos() {
  try {
    const psicologosCol = collection(db, 'psicologos');
    const snapshot = await getDocs(psicologosCol);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
  } catch (error) {
    logger.error("Erro ao listar psicólogos:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: Obter métricas detalhadas de um psicólogo
// ==========================================
export async function getMetricasPsicologo(uid) {
  try {
    const pacientesCol = collection(db, 'psicologos', uid, 'pacientes');
    const pacientesSnap = await getDocs(pacientesCol);
    const totalPacientes = pacientesSnap.size;

    let totalSessoes = 0;
    let totalAnamneses = 0;

    for (const pacDoc of pacientesSnap.docs) {
      try {
        const sessoesCol = collection(db, 'psicologos', uid, 'pacientes', pacDoc.id, 'sessoes');
        const sessoesSnap = await getDocs(sessoesCol);
        totalSessoes += sessoesSnap.size;

        const anamnesesCol = collection(db, 'psicologos', uid, 'pacientes', pacDoc.id, 'anamneses');
        const anamnesesSnap = await getDocs(anamnesesCol);
        totalAnamneses += anamnesesSnap.size;
      } catch (e) {
        // Erro individual por paciente, não impede os outros
      }
    }

    return { totalPacientes, totalSessoes, totalAnamneses };
  } catch (error) {
    logger.error("Erro ao obter métricas:", error);
    return { totalPacientes: 0, totalSessoes: 0, totalAnamneses: 0 };
  }
}

// ==========================================
// ADMIN: Contagem rápida de pacientes (usada na tabela)
// ==========================================
export async function contarPacientesDoPsicologo(uid) {
  try {
    const pacientesCol = collection(db, 'psicologos', uid, 'pacientes');
    const snapshot = await getDocs(pacientesCol);
    return snapshot.size;
  } catch (error) {
    logger.error("Erro ao contar pacientes:", error);
    return 0;
  }
}

// ==========================================
// ADMIN: Atualizar plano de um psicólogo
// ==========================================
export async function atualizarPlanoPsicologo(uid, plano) {
  try {
    const config = {
      basico: { plano: 'basico', max_locais: 1 },
      profissional: { plano: 'profissional', max_locais: 4 },
    };
    const dados = config[plano] || config.basico;
    const psicRef = doc(db, 'psicologos', uid);
    await updateDoc(psicRef, {
      ...dados,
      updatedAt: serverTimestamp()
    });
    await trackAction('UPDATE_PLAN_PSYCHOLOGIST', { targetUid: uid, plano });
  } catch (error) {
    logger.error("Erro ao atualizar plano:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: Ativar / Desativar psicólogo
// ==========================================
export async function toggleAtivoPsicologo(uid, ativo) {
  try {
    const psicRef = doc(db, 'psicologos', uid);
    await updateDoc(psicRef, {
      ativo: ativo,
      updatedAt: serverTimestamp()
    });
    await trackAction('TOGGLE_ACTIVE_PSYCHOLOGIST', { targetUid: uid, ativo });
  } catch (error) {
    logger.error("Erro ao mudar status:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: Excluir perfil de psicólogo (CFP / LGPD)
// ==========================================
export async function excluirPerfilPsicologo(uid, email = '') {
  try {
    const psicRef = doc(db, 'psicologos', uid);
    await deleteDoc(psicRef);
    await trackAction('DELETE_PSYCHOLOGIST_PROFILE', { targetUid: uid, email });
    return true;
  } catch (error) {
    logger.error("Erro ao excluir perfil de psicólogo:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: Atualizar Trial / Vencimento
// ==========================================
export async function atualizarTrialPsicologo(uid, dataVencimento) {
  try {
    const psicRef = doc(db, 'psicologos', uid);
    await updateDoc(psicRef, {
      trialAte: dataVencimento,
      updatedAt: serverTimestamp()
    });
    await trackAction('UPDATE_TRIAL_PSYCHOLOGIST', { targetUid: uid, dataVencimento });
  } catch (error) {
    logger.error("Erro ao atualizar trial:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: Salvar aviso global
// ==========================================
export async function salvarAvisoGlobal(mensagem) {
  try {
    const avisoRef = doc(db, 'config', 'aviso_global');
    await setDoc(avisoRef, {
      mensagem: mensagem || '',
      ativo: !!mensagem,
      updatedAt: serverTimestamp()
    });
    await trackAction('SAVE_GLOBAL_NOTICE', { ativo: !!mensagem, mensagemLength: mensagem?.length || 0 });
  } catch (error) {
    logger.error("Erro ao salvar aviso:", error);
    throw error;
  }
}

export async function lerAvisoGlobal() {
  try {
    const avisoRef = doc(db, 'config', 'aviso_global');
    const snap = await getDoc(avisoRef);
    if (snap.exists()) return snap.data();
    return { mensagem: '', ativo: false };
  } catch (error) {
    return { mensagem: '', ativo: false };
  }
}

// ==========================================
// ADMIN: Estatísticas globais
// ==========================================
export async function getEstatisticasGlobais(psicologos) {
  const total = psicologos.length;
  const ativos = psicologos.filter(p => p.ativo !== false).length;
  const inativos = total - ativos;
  const basicos = psicologos.filter(p => !p.plano || p.plano === 'basico').length;
  const profissionais = psicologos.filter(p => p.plano === 'profissional').length;
  return { total, ativos, inativos, basicos, profissionais };
}

// ==========================================
// ADMIN: LOGS (Auditoria)
// ==========================================
export async function obterLogsAuditoria(maxResults = 250) {
  try {
    const logsCol = collection(db, 'action_logs');
    const q = query(logsCol, orderBy('createdAt', 'desc'), limit(maxResults));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
    return obterLogsLocais();
  } catch (error) {
    logger.error("Erro ao obter logs de auditoria do Firestore, utilizando fallback local:", error);
    return obterLogsLocais();
  }
}

export async function limparLogsAntigos(dias = 30) {
  try {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);

    const logsCol = collection(db, 'action_logs');
    // We cannot easily delete by batch without writing more logic, 
    // but a simple loop works fine for reasonable retention limits
    const q = query(logsCol, where('createdAt', '<', dataLimite), limit(500));
    const snapshot = await getDocs(q);
    
    let deletados = 0;
    for (const d of snapshot.docs) {
      await deleteDoc(d.ref);
      deletados++;
    }
    return deletados;
  } catch (error) {
    logger.error("Erro ao limpar logs:", error);
    throw error;
  }
}

// ==========================================
// ADMIN: GESTÃO DE CLIENTES / CLÍNICAS & LIMITES DO LÍDER
// ==========================================
const STORAGE_KEY_CLIENTES = 'caritas_admin_clientes_clinicas';

const CLIENTES_PADRAO = [
  {
    id: 'cli-padrao-1',
    nomeClinica: 'Clínica Saúde & Harmonia',
    emailLider: 'lider.clinica@caritas.com.br',
    maxPsicologos: 8,
    maxPacientesPorPsicologo: 20,
    status: 'ativo',
    observacoes: 'Contrato Padrão Equipe — 8 Psicólogos / 20 Pacientes cada',
    psicologos: [
      'camila.alencar@clinica.com.br',
      'lucas.ferreira@clinica.com.br',
      'juliana.prado@clinica.com.br',
      'thiago.moraes@clinica.com.br'
    ],
    createdAt: new Date().toISOString(),
  }
];

function getClientesStorageLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLIENTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(CLIENTES_PADRAO));
      return [...CLIENTES_PADRAO];
    }
    return JSON.parse(raw);
  } catch {
    return [...CLIENTES_PADRAO];
  }
}

function setClientesStorageLocal(lista) {
  try {
    localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(lista));
  } catch (err) {
    logger.warn('Erro ao salvar clientes localmente:', err);
  }
}

export async function listarClientesClinicas() {
  try {
    const colRef = collection(db, 'clinicas_clientes');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClientesStorageLocal(docs);
      return docs;
    }
    return getClientesStorageLocal();
  } catch (error) {
    logger.error("Erro ao listar clientes clínicas do Firestore (usando fallback local):", error);
    return getClientesStorageLocal();
  }
}

export async function salvarClienteClinica(cliente) {
  const localList = getClientesStorageLocal();
  const id = cliente.id || `cli-${Date.now()}`;
  const payload = {
    ...cliente,
    id,
    maxPsicologos: Number(cliente.maxPsicologos) || 8,
    maxPacientesPorPsicologo: Number(cliente.maxPacientesPorPsicologo) || 20,
    emailLider: (cliente.emailLider || '').trim().toLowerCase(),
    psicologos: Array.isArray(cliente.psicologos) ? cliente.psicologos : [],
    status: cliente.status || 'ativo',
    updatedAt: new Date().toISOString(),
  };

  // Atualiza cache local
  const index = localList.findIndex(c => c.id === id);
  if (index >= 0) {
    localList[index] = payload;
  } else {
    localList.unshift(payload);
  }
  setClientesStorageLocal(localList);

  // Persiste no Firestore
  try {
    const docRef = doc(db, 'clinicas_clientes', id);
    await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    logger.error("Erro ao persistir cliente clínica no Firestore:", err);
  }

  return payload;
}

export async function atualizarLimitesCliente(id, novosLimites) {
  const localList = getClientesStorageLocal();
  const index = localList.findIndex(c => c.id === id);
  if (index >= 0) {
    localList[index] = {
      ...localList[index],
      ...novosLimites,
      updatedAt: new Date().toISOString()
    };
    setClientesStorageLocal(localList);
  }

  try {
    const docRef = doc(db, 'clinicas_clientes', id);
    await updateDoc(docRef, {
      ...novosLimites,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    logger.error("Erro ao atualizar limites no Firestore:", err);
  }

  return localList[index];
}

export async function deletarClienteClinica(id) {
  const localList = getClientesStorageLocal();
  const novaLista = localList.filter(c => c.id !== id);
  setClientesStorageLocal(novaLista);

  try {
    const docRef = doc(db, 'clinicas_clientes', id);
    await deleteDoc(docRef);
  } catch (err) {
    logger.error("Erro ao remover cliente clínica do Firestore:", err);
  }

  return true;
}

export function obterConfigClientePorEmail(email) {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  const clientes = getClientesStorageLocal();

  // Verifica se o email é líder
  const comoLider = clientes.find(c => (c.emailLider || '').toLowerCase() === cleanEmail);
  if (comoLider) {
    return {
      clienteId: comoLider.id,
      nomeClinica: comoLider.nomeClinica,
      isLider: true,
      maxPsicologos: comoLider.maxPsicologos || 8,
      maxPacientesPorPsicologo: comoLider.maxPacientesPorPsicologo || 20,
      status: comoLider.status,
    };
  }

  // Verifica se o email é membro da equipe de psicólogos de alguma clínica
  const comoMembro = clientes.find(c => 
    (c.psicologos || []).some(p => (typeof p === 'string' ? p : p.email || '').toLowerCase() === cleanEmail)
  );
  if (comoMembro) {
    return {
      clienteId: comoMembro.id,
      nomeClinica: comoMembro.nomeClinica,
      isLider: false,
      maxPsicologos: comoMembro.maxPsicologos || 8,
      maxPacientesPorPsicologo: comoMembro.maxPacientesPorPsicologo || 20,
      status: comoMembro.status,
    };
  }

  return null;
}
