import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { trackAction } from './logService';
import logger from '../utils/logger';

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
  if (/^4/.test(limpo)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(limpo)) return 'Mastercard';
  if (/^3[47]/.test(limpo)) return 'Amex';
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(limpo)) return 'Elo';
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
    const dataTrial = perfil.trialAte ? new Date(perfil.trialAte) : null;
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
  if (perfil.proximoVencimento) {
    const dataVenc = new Date(perfil.proximoVencimento);
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
// PROCESSAMENTO DE CARTÃO DE CRÉDITO (ASAAS API OU MOCK)
// ==========================================
export async function cadastrarCartaoEAtivarPlano({
  numeroCartao,
  nomeTitular,
  validade,
  cvv,
  cpfCnpj,
  planoId = 'profissional',
}) {
  const planoEscolhido = PLANOS_CARITAS[planoId] || PLANOS_CARITAS.basico;
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  // Validações básicas de cartão
  const numLimpo = String(numeroCartao).replace(/\D/g, '');
  if (numLimpo.length < 13) {
    throw new Error('Número de cartão de crédito inválido.');
  }

  if (!nomeTitular || nomeTitular.trim().length < 3) {
    throw new Error('Informe o nome impresso no cartão de crédito.');
  }

  const [mes, ano] = (validade || '').split('/').map(v => v.trim());
  if (!mes || !ano || parseInt(mes, 10) < 1 || parseInt(mes, 10) > 12) {
    throw new Error('Data de validade do cartão inválida (use MM/AA).');
  }

  const bandeira = detectarBandeiraCartao(numLimpo);
  const ultimos4 = numLimpo.slice(-4);

  // Calcula próximo vencimento: hoje + 30 dias
  const dataHoje = new Date();
  const proximaCobranca = new Date(dataHoje);
  proximaCobranca.setDate(proximaCobranca.getDate() + 30);
  const proximoVencimentoIso = proximaCobranca.toISOString().split('T')[0];

  const faturaId = `FAT-${Date.now().toString(36).toUpperCase()}`;

  const novaFatura = {
    id: faturaId,
    data: dataHoje.toISOString(),
    valor: planoEscolhido.preco,
    plano: planoEscolhido.nome,
    formaPagamento: `Cartão de Crédito (${bandeira} •••• ${ultimos4})`,
    status: 'PAGO',
  };

  // Persiste no Firestore
  const psicRef = doc(db, 'psicologos', user.uid);
  const snap = await getDoc(psicRef);
  const faturasAtuais = snap.exists() ? (snap.data().historicoFaturas || []) : [];

  const updatePayload = {
    plano: planoEscolhido.id,
    max_locais: planoEscolhido.maxLocais,
    statusPagamento: 'ativo',
    proximoVencimento: proximoVencimentoIso,
    cartaoInfo: {
      bandeira,
      ultimos4,
      nomeTitular: nomeTitular.toUpperCase().trim(),
      validade: `${mes}/${ano}`,
      atualizadoEm: new Date().toISOString(),
    },
    historicoFaturas: [novaFatura, ...faturasAtuais].slice(0, 50),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(psicRef, updatePayload);

  await trackAction('SUBSCRIPTION_PLAN_UPGRADE', {
    plano: planoEscolhido.id,
    valor: planoEscolhido.preco,
    bandeira,
    ultimos4,
  });

  return {
    success: true,
    plano: planoEscolhido,
    proximoVencimento: proximoVencimentoIso,
    fatura: novaFatura,
  };
}

// ==========================================
// GERAÇÃO DE PIX MENSAL (ASAAS)
// ==========================================
export function gerarDadosPixMensal(planoId = 'profissional', psicologoEmail = '') {
  const plano = PLANOS_CARITAS[planoId] || PLANOS_CARITAS.basico;
  const txid = `CARITAS${Date.now().toString(36).toUpperCase()}`.slice(0, 25);
  const copiaECola = `00020126580014br.gov.bcb.pix0136caritas-pagamentos@asaas.com.br520400005303986540${plano.preco.toFixed(2)}5802BR5916CARITAS SAUDE ME6009SAO PAULO62070503***6304${txid.slice(-4)}`;

  return {
    txid,
    valor: plano.preco,
    planoNome: plano.nome,
    copiaECola,
    dataExpiracao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ==========================================
// REGULARIZAR ASSINATURA MANUALMENTE (SUPER ADMIN OU PIX CONFIRMADO)
// ==========================================
export async function confirmarPagamentoManual(uid, dias = 30) {
  const proxima = new Date();
  proxima.setDate(proxima.getDate() + dias);
  const proximoVencimentoIso = proxima.toISOString().split('T')[0];

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
  await updateDoc(psicRef, {
    isIsento: !!isIsento,
    statusPagamento: isIsento ? 'isento' : 'ativo',
    updatedAt: serverTimestamp(),
  });

  await trackAction('ADMIN_TOGGLE_EXEMPTION', { targetUid: uid, isIsento: !!isIsento });
  return true;
}
