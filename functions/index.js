const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
// Import modular: no emulador o proxy de admin.firestore perde FieldValue/Timestamp
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { OpenAI } = require("openai");
const {
  PLANOS_COBRANCA,
  DIAS_CICLO,
  montarReferencia,
  chamarAsaas,
  dataIsoMaisDias,
  tratarWebhookAsaas,
} = require("./asaas");

admin.initializeApp();
const db = admin.firestore();
const REGIAO = "southamerica-east1";

// A chave fica nos secrets do Google Cloud — NUNCA no código
const openaiKey = defineSecret("OPENAI_API_KEY");

// =============================================
// PROMPTS ESPECIALIZADOS
// =============================================

const PROMPT_SESSAO = `Você é um assistente clínico especializado em psicologia. Seu trabalho é transformar anotações brutas de sessões terapêuticas em um resumo clínico profissional e estruturado.

REGRAS:
- Use linguagem técnica e profissional (3ª pessoa).
- NÃO invente informações que não estejam nas notas.
- Estruture o resumo nos seguintes tópicos (omita se não houver dados):
  1. Estado Emocional e Humor
  2. Temas Abordados
  3. Intervenções Realizadas
  4. Observações Comportamentais
  5. Evolução e Próximos Passos
- Seja conciso: máximo 250 palavras.
- Responda APENAS com o resumo, sem comentários adicionais.`;

const PROMPT_ANAMNESE = `Você é um assistente clínico especializado em psicologia. Seu trabalho é transformar dados brutos de anamnese em um resumo clínico conciso e estruturado para consulta rápida do profissional.

REGRAS:
- Use linguagem técnica e profissional (3ª pessoa).
- NÃO invente informações que não estejam nos dados.
- Estruture o resumo nos seguintes tópicos (omita se não houver dados):
  1. Dados Demográficos e Contexto
  2. Queixa Principal
  3. Histórico Clínico Relevante
  4. Fatores de Risco Identificados
  5. Impressão Clínica Inicial
- Seja conciso: máximo 300 palavras.
- Responda APENAS com o resumo, sem comentários adicionais.`;

// =============================================
// FUNCTION: Gerar Resumo por I.A.
// =============================================

exports.gerarResumoIA = onCall(
  { secrets: [openaiKey], region: REGIAO, cors: true },
  async (request) => {
    // 1. Verificar autenticação
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Você precisa estar logado.");
    }

    const uid = request.auth.uid;
    const { tipo, conteudo } = request.data;

    if (!tipo || !conteudo) {
      throw new HttpsError("invalid-argument", "Tipo e conteúdo são obrigatórios.");
    }
    if (String(conteudo).length > 20000) {
      throw new HttpsError("invalid-argument", "Texto longo demais para resumir (máx. 20 mil caracteres).");
    }
    await exigirSessaoMfa(request.auth);

    // 2. Verificar plano do psicólogo (segurança server-side)
    const perfilDoc = await db.doc(`psicologos/${uid}`).get();
    if (!perfilDoc.exists) {
      throw new HttpsError("not-found", "Perfil de psicólogo não encontrado.");
    }

    const perfil = perfilDoc.data();
    // IDs reais do catálogo (paymentService.PLANOS_CARITAS); "pro"/"premium" mantidos por legado
    if (!["profissional", "clinica", "pro", "premium"].includes(perfil.plano)) {
      throw new HttpsError(
        "permission-denied",
        "Recurso exclusivo do plano PRO. Faça upgrade para acessar."
      );
    }

    // 3. Escolher prompt
    const systemPrompt = tipo === "anamnese" ? PROMPT_ANAMNESE : PROMPT_SESSAO;

    // 4. Chamar OpenAI
    try {
      const client = new OpenAI({ apiKey: openaiKey.value() });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conteudo },
        ],
        max_tokens: 600,
        temperature: 0.3, // Baixa = mais preciso e menos criativo
      });

      const resumo = completion.choices[0]?.message?.content || "";
      const tokensUsados = completion.usage?.total_tokens || 0;

      // 5. Log de uso (para controle de custos futuro)
      await db.collection("logs_ia").add({
        uid,
        tipo,
        tokens: tokensUsados,
        modelo: "gpt-4o-mini",
        timestamp: FieldValue.serverTimestamp(),
      });

      return { resumo, tokens: tokensUsados };
    } catch (error) {
      console.error("Erro OpenAI:", error.message);
      throw new HttpsError("internal", "Erro ao gerar resumo. Tente novamente.");
    }
  }
);

// =============================================
// VERIFICAÇÃO EM DUAS ETAPAS (2FA) POR E-MAIL
// =============================================
// O código nunca sai do servidor: é gerado aqui, guardado só como hash e
// enviado por e-mail pela extensão "Trigger Email" (coleção `mail`).
// A sessão liberada fica em `mfa_sessoes/{uid}_{auth_time}`, que as regras do
// Firestore exigem para ler qualquer dado clínico.

const MFA_CODIGO_VALIDADE_MS = 10 * 60 * 1000;
const MFA_MAX_TENTATIVAS = 5;
const MFA_INTERVALO_REENVIO_MS = 60 * 1000;
// Conta também o envio automático de cada login
const MFA_MAX_ENVIOS_HORA = 10;
const MFA_SESSAO_VALIDADE_MS = 12 * 60 * 60 * 1000;
const MFA_DISPOSITIVO_VALIDADE_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (valor) => crypto.createHash("sha256").update(valor).digest("hex");
const ts = (ms) => Timestamp.fromMillis(ms);

function exigirLogin(request) {
  if (!request.auth || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Faça login novamente para continuar.");
  }
  return request.auth;
}

function mascararEmail(email) {
  const [nome, dominio] = email.split("@");
  const visivel = nome.length <= 2 ? nome[0] : nome.slice(0, 2);
  return `${visivel}${"•".repeat(Math.max(nome.length - visivel.length, 3))}@${dominio}`;
}

// Mesmo critério das regras do Firestore (mfaOk): sessão 2FA deste login ainda válida
async function exigirSessaoMfa(auth) {
  const snap = await db.doc(`mfa_sessoes/${auth.uid}_${auth.token.auth_time}`).get();
  if (!snap.exists || snap.data().expiraEm.toMillis() < Date.now()) {
    throw new HttpsError("permission-denied", "Confirme o código de verificação para continuar.");
  }
}

async function liberarSessao(auth) {
  await db.doc(`mfa_sessoes/${auth.uid}_${auth.token.auth_time}`).set({
    uid: auth.uid,
    authTime: auth.token.auth_time,
    verificadoEm: FieldValue.serverTimestamp(),
    expiraEm: ts(Date.now() + MFA_SESSAO_VALIDADE_MS),
  });
}

function emailDoCodigo(codigo) {
  const texto =
    `Seu código de verificação do CARITAS é ${codigo}.\n\n` +
    "Ele expira em 10 minutos. Se você não tentou entrar, troque sua senha imediatamente.";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1B2422">
      <p style="font-size:15px;margin:0 0 8px">Seu código de verificação do <strong>CARITAS</strong>:</p>
      <p style="font-size:34px;letter-spacing:10px;font-weight:700;margin:16px 0;color:#0E6B66">${codigo}</p>
      <p style="font-size:13px;color:#4B5652;margin:0 0 4px">O código expira em 10 minutos e só pode ser usado uma vez.</p>
      <p style="font-size:13px;color:#4B5652;margin:0">Se você não tentou entrar, troque sua senha imediatamente.</p>
    </div>`;
  return { subject: "Seu código de verificação do CARITAS", text: texto, html };
}

exports.enviarCodigoMfa = onCall({ region: REGIAO, cors: true }, async (request) => {
  const auth = exigirLogin(request);
  const ref = db.doc(`mfa_codigos/${auth.uid}`);
  const agora = Date.now();
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  await db.runTransaction(async (tx) => {
    const atual = (await tx.get(ref)).data() || {};
    const enviosRecentes = (atual.envios || []).filter((t) => agora - t < 60 * 60 * 1000);
    const ultimo = enviosRecentes[enviosRecentes.length - 1] || 0;

    if (agora - ultimo < MFA_INTERVALO_REENVIO_MS) {
      const espera = Math.ceil((MFA_INTERVALO_REENVIO_MS - (agora - ultimo)) / 1000);
      throw new HttpsError("resource-exhausted", `Aguarde ${espera}s para pedir um novo código.`, { espera });
    }
    if (enviosRecentes.length >= MFA_MAX_ENVIOS_HORA) {
      throw new HttpsError("resource-exhausted", "Limite de códigos atingido. Tente novamente em 1 hora.");
    }

    tx.set(ref, {
      hash: sha256(`${auth.uid}:${codigo}`),
      expiraEm: agora + MFA_CODIGO_VALIDADE_MS,
      tentativas: 0,
      envios: [...enviosRecentes, agora],
    });
    tx.create(db.collection("mail").doc(), { to: auth.token.email, message: emailDoCodigo(codigo) });
  });

  return {
    enviadoPara: mascararEmail(auth.token.email),
    reenviarEmSegundos: MFA_INTERVALO_REENVIO_MS / 1000,
  };
});

exports.verificarCodigoMfa = onCall({ region: REGIAO, cors: true }, async (request) => {
  const auth = exigirLogin(request);
  const codigo = String(request.data?.codigo || "").replace(/\D/g, "");
  if (codigo.length !== 6) {
    throw new HttpsError("invalid-argument", "Digite os 6 dígitos do código.");
  }

  const ref = db.doc(`mfa_codigos/${auth.uid}`);
  // Erros de negócio saem da transação como valor para que a contagem de tentativas seja gravada.
  const falha = await db.runTransaction(async (tx) => {
    const atual = (await tx.get(ref)).data();
    if (!atual || !atual.hash || Date.now() > atual.expiraEm) {
      return ["failed-precondition", "Código expirado. Peça um novo código."];
    }
    const esperado = Buffer.from(atual.hash, "hex");
    const recebido = Buffer.from(sha256(`${auth.uid}:${codigo}`), "hex");
    if (!crypto.timingSafeEqual(esperado, recebido)) {
      const restantes = MFA_MAX_TENTATIVAS - atual.tentativas - 1;
      tx.update(ref, restantes > 0 ? { tentativas: atual.tentativas + 1 } : { hash: null });
      return restantes > 0
        ? ["invalid-argument", `Código incorreto. ${restantes} tentativa(s) restante(s).`]
        : ["resource-exhausted", "Muitas tentativas incorretas. Peça um novo código."];
    }
    tx.update(ref, { hash: null });
    return null;
  });
  if (falha) throw new HttpsError(falha[0], falha[1]);

  await liberarSessao(auth);
  // O código chegou no e-mail da conta: o endereço está comprovado.
  if (!auth.token.email_verified) {
    // Melhor esforço: falhar aqui não pode invalidar um código já aceito
    await admin.auth().updateUser(auth.uid, { emailVerified: true }).catch((e) => console.error("emailVerified:", e.message));
  }

  let tokenDispositivo = null;
  if (request.data?.lembrar === true) {
    tokenDispositivo = crypto.randomBytes(32).toString("base64url");
    await db.doc(`mfa_dispositivos/${sha256(tokenDispositivo)}`).set({
      uid: auth.uid,
      criadoEm: FieldValue.serverTimestamp(),
      expiraEm: ts(Date.now() + MFA_DISPOSITIVO_VALIDADE_MS),
    });
  }
  return { ok: true, tokenDispositivo };
});

exports.validarDispositivoMfa = onCall({ region: REGIAO, cors: true }, async (request) => {
  const auth = exigirLogin(request);
  const token = String(request.data?.token || "");
  if (!token) return { ok: false };

  const snap = await db.doc(`mfa_dispositivos/${sha256(token)}`).get();
  const dispositivo = snap.data();
  if (!dispositivo || dispositivo.uid !== auth.uid || dispositivo.expiraEm.toMillis() < Date.now()) {
    return { ok: false };
  }
  await liberarSessao(auth);
  return { ok: true };
});

// =============================================
// COBRANÇA ASAAS (cartão recorrente e PIX mensal)
// =============================================
// O plano só muda no webhookAsaas, depois que o Asaas confirma o pagamento.
// Os callables apenas criam a cobrança. Dados de cartão são repassados ao Asaas e não são guardados.

const ASAAS_API_KEY = defineSecret("ASAAS_API_KEY");
const ASAAS_WEBHOOK_TOKEN = defineSecret("ASAAS_WEBHOOK_TOKEN");
// "sandbox" para testes; "producao" só depois de validar o fluxo inteiro
const ASAAS_AMBIENTE = defineString("ASAAS_AMBIENTE", { default: "sandbox" });

const configAsaas = () => ({ apiKey: ASAAS_API_KEY.value(), ambiente: ASAAS_AMBIENTE.value() });
const somenteDigitos = (valor) => String(valor || "").replace(/\D/g, "");

// Erro de dado do Asaas (4xx) vai ao usuário; o resto vira falha genérica, sem detalhe técnico
function erroAsaas(err) {
  console.error("Erro Asaas:", err.message, err.status || "");
  if (err.status >= 400 && err.status < 500) {
    return new HttpsError("invalid-argument", err.message);
  }
  return new HttpsError("internal", "Não foi possível falar com o Asaas. Tente novamente.");
}

async function comErroAsaas(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw erroAsaas(err);
  }
}

async function exigirPsicologo(uid) {
  const snap = await db.doc(`psicologos/${uid}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Perfil de psicólogo não encontrado.");
  return snap.data();
}

async function obterOuCriarCliente(uid, perfil, cpfCnpj, config) {
  if (perfil.asaasCustomerId) return perfil.asaasCustomerId;
  const cliente = await chamarAsaas(config, "/customers", {
    metodo: "POST",
    corpo: { name: perfil.nome || perfil.email, email: perfil.email, cpfCnpj, externalReference: uid },
  });
  await db.doc(`psicologos/${uid}`).update({ asaasCustomerId: cliente.id });
  return cliente.id;
}

function validarCpfCnpj(valor) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 && cpf.length !== 14) {
    throw new HttpsError("invalid-argument", "Informe um CPF ou CNPJ válido.");
  }
  return cpf;
}

exports.criarCobrancaPix = onCall({ region: REGIAO, cors: true, secrets: [ASAAS_API_KEY] }, async (request) => {
  const auth = exigirLogin(request);
  await exigirSessaoMfa(auth);
  const { planoId, cpfCnpj } = request.data || {};
  const plano = PLANOS_COBRANCA[planoId];
  if (!plano) throw new HttpsError("invalid-argument", "Plano inválido.");
  const cpf = validarCpfCnpj(cpfCnpj);

  const perfil = await exigirPsicologo(auth.uid);
  const config = configAsaas();
  return comErroAsaas(async () => {
    const customer = await obterOuCriarCliente(auth.uid, perfil, cpf, config);
    const cobranca = await chamarAsaas(config, "/payments", {
      metodo: "POST",
      corpo: {
        customer,
        billingType: "PIX",
        value: plano.preco,
        dueDate: dataIsoMaisDias(1),
        description: `CARITAS — ${plano.nome}`,
        externalReference: montarReferencia(auth.uid, planoId),
      },
    });
    const qr = await chamarAsaas(config, `/payments/${cobranca.id}/pixQrCode`);
    return {
      paymentId: cobranca.id,
      valor: plano.preco,
      copiaECola: qr.payload,
      qrCodeImagem: qr.encodedImage,
      expiraEm: qr.expirationDate,
    };
  });
});

exports.criarAssinaturaCartao = onCall({ region: REGIAO, cors: true, secrets: [ASAAS_API_KEY] }, async (request) => {
  const auth = exigirLogin(request);
  await exigirSessaoMfa(auth);
  const dados = request.data || {};
  const plano = PLANOS_COBRANCA[dados.planoId];
  if (!plano) throw new HttpsError("invalid-argument", "Plano inválido.");
  const cpf = validarCpfCnpj(dados.cpfCnpj);

  const numero = somenteDigitos(dados.cartao?.numero);
  if (numero.length < 13 || numero.length > 19) {
    throw new HttpsError("invalid-argument", "Número de cartão inválido.");
  }
  const [mes, ano] = String(dados.cartao?.validade || "").split("/").map((v) => v.trim());
  if (!/^(0[1-9]|1[0-2])$/.test(mes || "") || !/^\d{2}$/.test(ano || "")) {
    throw new HttpsError("invalid-argument", "Validade inválida (use MM/AA).");
  }
  const cvv = somenteDigitos(dados.cartao?.cvv);
  if (cvv.length < 3 || cvv.length > 4) {
    throw new HttpsError("invalid-argument", "CVV inválido.");
  }
  const nomeTitular = String(dados.cartao?.nomeTitular || "").trim();
  if (nomeTitular.length < 3) {
    throw new HttpsError("invalid-argument", "Informe o nome impresso no cartão.");
  }
  const cep = somenteDigitos(dados.cep);
  if (cep.length !== 8) throw new HttpsError("invalid-argument", "CEP inválido.");
  const numeroEndereco = String(dados.numeroEndereco || "").trim();
  if (!numeroEndereco) throw new HttpsError("invalid-argument", "Informe o número do endereço.");
  const telefone = somenteDigitos(dados.telefone);
  if (telefone.length < 10) throw new HttpsError("invalid-argument", "Informe um telefone com DDD.");

  const perfil = await exigirPsicologo(auth.uid);
  const config = configAsaas();
  return comErroAsaas(async () => {
    const customer = await obterOuCriarCliente(auth.uid, perfil, cpf, config);
    const assinatura = await chamarAsaas(config, "/subscriptions", {
      metodo: "POST",
      corpo: {
        customer,
        billingType: "CREDIT_CARD",
        cycle: "MONTHLY",
        value: plano.preco,
        nextDueDate: dataIsoMaisDias(0),
        description: `CARITAS — ${plano.nome}`,
        externalReference: montarReferencia(auth.uid, dados.planoId),
        creditCard: {
          holderName: nomeTitular.toUpperCase(),
          number: numero,
          expiryMonth: mes,
          expiryYear: `20${ano}`,
          ccv: cvv,
        },
        creditCardHolderInfo: {
          name: nomeTitular,
          email: perfil.email,
          cpfCnpj: cpf,
          postalCode: cep,
          addressNumber: numeroEndereco,
          phone: telefone,
        },
        remoteIp: request.rawRequest?.ip,
      },
    });

    // Assinatura anterior (troca de plano ou de cartão) sai só depois de a nova ser criada
    if (perfil.asaasSubscriptionId) {
      await chamarAsaas(config, `/subscriptions/${perfil.asaasSubscriptionId}`, { metodo: "DELETE" })
        .catch((err) => console.error("Falha ao cancelar assinatura anterior:", err.message));
    }

    const cartao = assinatura.creditCard || {};
    await db.doc(`psicologos/${auth.uid}`).update({
      asaasSubscriptionId: assinatura.id,
      cartaoInfo: {
        bandeira: cartao.creditCardBrand || "Cartão",
        ultimos4: String(cartao.creditCardNumber || numero).slice(-4),
        nomeTitular: nomeTitular.toUpperCase(),
        validade: `${mes}/${ano}`,
        atualizadoEm: new Date().toISOString(),
      },
    });
    // O plano só muda quando o webhook confirmar o primeiro pagamento
    return { assinaturaId: assinatura.id, status: assinatura.status };
  });
});

// Grava o efeito de um evento do Asaas. Idempotente: o mesmo evento (retry) não é aplicado duas vezes.
async function aplicarEventoAsaas({ eventoId, uid, status, planoId, fatura, assinaturaCancelada }) {
  const eventoRef = db.doc(`asaas_eventos/${eventoId}`);
  const psicRef = db.doc(`psicologos/${uid}`);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(eventoRef)).exists) return "duplicado";
    const psic = await tx.get(psicRef);
    if (!psic.exists) return "sem-perfil";
    // Cancelamento de assinatura já substituída não pode derrubar a nova
    if (assinaturaCancelada && psic.data().asaasSubscriptionId !== assinaturaCancelada) return "ignorado";

    const dados = { statusPagamento: status, updatedAt: FieldValue.serverTimestamp() };
    if (status === "ativo") {
      Object.assign(dados, {
        plano: planoId,
        max_locais: PLANOS_COBRANCA[planoId].maxLocais,
        proximoVencimento: dataIsoMaisDias(DIAS_CICLO),
        historicoFaturas: FieldValue.arrayUnion(fatura),
      });
    }
    if (assinaturaCancelada) dados.asaasSubscriptionId = FieldValue.delete();

    tx.update(psicRef, dados);
    tx.create(eventoRef, { uid, status, criadoEm: FieldValue.serverTimestamp() });
    return "aplicado";
  });
}

exports.webhookAsaas = onRequest({ region: REGIAO, secrets: [ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ mensagem: "Método não permitido." });
    return;
  }
  try {
    const { status, mensagem } = await tratarWebhookAsaas({
      headers: req.headers,
      corpo: req.body,
      tokenEsperado: ASAAS_WEBHOOK_TOKEN.value(),
      dependencias: {
        consultarPagamento: (id) => chamarAsaas(configAsaas(), `/payments/${id}`),
        consultarAssinatura: (id) => chamarAsaas(configAsaas(), `/subscriptions/${id}`),
        aplicarEvento: aplicarEventoAsaas,
        registrarErro: (msg) => console.error("Webhook Asaas:", msg),
      },
    });
    res.status(status).json({ mensagem });
  } catch (err) {
    // 500 faz o Asaas tentar de novo
    console.error("Erro no webhook Asaas:", err.message);
    res.status(500).json({ mensagem: "Erro interno." });
  }
});
