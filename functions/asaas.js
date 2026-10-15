// Integração com o Asaas (cobrança e webhook).
// Sem dependência do Firebase: as funções recebem o que precisam por parâmetro, o que permite testar isoladamente.
const crypto = require("crypto");

// Fonte da verdade dos preços no servidor: o cliente envia só o planoId.
// Precisa bater com PLANOS_CARITAS (src/services/paymentService.js).
const PLANOS_COBRANCA = {
  basico: { nome: "Plano Essencial", preco: 79.9, maxLocais: 1 },
  profissional: { nome: "Plano Profissional (Pro)", preco: 139.9, maxLocais: 4 },
  clinica: { nome: "Plano Clínica & Equipe", preco: 299.9, maxLocais: 10 },
};

const URL_ASAAS = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  producao: "https://api.asaas.com/v3",
};

// Eventos de cobrança que mudam o status (os demais são ignorados sem erro)
const EVENTOS_PAGAMENTO = {
  PAYMENT_CONFIRMED: "ativo",
  PAYMENT_RECEIVED: "ativo",
  PAYMENT_OVERDUE: "inadimplente",
};
// Status do Asaas que confirmam cada evento (conferido na API antes de agir)
const STATUS_CONFIRMA_PAGAMENTO = {
  PAYMENT_CONFIRMED: ["CONFIRMED", "RECEIVED"],
  PAYMENT_RECEIVED: ["CONFIRMED", "RECEIVED"],
  PAYMENT_OVERDUE: ["OVERDUE"],
};

const DIAS_CICLO = 30;

function montarReferencia(uid, planoId) {
  return `${uid}|${planoId}`;
}

function lerReferencia(referencia) {
  const [uid, planoId] = String(referencia || "").split("|");
  if (!uid || !PLANOS_COBRANCA[planoId]) return null;
  return { uid, planoId };
}

// Nunca registrar a chave: os erros devolvem só a descrição do Asaas e o status HTTP
async function chamarAsaas(config, caminho, { metodo = "GET", corpo } = {}) {
  const base = URL_ASAAS[config.ambiente];
  if (!base) throw new Error("Ambiente do Asaas inválido.");
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", access_token: config.apiKey },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados?.errors?.[0]?.description || `Asaas respondeu HTTP ${resposta.status}.`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function tokenValido(recebido, esperado) {
  if (!recebido || !esperado) return false;
  const a = Buffer.from(String(recebido));
  const b = Buffer.from(String(esperado));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Data YYYY-MM-DD no fuso de Brasília, somando dias
function dataIsoMaisDias(dias) {
  const data = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(data);
}

// Trata um POST do webhook do Asaas.
// dependencias: consultarPagamento(id), consultarAssinatura(id), aplicarEvento(dados) -> 'aplicado' | 'duplicado' | 'sem-perfil', registrarErro(msg)
// Retorna { status, mensagem } para a resposta HTTP.
async function tratarWebhookAsaas({ headers, corpo, tokenEsperado, dependencias }) {
  if (!tokenValido(headers?.["asaas-access-token"], tokenEsperado)) {
    return { status: 401, mensagem: "Token inválido." };
  }

  const evento = corpo?.event;

  if (EVENTOS_PAGAMENTO[evento] && corpo.payment?.id) {
    // Confere o status direto na API: o corpo do webhook não é fonte de confiança
    const pagamento = await dependencias.consultarPagamento(corpo.payment.id);
    if (!STATUS_CONFIRMA_PAGAMENTO[evento].includes(pagamento.status)) {
      return { status: 200, mensagem: "Status não confirma o evento; ignorado." };
    }
    const ref = lerReferencia(pagamento.externalReference);
    if (!ref) {
      dependencias.registrarErro(`Pagamento ${pagamento.id} sem referência válida.`);
      return { status: 200, mensagem: "Referência desconhecida; ignorado." };
    }
    const plano = PLANOS_COBRANCA[ref.planoId];
    if (Math.abs(Number(pagamento.value) - plano.preco) > 0.01) {
      dependencias.registrarErro(`Pagamento ${pagamento.id} com valor divergente do plano ${ref.planoId}.`);
      return { status: 200, mensagem: "Valor divergente; ignorado." };
    }

    const resultado = await dependencias.aplicarEvento({
      eventoId: `${evento}_${pagamento.id}`,
      uid: ref.uid,
      status: EVENTOS_PAGAMENTO[evento],
      planoId: ref.planoId,
      fatura: {
        id: pagamento.id,
        data: pagamento.paymentDate || pagamento.confirmedDate || new Date().toISOString(),
        valor: plano.preco,
        plano: plano.nome,
        formaPagamento: pagamento.billingType,
        status: "PAGO",
      },
    });
    return { status: 200, mensagem: resultado };
  }

  if (evento === "SUBSCRIPTION_DELETED" && corpo.subscription?.id) {
    const assinatura = await dependencias.consultarAssinatura(corpo.subscription.id);
    if (assinatura.status === "ACTIVE") {
      return { status: 200, mensagem: "Assinatura ainda ativa; ignorado." };
    }
    const ref = lerReferencia(assinatura.externalReference);
    if (!ref) {
      dependencias.registrarErro(`Assinatura ${assinatura.id} sem referência válida.`);
      return { status: 200, mensagem: "Referência desconhecida; ignorado." };
    }
    const resultado = await dependencias.aplicarEvento({
      eventoId: `${evento}_${assinatura.id}`,
      uid: ref.uid,
      status: "cancelado",
      planoId: null,
      assinaturaCancelada: assinatura.id,
    });
    return { status: 200, mensagem: resultado };
  }

  // Evento sem efeito no acesso (ex.: PAYMENT_CREATED, PAYMENT_DELETED de PIX não pago)
  return { status: 200, mensagem: "Evento ignorado." };
}

module.exports = {
  PLANOS_COBRANCA,
  DIAS_CICLO,
  montarReferencia,
  lerReferencia,
  chamarAsaas,
  dataIsoMaisDias,
  tratarWebhookAsaas,
};
