import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth, app } from './firebaseConfig';
import { trackAction } from './logService';
import { parseDate, dataLocalISO } from '../utils/formatUtils';

// ==========================================
// CATÁLOGO DE PLANOS CARITAS
// ==========================================
export const PLANOS_CARITAS = {
  basico: {
    id: 'basico',
    nome: 'Plano Essencial',
    preco: 79.90,
    intervalo: 'mensal',
    maxPacientes: 20,
    maxLocais: 1,
    recursos: [
      'Até 20 pacientes cadastrados',
      'Prontuário Eletrônico conforme CFP 01/2009',
      'Anamnese Adulto e Infantil',
      'Agenda de Sessões com Link Público',
      'Exportação de Recibos e Atestados',
      'Lixeira com retenção de 7 dias',
    ],
    destaque: false,
  },
  profissional: {
    id: 'profissional',
    nome: 'Plano Profissional (Pro)',
    preco: 139.90,
    intervalo: 'mensal',
    maxPacientes: 50,
    maxLocais: 4,
    recursos: [
      'Até 50 pacientes cadastrados',
      'Resumo Clínico estruturado com Inteligência Artificial',
      'Até 4 locais de atendimento simultâneos',
      'Selo Digital de Autenticidade (CFP Res. 06/2019)',
      'Backup e exportação avançada em CSV',
      'Suporte prioritário via WhatsApp',
    ],
    destaque: true,
  },
  clinica: {
    id: 'clinica',
    nome: 'Plano Clínica & Equipe',
    preco: 299.90,
    intervalo: 'mensal',
    maxPacientes: 160,
    maxLocais: 10,
    maxPsicologos: 8,
    recursos: [
      '1 Líder Clínico + 8 Psicólogos integrados',
      'Até 160 pacientes distribuídos pela equipe',
      'Painel de Gestão e Supervisão Técnica',
      'Gestão Centralizada de Finanças e Repasses',
      'Auditoria de Prontuários e Conformidade CFP',
      'Rate Limiting e Proteção Antibot na Agenda',
    ],
    destaque: false,
  },
};

// Tolerância legal/operacional (dias após o vencimento antes de bloquear)
export const DIAS_CARENCIA_BLOQUEIO = 3;
export const DIAS_TRIAL_PADRAO = 14;

// ==========================================
// DETECTAR BANDEIRA DO CARTÃO DE CRÉDITO
// ==========================================
export function detectarBandeiraCartao(numero = '') {
  const limpo = String(numero).replace(/\D/g, '');
  // Elo antes de Visa: prefixos 4011/4389/4514/4576 também começam com 4
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(limpo)) return 'Elo';
  if (/^4/.test(limpo)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(limpo)) return 'Mastercard';
  if (/^3[47]/.test(limpo)) return 'Amex';
  if (/^(6011|65|64[4-9])/.test(limpo)) return 'Discover';
  if (/^3841[046]/.test(limpo)) return 'Hipercard';
  return 'Cartão';
}

// ==========================================
// VALIDADOR BÁSICO DE NÚMERO (ALGORITMO LUHN)
// ==========================================
export function validarNumeroCartao(numero = '') {
  const limpo = String(numero).replace(/\D/g, '');
  if (limpo.length < 11 || limpo.length > 19) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = limpo.length - 1; i >= 0; i--) {
    let digito = parseInt(limpo.charAt(i), 10);
    if (dobrar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    soma += digito;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

// ==========================================
// VERIFICAR STATUS DA ASSINATURA (PAYWALL GUARD)
// ==========================================
/**
 * Determina se o psicólogo tem acesso regular ao sistema ou se deve ser bloqueado por inadimplência.
 * @param {object} perfil - Documento do psicólogo retornado do Firestore/Auth
 * @returns {object} { emDia: boolean, status: string, diasRestantesTrial, proximoVencimento, motivo }
 */
export function verificarStatusAssinatura(perfil) {
  if (!perfil) {
    return {
      emDia: true,
      status: 'ativo',
      motivo: 'Perfil inicial',
    };
  }

  // Cortesia ou isenção concedida pelo Super Admin
  if (perfil.isIsento === true || perfil.plano === 'isento') {
    return {
      emDia: true,
      status: 'isento',
      motivo: 'Acesso cortesia concedido pelo administrador',
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // 1. Checagem de Período Trial (Novo Cadastro)
  if (perfil.statusPagamento === 'trial' || (!perfil.statusPagamento && perfil.trialAte)) {
    // 'YYYY-MM-DD' lido como data local (new Date('YYYY-MM-DD') seria meia-noite UTC)
    const dataTrial = parseDate(perfil.trialAte);
    if (dataTrial) {
      dataTrial.setHours(23, 59, 59, 999);
      const diffMs = dataTrial.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diasRestantes >= 0) {
        return {
          emDia: true,
          status: 'trial',
          diasRestantesTrial: diasRestantes,
          proximoVencimento: perfil.trialAte,
          motivo: `Período de avaliação gratuito (${diasRestantes} dias restantes)`,
        };
      } else {
        return {
          emDia: false,
          status: 'trial_expirado',
          diasRestantesTrial: 0,
          proximoVencimento: perfil.trialAte,
          motivo: 'Seu período de teste gratuito encerrou. Cadastre um plano para continuar atendendo.',
        };
      }
    }

    // Trial sem data válida não pode liberar acesso indefinidamente
    return {
      emDia: false,
      status: 'trial_expirado',
      diasRestantesTrial: 0,
      proximoVencimento: null,
      motivo: 'Seu período de teste gratuito encerrou. Cadastre um plano para continuar atendendo.',
    };
  }

  // 2. Status explicitamente marcado como Inadimplente ou Cancelado
  if (perfil.statusPagamento === 'inadimplente') {
    return {
      emDia: false,
      status: 'inadimplente',
      proximoVencimento: perfil.proximoVencimento || null,
      motivo: 'Mensalidade pendente de regularização.',
    };
  }

  if (perfil.statusPagamento === 'cancelado') {
    return {
      emDia: false,
      status: 'cancelado',
      proximoVencimento: perfil.proximoVencimento || null,
      motivo: 'Assinatura cancelada.',
    };
  }

  // 3. Checagem de Data de Vencimento com Tolerância de Carência (3 dias)
  const dataVenc = parseDate(perfil.proximoVencimento);
  if (dataVenc) {
    dataVenc.setHours(0, 0, 0, 0);

    const dataLimiteComCarencia = new Date(dataVenc);
    dataLimiteComCarencia.setDate(dataLimiteComCarencia.getDate() + DIAS_CARENCIA_BLOQUEIO);

    if (hoje > dataLimiteComCarencia) {
      return {
        emDia: false,
        status: 'inadimplente',
        proximoVencimento: perfil.proximoVencimento,
        motivo: `Mensalidade vencida em ${formatarData(perfil.proximoVencimento)}. Tolerância de ${DIAS_CARENCIA_BLOQUEIO} dias expirada.`,
      };
    }

    if (hoje > dataVenc) {
      // Venceu mas está dentro da carência: mantém liberado com aviso
      return {
        emDia: true,
        status: 'carencia',
        proximoVencimento: perfil.proximoVencimento,
        motivo: 'Mensalidade em período de carência. Regularize para evitar bloqueio.',
      };
    }
  }

  // Caso padrão: ativo
  return {
    emDia: true,
    status: perfil.statusPagamento || 'ativo',
    proximoVencimento: perfil.proximoVencimento || null,
    motivo: 'Assinatura em dia',
  };
}

function formatarData(dataIso) {
  if (!dataIso) return '';
  try {
    const [ano, mes, dia] = dataIso.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataIso;
  }
}

// ==========================================
// COBRANÇA ASAAS (CALLABLES: o servidor cria a cobrança e o plano só muda pelo webhook)
// ==========================================
const chamarFuncao = (nome) => httpsCallable(getFunctions(app, 'southamerica-east1'), nome);

// Pré-validação só para feedback rápido; a validação final é do servidor
function validarDadosCartao({ numero, nomeTitular, validade }) {
  const numLimpo = String(numero).replace(/\D/g, '');
  if (numLimpo.length < 13 || !validarNumeroCartao(numLimpo)) {
    throw new Error('Número de cartão de crédito inválido.');
  }
  if (!nomeTitular || nomeTitular.trim().length < 3) {
    throw new Error('Informe o nome impresso no cartão de crédito.');
  }
  const [mes] = (validade || '').split('/').map(v => v.trim());
  if (!mes || parseInt(mes, 10) < 1 || parseInt(mes, 10) > 12) {
    throw new Error('Data de validade do cartão inválida (use MM/AA).');
  }
  return numLimpo;
}

/**
 * Cria a assinatura recorrente no cartão. O plano só é ativado quando o Asaas confirmar o pagamento (webhook).
 * Os dados do cartão seguem ao servidor e não são guardados no Firestore.
 * @returns {Promise<{assinaturaId: string, status: string}>}
 */
export async function iniciarAssinaturaCartao({ planoId, cpfCnpj, cartao, cep, numeroEndereco, telefone }) {
  if (!auth.currentUser) throw new Error('Usuário não autenticado.');
  const numero = validarDadosCartao(cartao);
  const { data } = await chamarFuncao('criarAssinaturaCartao')({
    planoId,
    cpfCnpj,
    cep,
    numeroEndereco,
    telefone,
    cartao: { numero, nomeTitular: cartao.nomeTitular, validade: cartao.validade, cvv: cartao.cvv },
  });
  return data;
}

/**
 * Gera a cobrança PIX do mês. A liberação acontece quando o webhook confirmar o pagamento.
 * @returns {Promise<{paymentId: string, valor: number, copiaECola: string, qrCodeImagem: string, expiraEm: string}>}
 */
export async function gerarCobrancaPix({ planoId, cpfCnpj }) {
  if (!auth.currentUser) throw new Error('Usuário não autenticado.');
  const { data } = await chamarFuncao('criarCobrancaPix')({ planoId, cpfCnpj });
  return data;
}


// ==========================================
// REGULARIZAR ASSINATURA MANUALMENTE (SUPER ADMIN OU PIX CONFIRMADO)
// ==========================================
export async function confirmarPagamentoManual(uid, dias = 30) {
  const proxima = new Date();
  proxima.setDate(proxima.getDate() + dias);
  const proximoVencimentoIso = dataLocalISO(proxima);

  const psicRef = doc(db, 'psicologos', uid);
  await updateDoc(psicRef, {
    statusPagamento: 'ativo',
    proximoVencimento: proximoVencimentoIso,
    updatedAt: serverTimestamp(),
  });

  await trackAction('ADMIN_PAYMENT_MANUAL_UNLOCK', { targetUid: uid, dias, proximoVencimento: proximoVencimentoIso });
  return true;
}

// ==========================================
// CONCEDER ISENÇÃO / CORTESIA (SUPER ADMIN)
// ==========================================
export async function alternarIsencaoPsicologo(uid, isIsento) {
  const psicRef = doc(db, 'psicologos', uid);
  const payload = { isIsento: !!isIsento, updatedAt: serverTimestamp() };
  if (isIsento) {
    payload.statusPagamento = 'isento';
  } else {
    const snap = await getDoc(psicRef);
    const atual = snap.exists() ? snap.data() : {};
    // Remover a isenção não concede acesso pago: só volta a 'ativo' com vencimento ainda válido
    if (atual.statusPagamento === 'isento') {
      const venc = parseDate(atual.proximoVencimento);
      payload.statusPagamento = venc && dataLocalISO(venc) >= dataLocalISO() ? 'ativo' : 'inadimplente';
    }
  }
  await updateDoc(psicRef, payload);

  await trackAction('ADMIN_TOGGLE_EXEMPTION', { targetUid: uid, isIsento: !!isIsento });
  return true;
}
