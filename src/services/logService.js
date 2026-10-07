import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import logger from '../utils/logger';

const OFFLINE_LOGS_KEY = 'caritas_offline_action_logs';

function getOfflineLogs() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(OFFLINE_LOGS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineLog(logData) {
  try {
    if (typeof localStorage === 'undefined') return;
    const logs = getOfflineLogs();
    logs.unshift(logData);
    if (logs.length > 300) logs.length = 300;
    localStorage.setItem(OFFLINE_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    logger.warn('Erro ao armazenar log offline:', e);
  }
}

export function obterLogsLocais() {
  return getOfflineLogs();
}

export function limparLogsLocais() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(OFFLINE_LOGS_KEY);
    }
  } catch (e) {
    logger.warn('Erro ao limpar logs locais:', e);
  }
}

/**
 * Registra uma ação de auditoria / telemetria no banco de dados.
 * Suporta persistência resiliente mesmo quando o usuário ainda não realizou login
 * ou em instabilidades de rede / offline.
 * 
 * @param {string} actionType - O tipo da ação (Ex: 'LOGIN', 'CREATE_PATIENT', 'SESSION_EVOLVED')
 * @param {object} metadata - Dados adicionais relevantes (Ex: { durationMs: 15000, patientId: '...' })
 */
export async function trackAction(actionType, metadata = {}) {
  try {
    const user = auth?.currentUser;
    // Identificação do responsável (usuário autenticado ou extraído do metadata de ação pré-auth/admin)
    const psicologoId = user?.uid || metadata.uid || metadata.psicologoId || 'sistema';
    const psicologoEmail = user?.email || metadata.email || metadata.psicologoEmail || 'sistema@caritas.app';

    const logData = {
      psicologoId,
      psicologoEmail,
      actionType,
      metadata: { ...metadata },
      createdAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown'
    };

    // Sempre salva localmente para garantia de auditoria e resposta imediata
    saveOfflineLog(logData);

    // Persiste no Firestore
    if (db) {
      const logsCol = collection(db, 'action_logs');
      await addDoc(logsCol, {
        ...logData,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    // Silencia erro para não quebrar a UI caso o Firestore falhe por permissão ou cota
    logger.warn("Telemetry log Firestore fallback (offline armazenado):", error);
  }
}
