import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, deleteField, runTransaction, query, where, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';
import { trackAction } from './logService';
import logger from '../utils/logger';

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
      return { ...snap.data(), id: snap.id };
    }
    return null; // null = perfil inexistente (primeiro login)
  } catch (error) {
    // Não retornar null aqui: o App trataria como primeiro login e recriaria o perfil como trial
    logger.error("Erro ao ler perfil:", error);
    throw error;
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
    logger.error("Erro ao salvar perfil:", error);
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
    trackAction('CREATE_PATIENT', { patientId: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error("Erro ao criar paciente:", error);
    throw error;
  }
}

export async function lerPacientes() {
  try {
    const qSnapshot = await getDocs(getPacientesRef());
    const docs = qSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    // Apenas pacientes que NÃO estão na lixeira
    return docs.filter(p => !p.deletedAt);
  } catch (error) {
    logger.error("Erro ao ler pacientes:", error);
    throw error;
  }
}

// Busca paciente pelo CPF (normalizado, só dígitos).
// Inclui pacientes na lixeira (retornados com `deletedAt`) para o chamador avisar "existe na lixeira";
// ativos têm prioridade. Anonimizados são ignorados.
export async function buscarPacientePorCPF(cpf) {
  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (!cpfLimpo) return null;
    const qSnapshot = await getDocs(getPacientesRef());
    const encontrados = qSnapshot.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .filter(p => !p.anonimizado && p.cpf && String(p.cpf).replace(/\D/g, '') === cpfLimpo);
    return encontrados.find(p => !p.deletedAt) || encontrados[0] || null;
  } catch (error) {
    logger.error("Erro ao buscar paciente por CPF:", error);
    throw error;
  }
}

export async function lerPaciente(id) {
  try {
    const docSnap = await getDoc(getPacienteDoc(id));
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id };
    }
    return null;
  } catch (error) {
    logger.error("Erro ao ler paciente:", error);
    throw error;
  }
}

export async function atualizarPaciente(id, dadosAtualizados) {
  try {
    await updateDoc(getPacienteDoc(id), dadosAtualizados);
    trackAction('UPDATE_PATIENT', { patientId: id });
  } catch (error) {
    logger.error("Erro ao atualizar paciente:", error);
    throw error;
  }
}

export async function deletarPaciente(id) {
  try {
    // SOFT DELETE: Mover para lixeira
    await updateDoc(getPacienteDoc(id), { deletedAt: serverTimestamp() });
    trackAction('DELETE_PATIENT', { patientId: id });
    invalidarCacheSessoes();
    invalidarCacheAnamneses();
  } catch (error) {
    logger.error("Erro ao mover paciente para lixeira:", error);
    throw error;
  }
}

// ==========================================
// FUNÇÕES DA LIXEIRA (ANONIMIZAÇÃO — LGPD + CFP nº 01/2009)
// ==========================================

// Campos de identificação gravados no doc do paciente (AddPatientModal / Agenda);
// email e endereco por precaução em cadastros legados. deleteField em campo ausente é no-op.
const CAMPOS_IDENTIFICACAO = ['cpf', 'telefone', 'data_nascimento', 'email', 'endereco'];
const MAX_ESCRITAS_POR_COMMIT = 400;
const DIA_MS = 24 * 60 * 60 * 1000;

// deletedAt sem toMillis = serverTimestamp ainda pendente (acabou de ir para a lixeira)
function expirouNaLixeira(p, diasRetencao, agora) {
  return !!p?.deletedAt?.toMillis && !p.anonimizado && agora - p.deletedAt.toMillis() >= diasRetencao * DIA_MS;
}

/**
 * Após `diasRetencao` dias na lixeira o paciente é ANONIMIZADO, nunca excluído:
 * remove os dados de identificação do doc do paciente e preserva anamneses e sessões
 * (guarda do prontuário por 5 anos — Resolução CFP nº 01/2009). Lança erro em caso de falha.
 */
export async function limparLixeiraPacientes(diasRetencao = 7) {
  try {
    const agora = Date.now();
    const qSnapshot = await getDocs(getPacientesRef());
    const expirados = qSnapshot.docs.filter(d => expirouNaLixeira(d.data(), diasRetencao, agora)).map(d => d.ref);

    for (let i = 0; i < expirados.length; i += MAX_ESCRITAS_POR_COMMIT) {
      const lote = expirados.slice(i, i + MAX_ESCRITAS_POR_COMMIT);
      // Relê cada paciente na transação: se foi restaurado durante o loop, não anonimiza
      const anonimizados = await runTransaction(db, async (tx) => {
        const snaps = await Promise.all(lote.map(ref => tx.get(ref)));
        const alvos = snaps.filter(s => s.exists() && expirouNaLixeira(s.data(), diasRetencao, agora));
        alvos.forEach(s => tx.update(s.ref, {
          ...Object.fromEntries(CAMPOS_IDENTIFICACAO.map(c => [c, deleteField()])),
          nome: 'Paciente anonimizado',
          anonimizado: true,
          anonimizadoEm: serverTimestamp(),
        }));
        return alvos.map(s => s.id);
      });
      // Agendamentos guardam nome/CPF/telefone do paciente: também saem
      for (const patientId of anonimizados) {
        const ags = await getDocs(query(collection(getPsicologoRef(), 'agendamentos'), where('id_paciente', '==', patientId)));
        if (!ags.empty) {
          const batch = writeBatch(db);
          ags.docs.forEach(a => batch.update(a.ref, {
            nome_paciente: 'Paciente anonimizado',
            cpf_paciente: deleteField(),
            telefone_paciente: deleteField(),
          }));
          await batch.commit();
        }
        trackAction('PATIENT_ANONYMIZED', { patientId });
      }
    }
  } catch (error) {
    logger.error("Erro ao anonimizar pacientes expirados da lixeira:", error);
    throw error;
  }
}

/**
 * Lê pacientes que estão na lixeira (soft-deleted e ainda não anonimizados).
 * Retorna com campo `diasRestantes` indicando quanto tempo falta para a anonimização.
 */
export async function lerPacientesDeletados(diasRetencao = 7) {
  try {
    const qSnapshot = await getDocs(getPacientesRef());
    const todos = qSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const agora = new Date();

    return todos
      .filter(p => p.deletedAt && !p.anonimizado)
      .map(p => {
        const deletedDate = p.deletedAt?.toDate ? p.deletedAt.toDate() : new Date();
        const diasNaLixeira = (agora - deletedDate) / (1000 * 60 * 60 * 24);
        const diasRestantes = Math.max(0, Math.ceil(diasRetencao - diasNaLixeira));
        return { ...p, diasRestantes, deletedDate };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  } catch (error) {
    logger.error("Erro ao ler pacientes deletados:", error);
    throw error;
  }
}

/**
 * Restaura um paciente da lixeira removendo o campo deletedAt.
 * Recusa pacientes já anonimizados (identificação removida de forma irreversível).
 */
export async function restaurarPaciente(id) {
  try {
    const ref = getPacienteDoc(id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Paciente não encontrado.");
      if (snap.data().anonimizado) throw new Error("Paciente anonimizado não pode ser restaurado.");
      tx.update(ref, { deletedAt: deleteField() });
    });
    trackAction('RESTORE_PATIENT', { patientId: id });
    invalidarCacheSessoes();
    invalidarCacheAnamneses();
  } catch (error) {
    logger.error("Erro ao restaurar paciente:", error);
    throw error;
  }
}
// CRUD: ANAMNESES
// ==========================================

export async function criarAnamnese(anamneseData) {
  try {
    const { id_paciente, ...data } = anamneseData;
    const docRef = await addDoc(getAnamnesesRef(id_paciente), {
      ...data,
      id_paciente,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    trackAction('CREATE_ANAMNESIS', { patientId: id_paciente, anamneseId: docRef.id });
    invalidarCacheAnamneses();
    return docRef.id;
  } catch (error) {
    logger.error("Erro ao criar anamnese:", error);
    throw error;
  }
}

export async function lerAnamnesesDoPaciente(id_paciente) {
  try {
    const qSnapshot = await getDocs(getAnamnesesRef(id_paciente));
    const docs = qSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return docs.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    logger.error("Erro ao ler anamneses do paciente:", error);
    throw error;
  }
}

export async function lerAnamnese(id, id_paciente) {
  // Nota: Agora precisamos do id_paciente para compor o path
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id };
    }
    return null;
  } catch (error) {
    logger.error("Erro ao ler anamnese:", error);
    throw error;
  }
}

export async function atualizarAnamnese(id, id_paciente, dadosAtualizados) {
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
    await updateDoc(docRef, dadosAtualizados);
    trackAction('UPDATE_ANAMNESIS', { patientId: id_paciente, anamneseId: id });
    invalidarCacheAnamneses();
  } catch (error) {
    logger.error("Erro ao atualizar anamnese:", error);
    throw error;
  }
}

export async function deletarAnamnese(id, id_paciente) {
  try {
    const docRef = doc(getAnamnesesRef(id_paciente), id);
    await deleteDoc(docRef);
    trackAction('DELETE_ANAMNESIS', { patientId: id_paciente, anamneseId: id });
    invalidarCacheAnamneses();
  } catch (error) {
    logger.error("Erro ao deletar anamnese:", error);
    throw error;
  }
}


// ==========================================
// CRUD: SESSÕES (EVOLUÇÃO)
// ==========================================

let cacheTodasSessoes = null;
let cacheTodasSessoesTime = 0;
let cacheTodasAnamneses = null;
let cacheTodasAnamnesesTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function invalidarCacheSessoes() {
  cacheTodasSessoes = null;
}

export function invalidarCacheAnamneses() {
  cacheTodasAnamneses = null;
}

export async function criarSessao(sessaoData) {
  try {
    const { id_paciente, ...data } = sessaoData;
    const docRef = await addDoc(getSessoesRef(id_paciente), {
      ...data,
      id_paciente,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    trackAction('CREATE_SESSION', { patientId: id_paciente, sessionId: docRef.id, status: data.status || 'Presente' });
    invalidarCacheSessoes();
    return docRef.id;
  } catch (error) {
    logger.error("Erro ao criar sessão de evolução:", error);
    throw error;
  }
}

export async function lerSessoesDoPaciente(id_paciente) {
  try {
    const qSnapshot = await getDocs(getSessoesRef(id_paciente));
    const docs = qSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return docs.sort((a, b) => {
      const dateA = a.data_sessao ? new Date(a.data_sessao) : (a.createdAt?.toDate() || new Date(0));
      const dateB = b.data_sessao ? new Date(b.data_sessao) : (b.createdAt?.toDate() || new Date(0));
      return dateB - dateA;
    });
  } catch (error) {
    logger.error("Erro ao ler sessões do paciente:", error);
    throw error;
  }
}

export async function deletarSessao(id, id_paciente) {
  try {
    const docRef = doc(getSessoesRef(id_paciente), id);
    await deleteDoc(docRef);
    trackAction('DELETE_SESSION', { patientId: id_paciente, sessionId: id });
    invalidarCacheSessoes();
  } catch (error) {
    logger.error("Erro ao deletar sessão:", error);
    throw error;
  }
}

export async function atualizarSessao(id, id_paciente, dadosAtualizados) {
  try {
    const docRef = doc(getSessoesRef(id_paciente), id);
    await updateDoc(docRef, dadosAtualizados);
    trackAction('UPDATE_SESSION', { patientId: id_paciente, sessionId: id });
    invalidarCacheSessoes();
  } catch (error) {
    logger.error("Erro ao atualizar sessão:", error);
    throw error;
  }
}

// ==========================================
// QUERIES GLOBAIS (para Dashboard)
// NOTA: Agora usam Collection Group Queries se precisar de todos, 
// mas aqui o dashboard é apenas do usuário logado.
// ==========================================

export async function lerTodasSessoes(forceRefresh = false) {
  if (!forceRefresh && cacheTodasSessoes && (Date.now() - cacheTodasSessoesTime < CACHE_TTL)) {
    return cacheTodasSessoes;
  }

  // Busca sessões de todos os pacientes em paralelo (Promise.all) em vez de sequencialmente.
  try {
    const pacientes = await lerPacientes();
    const sessoesArrays = await Promise.all(
      pacientes.map(pac => lerSessoesDoPaciente(pac.id))
    );
    const todasSessoes = sessoesArrays.flat();
    
    cacheTodasSessoes = todasSessoes;
    cacheTodasSessoesTime = Date.now();
    
    return todasSessoes;
  } catch (error) {
    logger.error("Erro ao ler todas as sessões:", error);
    throw error;
  }
}

export async function lerTodasAnamneses(forceRefresh = false) {
  if (!forceRefresh && cacheTodasAnamneses && (Date.now() - cacheTodasAnamnesesTime < CACHE_TTL)) {
    return cacheTodasAnamneses;
  }

  // Busca anamneses de todos os pacientes em paralelo (Promise.all).
  try {
    const pacientes = await lerPacientes();
    const anamnesesArrays = await Promise.all(
      pacientes.map(pac => lerAnamnesesDoPaciente(pac.id))
    );
    const todasAnamneses = anamnesesArrays.flat();

    cacheTodasAnamneses = todasAnamneses;
    cacheTodasAnamnesesTime = Date.now();

    return todasAnamneses;
  } catch (error) {
    logger.error("Erro ao ler todas as anamneses:", error);
    throw error;
  }
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
    trackAction('CREATE_QUESTIONNAIRE', { questionnaireId: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error("Erro ao criar questionário:", error);
    throw error;
  }
}

export async function lerQuestionarios() {
  try {
    if (!auth.currentUser) return [];
    const snapshot = await getDocs(getQuestionariosRef());
    const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    return docs.sort((a, b) => {
      const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dB - dA;
    });
  } catch (error) {
    logger.error("Erro ao ler questionários:", error);
    throw error;
  }
}

export async function lerQuestionario(id) {
  try {
    const docRef = doc(getQuestionariosRef(), id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { ...docSnap.data(), id: docSnap.id };
    return null;
  } catch (error) {
    logger.error("Erro ao ler questionário:", error);
    throw error;
  }
}

export async function atualizarQuestionario(id, dados) {
  try {
    const docRef = doc(getQuestionariosRef(), id);
    await updateDoc(docRef, { ...dados, updatedAt: serverTimestamp() });
  } catch (error) {
    logger.error("Erro ao atualizar questionário:", error);
    throw error;
  }
}

export async function deletarQuestionario(id) {
  try {
    await deleteDoc(doc(getQuestionariosRef(), id));
    trackAction('DELETE_QUESTIONNAIRE', { questionnaireId: id });
  } catch (error) {
    logger.error("Erro ao deletar questionário:", error);
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
    logger.error("Erro ao duplicar questionário:", error);
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
    trackAction('CREATE_CLINIC', { clinicId: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error("Erro ao criar clínica:", error);
    throw error;
  }
}

export async function lerClinicas() {
  try {
    const qSnapshot = await getDocs(getClinicasRef());
    const docs = qSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    return docs.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    logger.error("Erro ao ler clínicas:", error);
    throw error;
  }
}

export async function deletarClinica(id) {
  try {
    await deleteDoc(getClinicaDoc(id));
    trackAction('DELETE_CLINIC', { clinicId: id });
  } catch (error) {
    logger.error("Erro ao deletar clínica:", error);
    throw error;
  }
}

