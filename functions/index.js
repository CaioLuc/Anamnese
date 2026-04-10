const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");

admin.initializeApp();
const db = admin.firestore();

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
  { secrets: [openaiKey], region: "southamerica-east1", cors: true },
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

    // 2. Verificar plano do psicólogo (segurança server-side)
    const perfilDoc = await db.doc(`psicologos/${uid}`).get();
    if (!perfilDoc.exists) {
      throw new HttpsError("not-found", "Perfil de psicólogo não encontrado.");
    }

    const perfil = perfilDoc.data();
    if (perfil.plano !== "pro" && perfil.plano !== "premium") {
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
