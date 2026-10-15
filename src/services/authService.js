import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from './firebaseConfig';
import { trackAction, limparLogsLocais } from './logService';
import { limparStorageLider } from './liderService';
import logger from '../utils/logger';

export const loginFirebaseUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await trackAction('LOGIN', { method: 'email_password' });
    return userCredential.user;
  } catch (error) {
    logger.error("Login errorMessage:", error);
    throw error;
  }
};

export const cadastrarFirebaseUser = async (email, password, nome = '') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // O perfil no Firestore só é criado após o 2FA; o nome fica guardado no Auth até lá.
    if (nome.trim()) await updateProfile(userCredential.user, { displayName: nome.trim() });
    await trackAction('SIGNUP', { method: 'email_password' });
    return userCredential.user;
  } catch (error) {
    logger.error("Signup errorMessage:", error);
    throw error;
  }
};

// Apaga do navegador rascunhos clínicos e a cópia local da auditoria (LGPD: nada sensível após sair)
// Na saída por inatividade os rascunhos (sessionStorage, só desta aba) ficam para a mesma pessoa retomar.
const limparDadosLocaisSensiveis = (manterRascunhos) => {
  limparLogsLocais();
  // Fila de triagem do Líder (nome, idade, queixa) não é rascunho: sai sempre
  limparStorageLider();
  if (manterRascunhos) return;
  for (const store of [localStorage, sessionStorage]) {
    try {
      Object.keys(store)
        .filter((k) => k.startsWith('caritas_anamnese') || k.startsWith('caritas_sessao_draft'))
        .forEach((k) => store.removeItem(k));
    } catch (err) {
      logger.warn('Erro ao limpar rascunhos locais:', err);
    }
  }
};

export const logoutFirebaseUser = async (motivo = 'manual') => {
  try {
    // Offline o addDoc só resolve com o servidor: não deixa a auditoria segurar o logout
    await Promise.race([trackAction('LOGOUT', { method: motivo }), new Promise((r) => setTimeout(r, 1500))]);
    limparDadosLocaisSensiveis(motivo === 'inatividade');
    await signOut(auth);
    // A cópia offline do Firestore (IndexedDB) guarda CPF e prontuário em texto puro: não fica no computador do consultório.
    // Falha se houver outra aba aberta; aí a limpeza ocorre no próximo logout.
    await terminate(db)
      .then(() => clearIndexedDbPersistence(db))
      .catch((err) => logger.warn('Cache local do Firestore não foi apagado:', err));
    // Forçar reload para capturar novos deploys (e recriar o Firestore encerrado acima)
    window.location.href = '/';
  } catch (error) {
    logger.error("Logout errorMessage:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ==========================================
// REDEFINIÇÃO DE SENHA
// ==========================================
export const redefinirSenhaFirebase = async (email) => {
  if (!email || !email.trim()) {
    throw new Error('Informe o endereço de e-mail.');
  }
  try {
    await sendPasswordResetEmail(auth, email.trim());
    await trackAction('PASSWORD_RESET_REQUEST', {});
    return true;
  } catch (error) {
    logger.error("Erro ao solicitar redefinição de senha:", error);
    throw error;
  }
};

// ==========================================
// AUTENTICAÇÃO EM 2 ETAPAS (2FA) POR E-MAIL
// ==========================================
// Código gerado, enviado e validado só no servidor (functions/index.js).
// A sessão liberada vive em `mfa_sessoes/{uid}_{auth_time}` e as regras do
// Firestore bloqueiam dados clínicos sem ela.
const functions = getFunctions(app, 'southamerica-east1');
const DISPOSITIVO_PREFIX = 'caritas_dispositivo_mfa_';

const lerTokenDispositivo = (uid) => {
  try { return localStorage.getItem(DISPOSITIVO_PREFIX + uid); } catch { return null; }
};

const gravarTokenDispositivo = (uid, token) => {
  try {
    if (token) localStorage.setItem(DISPOSITIVO_PREFIX + uid, token);
    else localStorage.removeItem(DISPOSITIVO_PREFIX + uid);
  } catch (err) {
    logger.warn('Erro ao gravar dispositivo confiável:', err);
  }
};

/** O login atual já passou pelo 2FA? */
export const isSessaoMfaValida = async (user) => {
  const { claims } = await user.getIdTokenResult();
  const snap = await getDoc(doc(db, 'mfa_sessoes', `${user.uid}_${claims.auth_time}`));
  return snap.exists() && snap.data().expiraEm.toMillis() > Date.now();
};

/** Libera o login com o token de dispositivo confiável (30 dias), se houver. */
export const liberarPorDispositivoConfiavel = async (user) => {
  const token = lerTokenDispositivo(user.uid);
  if (!token) return false;
  const { data } = await httpsCallable(functions, 'validarDispositivoMfa')({ token });
  if (!data.ok) gravarTokenDispositivo(user.uid, null);
  return data.ok;
};

/** Envia um novo código para o e-mail da conta. Retorna { enviadoPara, reenviarEmSegundos }. */
export const enviarCodigoMfa = async () => {
  const { data } = await httpsCallable(functions, 'enviarCodigoMfa')();
  return data;
};

/** Valida o código digitado; lança erro com mensagem pronta em pt-BR se falhar. */
export const verificarCodigoMfa = async (codigo, lembrarDispositivo = false) => {
  const { data } = await httpsCallable(functions, 'verificarCodigoMfa')({ codigo, lembrar: lembrarDispositivo });
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão encerrada. Entre novamente.');
  if (data.tokenDispositivo) gravarTokenDispositivo(user.uid, data.tokenDispositivo);
  // O servidor marca o e-mail como verificado; atualiza o token para as regras enxergarem.
  await user.getIdToken(true);
  await trackAction('2FA_VERIFIED', { deviceTrusted: !!lembrarDispositivo });
  return true;
};
