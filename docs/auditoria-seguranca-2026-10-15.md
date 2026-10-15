# Auditoria de segurança e dados — 15/10/2026

Escopo: `src/services/authService.js`, `firebaseConfig.js`, `liderService.js`, `logService.js`, `GlobalSearch.jsx`, `firestore.rules`, `functions/index.js` e os fluxos que gravam dado clínico (`patientService.js`, formulários de anamnese e sessão).

**O que o sistema faz:** prontuário eletrônico para psicólogas(os). Cada profissional entra com e-mail, senha e código 2FA por e-mail; pacientes, anamneses e evoluções ficam no Firestore, isolados por regras. Cobrança e 2FA rodam em Cloud Functions.

**Carga assumida:** dezenas a poucas centenas de profissionais, um navegador por pessoa, com computadores de consultório que podem ser compartilhados.

## Senhas

As senhas **não** ficam no nosso banco. Elas só vão para o Firebase Authentication (`signInWithEmailAndPassword` / `createUserWithEmailAndPassword` em `authService.js`), que guarda apenas o hash (scrypt com sal, padrão do Firebase). Nenhuma senha é gravada no Firestore, em `localStorage`, em log ou mandada para uma Cloud Function.

**Não crie uma cópia "criptografada" da senha no Firestore.** Criptografia é reversível: quem tiver a chave lê a senha. O hash do Firebase é de mão única e já é o padrão correto. Uma segunda cópia só aumentaria o risco.

## Corrigido neste PR

1. **Cópia offline do Firestore ficava no computador após sair** (`src/services/authService.js`, logout)
   - **O que é:** o Firestore guarda uma cópia local (IndexedDB, um banco do navegador) para funcionar offline.
   - **Problema:** essa cópia tem CPF, anamneses e evoluções em texto puro e continuava no disco depois do logout. Em um computador de consultório compartilhado, qualquer pessoa abre o DevTools e lê.
   - **Correção:** no logout, `terminate(db)` + `clearIndexedDbPersistence(db)`. Se outra aba estiver aberta, a limpeza falha sem travar o logout e acontece na próxima saída.

2. **Fila de triagem do Líder sobrevivia ao logout** (`src/services/liderService.js`, `authService.js`)
   - **Problema:** `caritas_lider_triagem` e `caritas_lider_equipe` (nome, idade, queixa) ficavam no `localStorage`; `limparStorageLider` nunca era chamado.
   - **Correção:** o logout agora chama `limparStorageLider()`, inclusive na saída por inatividade.

3. **Busca global gravava o que foi digitado no log de auditoria** (`src/components/GlobalSearch.jsx`)
   - **Problema:** `SEARCH_SELECT` salvava o texto da busca e o rótulo do resultado, que podem ser nome ou CPF de paciente, em `action_logs`, que o admin lê.
   - **Correção:** o log guarda só o tipo e a rota.

4. **Perfil novo podia nascer sem status de pagamento ou com trial próprio** (`firestore.rules`, `psicologos/{uid}`)
   - **Problema:** a regra aceitava criar o perfil sem `statusPagamento`, e o paywall trata perfil sem status como ativo. Também aceitava `trialAte` e `proximoVencimento` escolhidos pelo próprio usuário.
   - **Correção:** criação exige `statusPagamento == 'pendente'` e recusa `trialAte`, `proximoVencimento`, `isIsento` e campos de cobrança. Teste em `tests/emulador/regras.test.js`.

5. **Cobrança PIX órfã quando o QR falhava** (`functions/index.js`, `criarCobrancaPix`)
   - **Problema:** se o Asaas recusava o QR (ex.: conta sem chave Pix), a cobrança já criada ficava pendente no Asaas.
   - **Correção:** a cobrança é apagada antes de devolver o erro.

## Must fix (pendente)

6. **Campos clínicos sem criptografia de aplicação** (`src/services/patientService.js`: `criarAnamnese`, `atualizarAnamnese`, `criarSessao`, `atualizarSessao`)
   - **O que é:** a AGENTS.md (§2.3) exige AES-GCM-256 em queixa principal, hipótese diagnóstica e evolução.
   - **Problema:** esses textos vão em texto puro para o Firestore. O Google criptografa o disco, mas qualquer acesso válido ao banco (admin, backup, export, regra errada) lê tudo.
   - **Correção:** precisa de decisão de chave antes de código. Opção mais simples: Cloud Function que cifra/decifra com chave no Secret Manager (ou Cloud KMS) por psicólogo. Cifrar no navegador quebra busca e o resumo por IA e exige gestão de chave por dispositivo.
   - **Se não fizer:** descumprimento da regra do projeto e maior impacto em vazamento (LGPD art. 46).

7. **Dados do cartão passam pela nossa Cloud Function** (`functions/index.js`, `criarAssinaturaCartao`)
   - **Problema:** número e CVV chegam ao nosso servidor antes de ir ao Asaas. Não guardamos, mas o servidor entra no escopo PCI-DSS (norma de segurança de cartão).
   - **Correção:** usar a página de pagamento hospedada do Asaas (`invoiceUrl` da primeira cobrança da assinatura) e não receber cartão no app.
   - **Se não fizer:** qualquer log ou erro futuro que imprima o corpo da requisição expõe cartões.

## Should fix (pendente)

8. **Admin lê e edita pacientes de todos os psicólogos** (`firestore.rules`, `pacientes/{pid}` com `isAdmin()`)
   - **Problema:** o painel admin usa isso para contar pacientes, mas a regra libera nome, CPF e telefone de todos os tenants.
   - **Correção:** guardar um contador no perfil (`totalPacientes`, atualizado por função) e tirar `isAdmin()` da leitura de `pacientes`.

9. **Texto clínico vai à OpenAI sem pseudonimização** (`functions/index.js`, `gerarResumoIA`)
   - **Problema:** nomes e detalhes identificáveis nas anotações seguem para fora do país.
   - **Correção:** avisar na tela antes do envio e remover nome/CPF do paciente do texto; confirmar o contrato (DPA) da OpenAI sem uso para treino.

10. **Sem App Check nas callables** (`functions/index.js`, 6 `onCall`)
    - **Problema:** qualquer cliente com um login válido chama as funções direto, fora do app (custo de e-mail e de IA).
    - **Correção:** ativar App Check (reCAPTCHA Enterprise) e `enforceAppCheck: true`.

11a. **Paywall só na interface** (`firestore.rules`, `pacientes`, `anamneses`, `sessoes` com só `isOwner(uid)`)
    - **Problema:** uma conta `pendente` (ou com trial vencido) não vê o app, mas consegue gravar pacientes e anamneses chamando o SDK direto. Já valia antes deste PR para trial vencido.
    - **Correção:** nas regras de escrita das subcoleções, exigir status ativo lendo `psicologos/{uid}` (`get()`), aceitando `ativo`, `trial` dentro da data, `isento` e a carência de 3 dias. Custa uma leitura extra por escrita.

## Nice to have

11. **Tentativas do 2FA zeram a cada reenvio** (`functions/index.js`, `enviarCodigoMfa`): 5 tentativas × 10 envios/hora = 50 palpites por hora num espaço de 1 milhão. Risco baixo (exige a senha). Correção: guardar tentativas por hora, não por código.
12. **Token de "lembrar dispositivo" não é revogado na troca de senha** (`mfa_dispositivos`): apagar os tokens do uid quando a senha for redefinida.
13. **`action_logs` aceita valores grandes** (`firestore.rules`): limitar o tamanho de `metadata` por campo para evitar logs inflados.

**Verdict:** os dados sensíveis estão isolados por profissional e as senhas estão corretas; o maior risco restante é o texto clínico sem criptografia de aplicação (6), seguido dos dados de cartão no servidor (7).

**Não checado:** histórico do git atrás de segredos antigos, configuração do console do Firebase (App Check, política de senha do Auth, rotação da chave SMTP), comportamento em execução (análise só estática).
