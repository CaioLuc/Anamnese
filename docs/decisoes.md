# Decisões Técnicas — Caritas

> **Última atualização:** 28/04/2026

Documento que registra as decisões de design e arquitetura inferidas a partir da análise do código-fonte. Serve como referência para manutenção e para novos contribuidores.

---

## 1. Escolha do Stack

### React 19 + Vite 8

- **Decisão**: Usar React com Vite em vez de Next.js ou CRA.
- **Racional**: A aplicação é uma SPA pura (sem SSR/SSG), hospedada como estáticos no Firebase Hosting. Vite oferece build rápido (~3s) e HMR instantâneo sem a complexidade do Next.js.
- **Consequência**: Inicialmente o roteamento interno era via `useState` (`currentPath`), mas foi migrado para React Router DOM com rotas reais (`/dashboard`, `/pacientes`, `/financas`, etc.), habilitando deep-linking e botão Voltar do navegador.

### Tailwind CSS 3.4 com `darkMode: 'class'`

- **Decisão**: Estilização utility-first com suporte nativo a dark mode.
- **Racional**: Permite prototipação rápida e consistência visual. O dark mode é padrão (`default: 'dark'` no ThemeContext).
- **Consequência**: Componentes possuem strings de classe longas. ~~Não há componentes de design system extraídos~~ → Resolvido: foram criados componentes reutilizáveis (`<Button>`, `<Card>`, `<Badge>`, `<Pagination>`) em `src/components/ui/` e classes utilitárias do Design System (`ds-card`, `ds-btn`, `ds-input`).

### Firebase (Firestore + Auth + Hosting + Functions)

- **Decisão**: Backend 100% Firebase (serverless).
- **Racional**: Zero infraestrutura para gerenciar, escalabilidade automática, e integração nativa entre serviços (auth, database, hosting, functions). Custo inicial zero (Spark plan).
- **Consequência**: Vendor lock-in com Google. Firestore é NoSQL sem JOINs, o que exige desnormalização ou queries compostas (ex: `lerTodasSessoes` itera pacientes).

---

## 2. Arquitetura de Dados (Firestore)

### Estrutura Hierárquica (v2)

- **Decisão**: Dados isolados por psicólogo usando subcoleções: `/psicologos/{uid}/pacientes/{pid}/sessoes/{sid}`.
- **Racional**: Isolamento de dados no nível da estrutura do banco. Mesmo sem Firestore Rules perfeitas, um psicólogo não consegue acessar dados de outro porque as referências de coleção são geradas com `auth.currentUser.uid`.
- **Trade-off**: Para queries globais (ex: dashboard financeiro), é necessário buscar todos os pacientes e depois iterar sessões — não existe Collection Group Query configurada (requer índice). A função `lerTodasSessoes()` é O(n) em pacientes.

### Migração v1 → v2

- **Decisão**: Existia um script de migração (`migrationV2.js`) para mover dados da estrutura plana original para a hierárquica.
- **Status**: ✅ Migração concluída. O script `migrationV2.js`, o arquivo legado `firebase.js` e o `anamnesisService.js` foram deletados. A função `vincularDadosAoUsuarioAtual()` em `patientService.js` permanece como stub morto e deve ser removida.

### Soft Delete (Lixeira)

- **Decisão**: Pacientes são "soft-deleted" com um campo `deletedAt` em vez de exclusão imediata.
- **Racional**: Proteção contra exclusão acidental. Retenção de 7 dias com garbage collection automática (`limparLixeiraPacientes`) executada no login.
- **Consequência**: Toda query de pacientes precisa filtrar `!p.deletedAt`.

---

## 3. Padrões de Organização

### Navegação Interna via Estado (não Router)

- **Decisão**: O roteamento principal é feito com `useState('dashboard')` e um `switch` no `renderContent()`, não com rotas do React Router.
- **Racional**: Simplifica o compartilhamento de estado global (patients, user) sem precisar de prop drilling entre rotas.
- **Consequência**: Não há URLs distintas para cada seção (ex: `/financas`), o que impede deep linking, bookmark, e navegação via browser back/forward dentro do app.

### Camada de Serviços Centralizada

- **Decisão**: Toda interação com Firestore passa por `patientService.js` e serviços equivalentes.
- **Racional**: Encapsulamento das referências Firestore, lógica de auth, e telemetria (`trackAction`) em um único local.
- **Consequência positiva**: Mudanças na estrutura do banco (ex: migração v1→v2) requerem alterações em apenas um arquivo.

### Telemetria Ubíqua

- **Decisão**: Praticamente toda ação do usuário é rastreada via `trackAction()` (login, CRUD, navegação, exportação).
- **Racional**: Coleta de dados para entender o uso da plataforma e identificar bugs.
- **Consequência**: Cada ação gera um write no Firestore (`action_logs`), o que pode impactar custos em escala. Os erros de telemetria são silenciados para não afetar UX.

### Chave de API Firebase no Código-Fonte

- **Decisão**: A `apiKey` do Firebase está hardcoded em `firebaseConfig.js`.
- **Racional**: É o comportamento padrão do Firebase Web SDK — a API key do Firebase é uma chave pública que identifica o projeto, não um segredo. A segurança real é feita pelas Firestore Rules.
- **Nota**: A chave da OpenAI está corretamente protegida via Google Cloud Secrets e acessada apenas server-side na Cloud Function.

---

## 4. Decisões de UX

### Formulários com Stepper + Auto-Save

- **Decisão**: Anamneses são divididas em seções navegáveis (stepper com emojis) e possuem auto-save local.
- **Racional**: Formulários longos (30+ campos) precisam de navegação visual e proteção contra perda de dados. O auto-save usa `localStorage` com debounce de 2 segundos.
- **Consequência**: Rascunhos ficam no dispositivo do usuário (não sincronizados entre dispositivos).

### Force Reload Diário

- **Decisão**: `main.jsx` força um `window.location.reload()` na primeira visita de cada dia.
- **Racional**: Garante que o usuário sempre use o bundle mais recente sem depender de cache-busting headers.
- **Consequência**: Uma recarga invisível na primeira visita do dia. O mecanismo usa localStorage e tem proteção contra loops infinitos.

### Alertas Visuais de Preenchimento

- **Decisão**: Campos vazios em formulários de anamnese exibem bordas âmbar e um indicador visual.
- **Racional**: Feedback visual em tempo real sobre completude do formulário, sem bloquear o envio.

---

## 5. Pontos de Atenção Futura

### ⚠️ Arquivo Legado: `firebase.js` e `anamnesisService.js`

- `src/services/firebase.js` é uma versão antiga da configuração Firebase que importa `getAnalytics` sem usá-lo e tenta importar `getFirestore` sem a importação real. **Não é usado em produção** — o app usa `firebaseConfig.js`.
- `src/services/anamnesisService.js` usa a estrutura plana antiga (`collection(db, 'anamneses')`) e importa de `firebase.js`. **É código legado** que deveria ser removido ou marcado como deprecated.

### ⚠️ Performance: `lerTodasSessoes()` — Query N+1

- Essa função busca todos os pacientes e depois, **sequencialmente**, busca as sessões de cada um. Em contas com muitos pacientes, isso pode ser lento.
- **Solução sugerida**: Implementar Collection Group Query (`collectionGroup(db, 'sessoes')`) com index composto, ou cachear os resultados.

### ⚠️ Tamanho do Bundle

- O build gera um chunk principal de **1.668 KB** (480 KB gzipped). O Vite emite warning sobre isso.
- **Solução sugerida**: Code-splitting com `React.lazy()` + `Suspense` para componentes pesados (AdminPanel, PatientProfileModal, formulários de anamnese).

### ⚠️ Lista de Admins Hardcoded

- Os e-mails de admin estão hardcoded em `adminService.js` (`ADMIN_EMAILS`). Adicionar um novo admin requer alteração de código e novo deploy.
- **Solução sugerida**: Mover para uma coleção `admins` no Firestore ou usar Custom Claims do Firebase Auth.

### ⚠️ Segurança: Firestore Rules vs. Código

- As rules estão bem configuradas, mas existe um ponto onde `allow create: if true` para agendamentos e slots (necessário para a agenda pública). Isso permite escrita sem autenticação nessas coleções.
- **Risco**: Spam ou abuso na criação de agendamentos públicos. Considerar rate limiting via Cloud Functions ou CAPTCHA.

### ⚠️ Geração de PDF: Remoção de Acentos

- `pdfUtils.js` remove todos os acentos via `normalize("NFD")` porque a fonte padrão do jsPDF (Helvetica) não suporta caracteres especiais do português.
- **Solução sugerida**: Adicionar uma fonte com suporte a Unicode (ex: Roboto via `addFont`).

### ⚠️ Tratamento de Valores Monetários

- Valores de sessão são armazenados como strings no Firestore e parseados com `parseFloat()` no frontend. O campo `<input type="number">` pode gerar inconsistências com vírgulas em localidades brasileiras.
- **Mitigação atual**: `getSessaoValor()` em `Financas.jsx` trata vírgulas e faz fallback para `valor_sessao` do paciente.
- **Solução ideal**: Normalizar para `Number` no momento do save em `SessaoEvolucao.jsx`.

---

## 6. Decisões de 15/10/2026 (revitalização)

### ADR-2026-10-A — 2FA validado no servidor e exigido pelas regras
- **Contexto**: o código era gerado no navegador, exibido na tela e havia um código mestre (`123456`). Não protegia nada.
- **Decisão**: código gerado e conferido em Cloud Functions, enviado só por e-mail (SMTP direto da Function com `nodemailer`; ver ADR-2026-10-H), sessão ligada ao `auth_time` do token e checada nas regras (`mfaOk()`).
- **Consequência**: deploy de functions + rules precisa ser conjunto; e-mail mal configurado bloqueia o acesso.

### ADR-2026-10-B — Líder Clínico vem do plano
- **Decisão**: `isLider = perfil.plano === 'clinica'`. Remove o botão "Mudar" e o padrão "líder ligado" do `localStorage`, que dava o painel de líder a qualquer psicólogo.

### ADR-2026-10-C — PDFs com seções preguiçosas
- **Decisão**: `PdfBuilder.addSection()` só desenha o título quando a seção recebe o primeiro conteúdo; campos vazios, `false` e marcadores ("N/D", "Não informado") são omitidos (`temValor`). Nenhum texto clínico padrão é inventado.
- **Consequência**: anamneses parcialmente preenchidas não geram seções em branco; documentos CFP mostram só o que foi informado. Acentos voltaram (Helvetica/WinAnsi cobre o Latin-1).

### ADR-2026-10-D — Lixeira anonimiza em vez de apagar
- **Decisão**: após 7 dias, os dados de identificação do paciente são removidos (`anonimizado: true`) e anamneses/sessões são preservadas (Res. CFP 01/2009, guarda de 5 anos).

### ADR-2026-10-E — Nova identidade visual "Consultório"
- **Decisão**: papel quente (#F5F3EE), tinta esverdeada, petróleo (#0E6B66) como marca e terracota pontual; Newsreader (títulos) + Public Sans (interface). Mantidos nome e logo. Detalhes em `design-system.md`.

### ADR-2026-10-G — Cobrança Asaas no servidor (plano só muda pelo webhook)
- **Contexto**: o cliente gravava `plano`, `statusPagamento` e a fatura "PAGO" direto no Firestore, e as regras deixavam o dono editar esses campos. Qualquer conta se promovia a Líder Clínico (`plano === 'clinica'`) e liberava o resumo por IA.
- **Decisão**: `criarCobrancaPix` e `criarAssinaturaCartao` (callables, `southamerica-east1`) criam a cobrança no Asaas. `webhookAsaas` (HTTP) ativa, inadimplenta ou cancela com o Admin SDK. Preço vem do servidor (`functions/asaas.js`), e o cliente só envia `planoId`.
- **Webhook**: confere o header `asaas-access-token` (comparação em tempo constante), confere o status do pagamento/assinatura direto na API do Asaas e valida o valor contra o preço do plano. Idempotente por `asaas_eventos/{evento}_{id}`. Responde 500 em falha, para o Asaas reenviar.
- **Regras**: dono não grava `plano`, `statusPagamento`, `trialAte`, `proximoVencimento`, `historicoFaturas`, `max_locais`, `cartaoInfo`, `asaasCustomerId` nem `asaasSubscriptionId`. Criação inicial só em trial, plano básico, 1 local. Delete do perfil só admin, para não recomeçar o trial.
- **Segredos**: `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` no Secret Manager. `ASAAS_AMBIENTE` (`sandbox` por padrão) escolhe a URL.
- **Consequências**: cartão não é guardado (só bandeira e 4 últimos dígitos). Trocar plano com assinatura de cartão cancela a anterior depois da nova ser criada. Cancelamento de assinatura substituída é ignorado. Cobrança PIX não paga não altera o acesso. Deploy das functions e das regras precisa ser conjunto.
- **Limites**: preços duplicados no servidor (`PLANOS_COBRANCA`) e no cliente (`PLANOS_CARITAS`), mantidos iguais por teste manual. Teste ponta a ponta só no sandbox do Asaas.

### ADR-2026-10-H — E-mail do 2FA direto da Function, sem a extensão Trigger Email
- **Contexto**: a extensão Trigger Email exigia instalação e configuração à parte e deixava o código em claro na coleção `mail` até o TTL.
- **Decisão**: `enviarCodigoMfa` envia pelo SMTP do Brevo com `nodemailer` (`SMTP_USUARIO` e `SMTP_REMETENTE` em `functions/.env`, `SMTP_SENHA` no Secret Manager). Falha no envio invalida o código e não conta no limite de reenvio.
- **Consequência**: uma dependência nova (`nodemailer`); plano grátis do Brevo (~300 e-mails/dia); senha de app do Gmail não estava disponível na conta. No emulador o e-mail vai para `mail` para os testes lerem o código.

### ADR-2026-10-F — Trilha de auditoria append-only
- **Decisão**: `action_logs` sem `update`/`delete` nas regras; `psicologoId` precisa ser o do usuário autenticado. Removido o botão "Limpar +30d" do Painel Admin.

---

## 7. Avaliação de Usabilidade (UX)

Uma auditoria profunda da interface, das falhas estruturais de UX listadas neste ADR e de métricas de Nielsen encontra-se no arquivo dedicado: **[`AUDITORIA_UX.md`](./AUDITORIA_UX.md)**. O arquivo documenta as falhas identificadas (como a de roteamento mencionada na seção 3) com propostas formais de resolução.
