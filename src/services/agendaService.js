import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

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
async function espelharSlot(uid, agId, dados) {
  const ref = doc(db, 'psicologos', uid, SLOTS_COL, agId);
  await setDoc(ref, {
    data: dados.data || '',
    hora: dados.hora || '',
    duracao_min: dados.duracao_min || 50,
    status: dados.status || 'agendado',
  });
}

async function removerSlot(uid, agId) {
  const ref = doc(db, 'psicologos', uid, SLOTS_COL, agId);
  try { await deleteDoc(ref); } catch (_) { /* ok se não existe */ }
}

// ============================
// CRUD DE AGENDAMENTOS (Psicólogo logado)
// ============================
export async function criarAgendamento(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const docRef = await addDoc(getAgendamentosRef(), {
    ...data,
    userId: uid,
    createdAt: serverTimestamp()
  });
  // Espelhar
  await espelharSlot(uid, docRef.id, data);
  return docRef.id;
}

export async function lerAgendamentos() {
  const snap = await getDocs(getAgendamentosRef());
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarAgendamento(id, dados) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  await updateDoc(doc(db, 'psicologos', uid, AGENDAMENTOS_COL, id), dados);
  // Atualizar espelho (pode ter mudado hora/data/status)
  if (dados.data || dados.hora || dados.status) {
    await espelharSlot(uid, id, dados);
  }
}

export async function deletarAgendamento(id) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  await deleteDoc(doc(db, 'psicologos', uid, AGENDAMENTOS_COL, id));
  // Remover espelho
  await removerSlot(uid, id);
}

// ============================
// CONFIGURAÇÃO DE AGENDA (Psicólogo logado)
// ============================
export async function salvarConfigAgenda(config) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const ref = doc(db, 'psicologos', uid, 'config', 'agenda');
  await setDoc(ref, { ...config, updatedAt: serverTimestamp() }, { merge: true });
  
  // Salvar/atualizar lookup de slug
  if (config.slug) {
    const slugRef = doc(db, 'slugs', config.slug.toLowerCase().trim());
    await setDoc(slugRef, { uid, updatedAt: serverTimestamp() });
  }
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
  const col = collection(db, 'psicologos', uid, AGENDAMENTOS_COL);
  const docRef = await addDoc(col, {
    ...dados,
    status: 'pendente',
    origem: 'publico',
    createdAt: serverTimestamp()
  });
  // Espelhar (dados seguros)
  const slotRef = doc(db, 'psicologos', uid, SLOTS_COL, docRef.id);
  await setDoc(slotRef, {
    data: dados.data,
    hora: dados.hora,
    duracao_min: dados.duracao_min || 50,
    status: 'pendente',
  });
  return docRef.id;
}
