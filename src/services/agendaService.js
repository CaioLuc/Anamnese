import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

const AGENDAMENTOS_COL = 'agendamentos';

function getAgendamentosRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  return collection(db, 'psicologos', uid, AGENDAMENTOS_COL);
}

export async function criarAgendamento(data) {
  const docRef = await addDoc(getAgendamentosRef(), {
    ...data,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });
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
}

export async function deletarAgendamento(id) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  await deleteDoc(doc(db, 'psicologos', uid, AGENDAMENTOS_COL, id));
}
