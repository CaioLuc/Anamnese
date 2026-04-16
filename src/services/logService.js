import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

/**
 * Registra uma ação de auditoria / telemetria no banco de dados.
 * 
 * @param {string} actionType - O tipo da ação (Ex: 'LOGIN', 'CREATE_PATIENT', 'SESSION_EVOLVED')
 * @param {object} metadata - Dados adicionais relevantes (Ex: { durationMs: 15000, patientId: '...' })
 */
export async function trackAction(actionType, metadata = {}) {
  try {
    const user = auth.currentUser;
    // Evita erro se deslogar ou não tiver user (ex: rastreio de inicialização falha)
    if (!user) return; 

    const logData = {
      psicologoId: user.uid,
      psicologoEmail: user.email || 'desconhecido',
      actionType,
      metadata,
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent // Coletar o dispositivo/navegador pode ajudar em auditorias
    };

    const logsCol = collection(db, 'action_logs');
    // Adiciona de forma assíncrona sem bloquear a UI (não damos await onde for chamado a menos que seja crítico)
    await addDoc(logsCol, logData);

  } catch (error) {
    // Silencia o erro para não quebrar a aplicação caso o Firestore falhe por permissão ou cota
    console.warn("Telemetry log failed (ignored):", error);
  }
}
