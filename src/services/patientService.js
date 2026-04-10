import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

const PACIENTES_COL = 'pacientes';
const ANAMNESES_COL = 'anamneses';
const SESSOES_COL = 'sessoes';
const QUESTIONARIOS_COL = 'questionarios';
const CLINICAS_COL = 'clinicas';

// ==========================================
// HELPERS: PATH GENERATION
// ==========================================

function getPsicologoRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado.");
  return doc(db, 'psicologos', uid);
}

function getPacientesRef() {
  return collection(getPsicologoRef(), PACIENTES_COL);
}

function getPacienteDoc(id) {
  return doc(getPsicologoRef(), PACIENTES_COL, id);
}

function getAnamnesesRef(pacienteId) {
  return collection(getPacienteDoc(pacienteId), ANAMNESES_COL);
}

function getSessoesRef(pacienteId) {
  return collection(getPacienteDoc(pacienteId), SESSOES_COL);
}

function getQuestionariosRef() {
  return collection(getPsicologoRef(), QUESTIONARIOS_COL);
}

function getClinicasRef() {
  return collection(getPsicologoRef(), CLINICAS_COL);
}

function getClinicaDoc(id) {
  return doc(getPsicologoRef(), CLINICAS_COL, id);
}

// ==========================================
// PERFIL DO PSICÓLOGO (plano, ativo, etc.)
// ==========================================

export async function lerPerfilPsicologo() {
  try {
    const ref = getPsicologoRef();
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("Erro ao ler perfil:", error);
    return null;
  }
}

export async function salvarPerfilPsicologo(dados) {
  try {
    const ref = getPsicologoRef();
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...dados, updatedAt: serverTimestamp() });
    } else {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(ref, {
        email: auth.currentUser?.email || '',
        plano: 'basico',
        ativo: true,
        max_locais: 1,
        ...dados,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    throw error;
  }
}

// ==========================================
// CRUD: PACIENTES
// ==========================================

export async function criarPaciente(pacienteData) {
  try {
    const docRef = await addDoc(getPacientesRef(), {
      ...pacienteData,
      userId: auth.currentUser.uid, // Mantido para compatibilidade/migração fácil
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
    const qSnapshot = await getDocs(getPacientesRef());
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Apenas pacientes que NÃO estão na lixeira
    return docs.filter(p => !p.deletedAt);
  } catch (error) {
    console.error("Erro ao ler pacientes:", error);
    throw error;
  }
}

// Busca paciente pelo CPF (normalizado, só dígitos)
export async function buscarPacientePorCPF(cpf) {
  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfLimpo) return null;
    const todos = await lerPacientes();
    return todos.find(p => p.cpf && p.cpf.replace(/\D/g, '') === cpfLimpo) || null;
  } catch (error) {
    console.error("Erro ao buscar paciente por CPF:", error);
    return null;
  }
}

export async function lerPaciente(id) {
  try {
    const docSnap = await getDoc(getPacienteDoc(id));
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
    await updateDoc(getPacienteDoc(id), dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    throw error;
  }
}

export async function deletarPaciente(id) {
  try {
    // SOFT DELETE: Mover para lixeira
    await updateDoc(getPacienteDoc(id), { deletedAt: serverTimestamp() });
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
    const qSnapshot = await getDocs(getPacientesRef());
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
        // 1. Deleta anamneses vinculadas (subcoleção)
        const snapAnam = await getDocs(getAnamnesesRef(pac.id));
        snapAnam.forEach(d => { batch.delete(d.ref); itemsNoBatch++; });

        // 2. Deleta sessões vinculadas (subcoleção)
        const snapSess = await getDocs(getSessoesRef(pac.id));
        snapSess.forEach(d => { batch.delete(d.ref); itemsNoBatch++; });

        // 3. Deleta o paciente
        batch.delete(getPacienteDoc(pac.id));
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
  try {
    const { id_paciente, ...data } = anamneseData;
    const docRef = await addDoc(getAnamnesesRef(id_paciente), {
      ...data,
      id_paciente, // Mantido por compatibilidade
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
    const qSnapshot = await getDocs(getAnamnesesRef(id_paciente));
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export async function lerAnamnese(id, id_paciente) {
  // Nota: Agora precisamos do id_paciente para compor o path
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
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

export async function atualizarAnamnese(id, id_paciente, dadosAtualizados) {
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
    await updateDoc(docRef, dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar anamnese:", error);
    throw error;
  }
}

export async function deletarAnamnese(id, id_paciente) {
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
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
  try {
    const { id_paciente, ...data } = sessaoData;
    const docRef = await addDoc(getSessoesRef(id_paciente), {
      ...data,
      id_paciente,
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
    const qSnapshot = await getDocs(getSessoesRef(id_paciente));
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export async function deletarSessao(id, id_paciente) {
  try {
    const docRef = doc(getSessoesRef(id_paciente), id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    throw error;
  }
}

export async function atualizarSessao(id, id_paciente, dadosAtualizados) {
  try {
    const docRef = doc(getSessoesRef(id_paciente), id);
    await updateDoc(docRef, dadosAtualizados);
  } catch (error) {
    console.error("Erro ao atualizar sessão:", error);
    throw error;
  }
}

// ==========================================
// QUERIES GLOBAIS (para Dashboard)
// NOTA: Agora usam Collection Group Queries se precisar de todos, 
// mas aqui o dashboard é apenas do usuário logado.
// ==========================================

export async function lerTodasSessoes() {
  // Como as sessões estão espalhadas em pacientes, precisamos buscar todos os pacientes primeiro
  // ou usar collectionGroup (que exige index). Para simplicidade e segurança, buscamos via pacientes.
  try {
    const pacientes = await lerPacientes();
    let todasSessoes = [];
    for (const pac of pacientes) {
      const sessoes = await lerSessoesDoPaciente(pac.id);
      todasSessoes = [...todasSessoes, ...sessoes];
    }
    return todasSessoes;
  } catch (error) {
    console.error("Erro ao ler todas as sessões:", error);
    throw error;
  }
}

export async function lerTodasAnamneses() {
  try {
    const pacientes = await lerPacientes();
    let todasAnamneses = [];
    for (const pac of pacientes) {
      const anamneses = await lerAnamnesesDoPaciente(pac.id);
      todasAnamneses = [...todasAnamneses, ...anamneses];
    }
    return todasAnamneses;
  } catch (error) {
    console.error("Erro ao ler todas as anamneses:", error);
    throw error;
  }
}


// ==========================================
// MIGRAÇÃO: VINCULAR DADOS ÓRFÃOS (DESATIVADO/OBSOLETO)
// ==========================================

export async function vincularDadosAoUsuarioAtual() {
  return { success: false, message: "Esta função deve ser substituída pelo script de migração hierárquica." };
}

// ==========================================
// CRUD: QUESTIONÁRIOS (TEMPLATES)
// ==========================================

export async function criarQuestionario(dados) {
  try {
    const docRef = await addDoc(getQuestionariosRef(), {
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
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getQuestionariosRef());
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => {
      const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dB - dA;
    });
  } catch (error) {
    console.error("Erro ao ler questionários:", error);
    return [];
  }
}

export async function lerQuestionario(id) {
  try {
    const docRef = doc(getQuestionariosRef(), id);
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
    const docRef = doc(getQuestionariosRef(), id);
    await updateDoc(docRef, { ...dados, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Erro ao atualizar questionário:", error);
    throw error;
  }
}

export async function deletarQuestionario(id) {
  try {
    await deleteDoc(doc(getQuestionariosRef(), id));
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

// ==========================================
// CRUD: CLÍNICAS (GESTÃO)
// ==========================================

export async function criarClinica(clinicaData) {
  try {
    const docRef = await addDoc(getClinicasRef(), {
      ...clinicaData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao criar clínica:", error);
    throw error;
  }
}

export async function lerClinicas() {
  try {
    const qSnapshot = await getDocs(getClinicasRef());
    const docs = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error("Erro ao ler clínicas:", error);
    throw error;
  }
}

export async function deletarClinica(id) {
  try {
    await deleteDoc(getClinicaDoc(id));
  } catch (error) {
    console.error("Erro ao deletar clínica:", error);
    throw error;
  }
}

