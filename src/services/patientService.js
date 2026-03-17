import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig.js';

const PACIENTES_COL = 'pacientes';
const ANAMNESES_COL = 'anamneses';
const SESSOES_COL = 'sessoes';

// ==========================================
// CRUD: PACIENTES
// ==========================================

export async function criarPaciente(pacienteData) {
  // pacienteData: { nome, data_nascimento, telefone, cpf }
  try {
    const docRef = await addDoc(collection(db, PACIENTES_COL), {
      ...pacienteData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar paciente:", error);
    throw error;
  }
}

export async function lerPacientes() {
  try {
    const qSnapshot = await getDocs(collection(db, PACIENTES_COL));
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao ler pacientes:", error);
    throw error;
  }
}

export async function lerPaciente(id) {
  try {
    const docRef = doc(db, PACIENTES_COL, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Erro ao ler paciente:", error);
    throw error;
  }
}

export async function atualizarPaciente(id, dadosAtualizados) {
  try {
    const docRef = doc(db, PACIENTES_COL, id);
    await updateDoc(docRef, dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    throw error;
  }
}

export async function deletarPaciente(id) {
  try {
    const docRef = doc(db, PACIENTES_COL, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar paciente:", error);
    throw error;
  }
}


// ==========================================
// CRUD: ANAMNESES
// ==========================================

export async function criarAnamnese(anamneseData) {
  // anamneseData: { id_paciente, queixa_principal, historico_familiar, observacoes_iniciais }
  try {
    const docRef = await addDoc(collection(db, ANAMNESES_COL), {
      ...anamneseData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar anamnese:", error);
    throw error;
  }
}

export async function lerAnamnesesDoPaciente(id_paciente) {
  try {
    const q = query(collection(db, ANAMNESES_COL), where("id_paciente", "==", id_paciente));
    const qSnapshot = await getDocs(q);
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by creation date
    return docs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Erro ao ler anamneses do paciente:", error);
    throw error;
  }
}

export async function lerAnamnese(id) {
  try {
    const docRef = doc(db, ANAMNESES_COL, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Erro ao ler anamnese:", error);
    throw error;
  }
}

export async function atualizarAnamnese(id, dadosAtualizados) {
  try {
    const docRef = doc(db, ANAMNESES_COL, id);
    await updateDoc(docRef, dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar anamnese:", error);
    throw error;
  }
}

export async function deletarAnamnese(id) {
  try {
    const docRef = doc(db, ANAMNESES_COL, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar anamnese:", error);
    throw error;
  }
}


// ==========================================
// CRUD: SESSÕES (EVOLUÇÃO)
// ==========================================

export async function criarSessao(sessaoData) {
  // sessaoData: { id_paciente, data_sessao, evolucao_notas }
  try {
    const docRef = await addDoc(collection(db, SESSOES_COL), {
      ...sessaoData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar sessão de evolução:", error);
    throw error;
  }
}

export async function lerSessoesDoPaciente(id_paciente) {
  try {
    const q = query(collection(db, SESSOES_COL), where("id_paciente", "==", id_paciente));
    const qSnapshot = await getDocs(q);
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort descending by session date or creation date
    return docs.sort((a, b) => {
      const dateA = a.data_sessao ? new Date(a.data_sessao) : (a.createdAt?.toDate() || new Date(0));
      const dateB = b.data_sessao ? new Date(b.data_sessao) : (b.createdAt?.toDate() || new Date(0));
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Erro ao ler sessões do paciente:", error);
    throw error;
  }
}
