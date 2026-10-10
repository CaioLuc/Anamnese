import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { trackAction } from './logService';
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

export const cadastrarFirebaseUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await trackAction('SIGNUP', { email, method: 'email_password' });
    return userCredential.user;
  } catch (error) {
    logger.error("Signup errorMessage:", error);
    throw error;
  }
};

export const logoutFirebaseUser = async () => {
  try {
    await trackAction('LOGOUT', { method: 'manual' });
    await signOut(auth);
    // Forçar reload para capturar novos deploys
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
    await trackAction('PASSWORD_RESET_REQUEST', { email: email.trim() });
    return true;
  } catch (error) {
    logger.error("Erro ao solicitar redefinição de senha:", error);
    throw error;
  }
};

// ==========================================
// AUTENTICAÇÃO EM 2 ETAPAS (2FA) & DISPOSITIVO CONFIÁVEL
// ==========================================
const TRUSTED_DEVICE_PREFIX = 'caritas_trusted_device_';
const SESSION_2FA_PREFIX = 'caritas_2fa_session_';
const CODE_2FA_PREFIX = 'caritas_2fa_code_';

/**
 * Verifica se a máquina atual já foi marcada como confiável para este e-mail
 */
export const isDispositivoConfiavel = (email) => {
  if (!email) return false;
  try {
    const raw = localStorage.getItem(TRUSTED_DEVICE_PREFIX + email.toLowerCase().trim());
    return !!raw;
  } catch {
    return false;
  }
};

/**
 * Salva a máquina atual como confiável para nunca mais pedir 2FA
 */
export const salvarDispositivoConfiavel = (email) => {
  if (!email) return;
  try {
    localStorage.setItem(
      TRUSTED_DEVICE_PREFIX + email.toLowerCase().trim(),
      JSON.stringify({ trusted: true, email: email.toLowerCase().trim(), savedAt: new Date().toISOString() })
    );
  } catch (e) {
    logger.error('Erro ao salvar dispositivo confiável:', e);
  }
};

/**
 * Remove o status de máquina confiável
 */
export const removerDispositivoConfiavel = (email) => {
  if (!email) return;
  try {
    localStorage.removeItem(TRUSTED_DEVICE_PREFIX + email.toLowerCase().trim());
  } catch (err) {
    logger.warn('Erro ao remover dispositivo:', err);
  }
};

/**
 * Verifica se o usuário já validou 2FA na sessão atual do navegador
 */
export const isSessao2FAVerificada = (email) => {
  if (!email) return false;
  try {
    return sessionStorage.getItem(SESSION_2FA_PREFIX + email.toLowerCase().trim()) === 'true';
  } catch (_err) {
    return false;
  }
};

export const marcarSessao2FAVerificada = (email) => {
  if (!email) return;
  try {
    sessionStorage.setItem(SESSION_2FA_PREFIX + email.toLowerCase().trim(), 'true');
  } catch (err) {
    logger.warn('Erro ao salvar sessão 2FA:', err);
  }
};

/**
 * Gera código de 6 dígitos para o fluxo 2FA
 */
export const gerarCodigo2FA = (email) => {
  if (!email) return '123456';
  const cleanEmail = email.toLowerCase().trim();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    const payload = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
    };
    sessionStorage.setItem(CODE_2FA_PREFIX + cleanEmail, JSON.stringify(payload));
  } catch (err) {
    logger.warn('Erro ao salvar código 2FA temporário:', err);
  }
  return code;
};

export const obterCodigo2FAAtivo = (email) => {
  if (!email) return null;
  const cleanEmail = email.toLowerCase().trim();
  try {
    const raw = sessionStorage.getItem(CODE_2FA_PREFIX + cleanEmail);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      sessionStorage.removeItem(CODE_2FA_PREFIX + cleanEmail);
      return null;
    }
    return data.code;
  } catch (_err) {
    return null;
  }
};

/**
 * Valida o código digitado e persiste o dispositivo confiável se solicitado
 */
export const verificarCodigo2FA = async (email, codigoDigitado, lembrarDispositivo = false) => {
  if (!email) return { success: false, error: 'E-mail não fornecido.' };
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = (codigoDigitado || '').trim();
  
  const ativo = obterCodigo2FAAtivo(cleanEmail);
  // Aceita código gerado ativo ou código mestre para facilidade de testes/auditoria
  const isValido = (ativo && cleanCode === ativo) || cleanCode === '123456';

  if (!isValido) {
    return { success: false, error: 'Código de verificação incorreto ou expirado.' };
  }

  marcarSessao2FAVerificada(cleanEmail);
  if (lembrarDispositivo) {
    salvarDispositivoConfiavel(cleanEmail);
  }

  try {
    sessionStorage.removeItem(CODE_2FA_PREFIX + cleanEmail);
  } catch (err) {
    logger.warn('Erro ao limpar código temporário:', err);
  }

  await trackAction('2FA_VERIFIED', { email: cleanEmail, deviceTrusted: !!lembrarDispositivo });
  return { success: true };
};

