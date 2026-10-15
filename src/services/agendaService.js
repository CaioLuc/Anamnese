import {
  collection, getDocs, getDoc, setDoc,
  doc, query, where, serverTimestamp, writeBatch, runTransaction
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';
import { trackAction } from './logService';

const AGENDAMENTOS_COL = 'agendamentos';
const SLOTS_COL = 'horarios_ocupados'; // Espelho público (só hora+data+status)

// ============================
// HELPERS (Autenticado)
// ============================
function getAgendamentosRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  return collection(db, 'psicologos', uid, AGENDAMENTOS_COL);
}

// ============================
// ESPELHAMENTO DE DISPONIBILIDADE
// Grava apenas data, hora, duracao e status na coleção pública
// ============================
function slotRef(uid, agId) {
  return doc(db, 'psicologos', uid, SLOTS_COL, agId);
}

function dadosSlot(dados) {
  return {
    data: dados.data || '',
    hora: dados.hora || '',
    duracao_min: dados.duracao_min || 50,
    status: dados.status || 'agendado',
  };
}

// ============================
// CRUD DE AGENDAMENTOS (Psicólogo logado)
// Agendamento + espelho gravados no mesmo batch: ou os dois ficam, ou nenhum
// ============================
export async function criarAgendamento(data) {
  const [id] = await criarAgendamentosEmLote([data]);
  return id;
}

// Cria vários agendamentos atomicamente (recorrência: até 52 × 2 escritas, abaixo do limite de 500 do batch)
export async function criarAgendamentosEmLote(lista) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const batch = writeBatch(db);
  const ids = lista.map(data => {
    const ref = doc(getAgendamentosRef());
    batch.set(ref, { ...data, userId: uid, createdAt: serverTimestamp() });
    batch.set(slotRef(uid, ref.id), dadosSlot(data));
    return ref.id;
  });
  await batch.commit();
  lista.forEach((data, i) => trackAction('CREATE_APPOINTMENT', { appointmentId: ids[i], patientId: data.id_paciente, date: data.data, time: data.hora, duration: data.duracao_min }));
  return ids;
}

export async function lerAgendamentos() {
  const snap = await getDocs(getAgendamentosRef());
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// Só os agendamentos de um dia (painel "Hoje")
export async function lerAgendamentosPorData(dataStr) {
  const snap = await getDocs(query(getAgendamentosRef(), where('data', '==', dataStr)));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function atualizarAgendamento(id, dados) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'psicologos', uid, AGENDAMENTOS_COL, id), dados);
  // Espelho: só os campos enviados (update parcial não apaga data/hora do horário ocupado)
  const parcial = Object.fromEntries(['data', 'hora', 'duracao_min', 'status']
    .filter((k) => dados[k] !== undefined).map((k) => [k, dados[k]]));
  if (Object.keys(parcial).length) batch.set(slotRef(uid, id), parcial, { merge: true });
  await batch.commit();
  trackAction('UPDATE_APPOINTMENT', { appointmentId: id, status: dados.status, date: dados.data, time: dados.hora });
}

export async function deletarAgendamento(id) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'psicologos', uid, AGENDAMENTOS_COL, id));
  // delete em batch não falha se o espelho não existir
  batch.delete(slotRef(uid, id));
  await batch.commit();
  trackAction('DELETE_APPOINTMENT', { appointmentId: id });
}

// ============================
// CONFIGURAÇÃO DE AGENDA (Psicólogo logado)
// ============================
export async function salvarConfigAgenda(config) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  // Reivindicar slug antes da config: se já for de outro profissional, nada é salvo
  if (config.slug) {
    const slugRef = doc(db, 'slugs', config.slug.toLowerCase().trim());
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(slugRef);
      if (snap.exists() && snap.data().uid !== uid) {
        throw new Error('Este link já está em uso por outro profissional.');
      }
      tx.set(slugRef, { uid, updatedAt: serverTimestamp() });
    });
  }

  const ref = doc(db, 'psicologos', uid, 'config', 'agenda');
  await setDoc(ref, { ...config, updatedAt: serverTimestamp() }, { merge: true });
  trackAction('SAVE_AGENDA_CONFIG', { slug: config.slug || null });
}

export async function lerConfigAgenda() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const ref = doc(db, 'psicologos', uid, 'config', 'agenda');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ============================
// CHECK SLUG UNICIDADE
// ============================
export async function verificarSlugDisponivel(slug) {
  const slugNorm = slug.toLowerCase().trim();
  const ref = doc(db, 'slugs', slugNorm);
  const snap = await getDoc(ref);
  if (!snap.exists()) return true;
  // Se já existe mas é do próprio usuário, está ok
  const uid = auth.currentUser?.uid;
  return snap.data().uid === uid;
}

// ============================
// FUNÇÕES PÚBLICAS (Sem auth — usadas na AgendaPublica)
// ============================

// Resolve slug → uid
export async function resolverSlug(slug) {
  const ref = doc(db, 'slugs', slug.toLowerCase().trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().uid;
}

// Lê config da agenda de um psicólogo pelo UID (público)
export async function lerConfigAgendaPublica(uid) {
  const ref = doc(db, 'psicologos', uid, 'config', 'agenda');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Lê SLOTS OCUPADOS de um dia (coleção pública segura — sem dados pessoais!)
export async function lerAgendamentosDoDia(uid, dataStr) {
  const col = collection(db, 'psicologos', uid, SLOTS_COL);
  const q = query(col, where('data', '==', dataStr));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    hora: d.data().hora,
    duracao_min: d.data().duracao_min || 50,
    status: d.data().status,
  })).filter(a => a.status !== 'cancelado');
}

// Paciente cria agendamento (sem auth)
export async function criarAgendamentoPublico(uid, dados) {
  const docRef = doc(collection(db, 'psicologos', uid, AGENDAMENTOS_COL));
  const batch = writeBatch(db);
  batch.set(docRef, {
    ...dados,
    status: 'pendente',
    origem: 'publico',
    createdAt: serverTimestamp()
  });
  // Espelhar (dados seguros) no mesmo batch — regra usa existsAfter()
  batch.set(slotRef(uid, docRef.id), {
    data: dados.data,
    hora: dados.hora,
    duracao_min: dados.duracao_min || 50,
    status: 'pendente',
  });
  await batch.commit();
  return docRef.id;
}
