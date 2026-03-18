import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig.js';

const AGENDAMENTOS_COL = 'agendamentos';

export async function criarAgendamento(data) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuário não autenticado.');
  const docRef = await addDoc(collection(db, AGENDAMENTOS_COL), {
    ...data,
    userId: uid,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function lerAgendamentos() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(collection(db, AGENDAMENTOS_COL), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarAgendamento(id, dados) {
  await updateDoc(doc(db, AGENDAMENTOS_COL, id), dados);
}

export async function deletarAgendamento(id) {
  await deleteDoc(doc(db, AGENDAMENTOS_COL, id));
}
