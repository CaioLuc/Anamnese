import { collection, collectionGroup, doc, getDoc, getDocs, updateDoc, setDoc, serverTimestamp, query, orderBy, limit, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

// ==========================================
// ADMIN: Lista de e-mails com permissão de admin
// ==========================================
const ADMIN_EMAILS = [
  '241.14.035@uniriosead.com',
  // Adicione mais e-mails admin aqui
];

export function isAdminEmail(email) {
  if (!email) return false;
  const emailLimpo = email.trim().toLowerCase();
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(emailLimpo);
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
    console.error("Erro ao listar psicólogos:", error);
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
    console.error("Erro ao obter métricas:", error);
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
    console.error("Erro ao contar pacientes:", error);
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
  } catch (error) {
    console.error("Erro ao atualizar plano:", error);
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
  } catch (error) {
    console.error("Erro ao mudar status:", error);
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
  } catch (error) {
    console.error("Erro ao atualizar trial:", error);
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
  } catch (error) {
    console.error("Erro ao salvar aviso:", error);
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao obter logs de auditoria:", error);
    return [];
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
    console.error("Erro ao limpar logs:", error);
    throw error;
  }
}
