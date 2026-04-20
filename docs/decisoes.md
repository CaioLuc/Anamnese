# Decisões Técnicas — Caritas

Documento que registra as decisões de design e arquitetura inferidas a partir da análise do código-fonte. Serve como referência para manutenção e para novos contribuidores.

---

## 1. Escolha do Stack

### React 19 + Vite 8

- **Decisão**: Usar React com Vite em vez de Next.js ou CRA.
- **Racional**: A aplicação é uma SPA pura (sem SSR/SSG), hospedada como estáticos no Firebase Hosting. Vite oferece build rápido (~3s) e HMR instantâneo sem a complexidade do Next.js.
- **Consequência**: Não há roteamento baseado em arquivos — o roteamento interno é gerenciado via `useState` (`currentPath`) em vez de usar o React Router para todas as páginas. Apenas a rota `/agendar/:slug` é tratada pelo React Router.

### Tailwind CSS 3.4 com `darkMode: 'class'`

- **Decisão**: Estilização utility-first com suporte nativo a dark mode.
- **Racional**: Permite prototipação rápida e consistência visual. O dark mode é padrão (`default: 'dark'` no ThemeContext).
- **Consequência**: Componentes possuem strings de classe longas. Não há componentes de design system extraídos (ex: `<Button variant="primary">`), o que causa repetição de padrões de classe.

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

- **Decisão**: Existe um script de migração (`migrationV2.js`) para mover dados da estrutura plana original para a hierárquica.
- **Status**: O script existe mas não é chamado automaticamente. A função `vincularDadosAoUsuarioAtual()` foi marcada como obsoleta.

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
