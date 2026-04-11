import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseConfig.js';

const functions = getFunctions(app, 'southamerica-east1');

/**
 * Chama a Cloud Function para gerar resumo com I.A. (Requer Plano Blaze no Firebase)
 * @param {'sessao'|'anamnese'} tipo - Tipo de resumo
 * @param {string} conteudo - Texto bruto para resumir
 * @returns {Promise<{resumo: string, tokens: number}>}
 */
export async function gerarResumoIA(tipo, conteudo) {
  const fn = httpsCallable(functions, 'gerarResumoIA');
  const result = await fn({ tipo, conteudo });
  return result.data; // { resumo, tokens }
}
