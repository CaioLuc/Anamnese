import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';

/**
 * Migra os dados do psicólogo logado para a nova estrutura hierárquica (v2).
 * Estrutura: /psicologos/{uid}/pacientes/{pid}/...
 */
export async function migrateToV2() {
  const user = auth.currentUser;
  if (!user) {
    console.error("Erro: Usuário não autenticado. Impossível migrar.");
    return { success: false, error: 'Usuário não autenticado' };
  }

  const uid = user.uid;
  console.log(`Iniciando migração V2 para o usuário: ${uid}`);
  
  try {
    const batch = writeBatch(db);
    let count = 0;

    // 1. Pacientes
    const patientsSnapshot = await getDocs(collection(db, 'pacientes'));
    // O Firestore já filtra pelo userId nas regras de segurança, 
    // mas vamos garantir no código também por segurança.
    const myPatients = patientsSnapshot.docs.filter(d => d.data().userId === uid);
    
    for (const pDoc of myPatients) {
      const data = pDoc.data();
      const newRef = doc(db, 'psicologos', uid, 'pacientes', pDoc.id);
      batch.set(newRef, { ...data, migratedAt: serverTimestamp() });
      count++;
    }

    // 2. Anamneses
    const anamnesesSnapshot = await getDocs(collection(db, 'anamneses'));
    const myAnamneses = anamnesesSnapshot.docs.filter(d => d.data().userId === uid);
    for (const aDoc of myAnamneses) {
      const data = aDoc.data();
      if (data.id_paciente) {
        const newRef = doc(db, 'psicologos', uid, 'pacientes', data.id_paciente, 'anamneses', aDoc.id);
        batch.set(newRef, { ...data, migratedAt: serverTimestamp() });
        count++;
      }
    }

    // 3. Sessões
    const sessoesSnapshot = await getDocs(collection(db, 'sessoes'));
    const mySessoes = sessoesSnapshot.docs.filter(d => d.data().userId === uid);
    for (const sDoc of mySessoes) {
      const data = sDoc.data();
      if (data.id_paciente) {
        const newRef = doc(db, 'psicologos', uid, 'pacientes', data.id_paciente, 'sessoes', sDoc.id);
        batch.set(newRef, { ...data, migratedAt: serverTimestamp() });
        count++;
      }
    }

    // 4. Questionários
    const qSnapshot = await getDocs(collection(db, 'questionarios'));
    const myQuestionarios = qSnapshot.docs.filter(d => d.data().userId === uid);
    for (const qDoc of myQuestionarios) {
      const data = qDoc.data();
      const newRef = doc(db, 'psicologos', uid, 'questionarios', qDoc.id);
      batch.set(newRef, { ...data, migratedAt: serverTimestamp() });
      count++;
    }

    // 5. Agendamentos
    const agSnapshot = await getDocs(collection(db, 'agendamentos'));
    const myAgendamentos = agSnapshot.docs.filter(d => d.data().userId === uid);
    for (const agDoc of myAgendamentos) {
      const data = agDoc.data();
      const newRef = doc(db, 'psicologos', uid, 'agendamentos', agDoc.id);
      batch.set(newRef, { ...data, migratedAt: serverTimestamp() });
      count++;
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Migração V2 concluída com sucesso! ${count} documentos processados.`);
      return { success: true, count };
    } else {
      console.log("Nenhum dado encontrado para migrar.");
      return { success: true, count: 0 };
    }

  } catch (error) {
    console.error("Erro durante a migração V2:", error);
    return { success: false, error: error.message };
  }
}
