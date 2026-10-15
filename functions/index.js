const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");

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
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
const ts = (ms) => admin.firestore.Timestamp.fromMillis(ms);

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
    verificadoEm: admin.firestore.FieldValue.serverTimestamp(),
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
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
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
