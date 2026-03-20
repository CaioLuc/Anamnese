import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

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
      userId: auth.currentUser.uid,
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
    const q = query(collection(db, PACIENTES_COL), where("userId", "==", auth.currentUser.uid));
    const qSnapshot = await getDocs(q);
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Apenas pacientes que NÃO estão na lixeira
    return docs.filter(p => !p.deletedAt);
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
    // SOFT DELETE: Mover para lixeira em vez de exclusão física imediata
    const docRef = doc(db, PACIENTES_COL, id);
    await updateDoc(docRef, { deletedAt: serverTimestamp() });
  } catch (error) {
    console.error("Erro ao mover paciente para lixeira:", error);
    throw error;
  }
}

// ==========================================
// FUNÇÕES DA LIXEIRA (GARBAGE COLLECTOR)
// ==========================================

export async function limparLixeiraPacientes(diasRetencao = 7) {
  try {
    const q = query(collection(db, PACIENTES_COL), where("userId", "==", auth.currentUser.uid));
    const qSnapshot = await getDocs(q);
    const todos = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lixeira = todos.filter(p => p.deletedAt);

    const agora = new Date();
    const batch = writeBatch(db);
    let itemsNoBatch = 0;

    for (const pac of lixeira) {
      const deletedDate = pac.deletedAt?.toDate ? pac.deletedAt.toDate() : new Date();
      const diasNaLixeira = (agora - deletedDate) / (1000 * 60 * 60 * 24);

      if (diasNaLixeira >= diasRetencao) {
        // Exclusão Definitiva (Hard Delete)
        // 1. Deleta anamneses vinculadas
        const qAnam = query(collection(db, ANAMNESES_COL), where("id_paciente", "==", pac.id));
        const snapAnam = await getDocs(qAnam);
        snapAnam.forEach(d => { batch.delete(d.ref); itemsNoBatch++; });

        // 2. Deleta sessões vinculadas
        const qSess = query(collection(db, SESSOES_COL), where("id_paciente", "==", pac.id));
        const snapSess = await getDocs(qSess);
        snapSess.forEach(d => { batch.delete(d.ref); itemsNoBatch++; });

        // 3. Deleta o paciente
        batch.delete(doc(db, PACIENTES_COL, pac.id));
        itemsNoBatch++;
      }
    }

    if (itemsNoBatch > 0) {
      await batch.commit();
      console.log(`Lixeira limpa: ${itemsNoBatch} documentos deletados definitivamente.`);
    }
  } catch (error) {
    console.error("Erro ao limpar lixeira de pacientes:", error);
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
      userId: auth.currentUser.uid,
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
    const q = query(
      collection(db, ANAMNESES_COL), 
      where("id_paciente", "==", id_paciente),
      where("userId", "==", auth.currentUser.uid)
    );
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
      userId: auth.currentUser.uid,
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
    const q = query(
      collection(db, SESSOES_COL), 
      where("id_paciente", "==", id_paciente),
      where("userId", "==", auth.currentUser.uid)
    );
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

export async function deletarSessao(id) {
  try {
    const docRef = doc(db, SESSOES_COL, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    throw error;
  }
}

export async function atualizarSessao(id, dadosAtualizados) {
  try {
    const docRef = doc(db, SESSOES_COL, id);
    await updateDoc(docRef, dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar sessão:", error);
    throw error;
  }
}

// ==========================================
// QUERIES GLOBAIS (para Dashboard)
// ==========================================

export async function lerTodasSessoes() {
  try {
    const q = query(collection(db, SESSOES_COL), where("userId", "==", auth.currentUser.uid));
    const qSnapshot = await getDocs(q);
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao ler todas as sessões:", error);
    throw error;
  }
}

export async function lerTodasAnamneses() {
  try {
    const q = query(collection(db, ANAMNESES_COL), where("userId", "==", auth.currentUser.uid));
    const qSnapshot = await getDocs(q);
    return qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao ler todas as anamneses:", error);
    throw error;
  }
}


// ==========================================
// MIGRAÇÃO: VINCULAR DADOS ÓRFÃOS
// ==========================================

export async function vincularDadosAoUsuarioAtual() {
  const uid = auth.currentUser?.uid;
  if (!uid) return { success: false, message: "Usuário não autenticado." };

  try {
    const collections = [PACIENTES_COL, ANAMNESES_COL, SESSOES_COL];
    let totalMigrados = 0;

    for (const colName of collections) {
      const q = query(collection(db, colName)); // Pega tudo
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.userId) { // Se não tiver dono
          batch.update(docSnap.ref, { userId: uid });
          count++;
          totalMigrados++;
        }
      });

      if (count > 0) await batch.commit();
    }

    return { success: true, message: `${totalMigrados} registros foram vinculados à sua conta.` };
  } catch (error) {
    console.error("Erro na migração:", error);
    throw error;
  }
}

// ==========================================
// CRUD: QUESTIONÁRIOS (TEMPLATES)
// ==========================================

const QUESTIONARIOS_COL = 'questionarios';

export async function criarQuestionario(dados) {
  try {
    const docRef = await addDoc(collection(db, QUESTIONARIOS_COL), {
      ...dados,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar questionário:", error);
    throw error;
  }
}

export async function lerQuestionarios() {
  try {
    const q = query(
      collection(db, QUESTIONARIOS_COL),
      where("userId", "==", auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => {
      const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dB - dA;
    });
  } catch (error) {
    console.error("Erro ao ler questionários:", error);
    throw error;
  }
}

export async function lerQuestionario(id) {
  try {
    const docRef = doc(db, QUESTIONARIOS_COL, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    return null;
  } catch (error) {
    console.error("Erro ao ler questionário:", error);
    throw error;
  }
}

export async function atualizarQuestionario(id, dados) {
  try {
    const docRef = doc(db, QUESTIONARIOS_COL, id);
    await updateDoc(docRef, { ...dados, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Erro ao atualizar questionário:", error);
    throw error;
  }
}

export async function deletarQuestionario(id) {
  try {
    await deleteDoc(doc(db, QUESTIONARIOS_COL, id));
  } catch (error) {
    console.error("Erro ao deletar questionário:", error);
    throw error;
  }
}

export async function duplicarQuestionario(id) {
  try {
    const original = await lerQuestionario(id);
    if (!original) throw new Error("Questionário não encontrado.");
    const { id: _id, createdAt: _c, updatedAt: _u, ...dados } = original;
    const novoId = await criarQuestionario({ ...dados, nome: `${dados.nome} (cópia)` });
    return novoId;
  } catch (error) {
    console.error("Erro ao duplicar questionário:", error);
    throw error;
  }
}
