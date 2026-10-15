# Arquitetura do Sistema — Caritas

> **Última atualização:** 28/04/2026

## Visão Geral

O **Caritas** é uma plataforma web SPA (Single Page Application) de gestão clínica para psicólogos, construída com React 19 + Vite e hospedada no Firebase. O sistema permite o registro de pacientes, preenchimento de anamneses estruturadas ou dinâmicas, evolução de sessões, controle financeiro e agendamento — tudo com isolamento de dados por psicólogo via Firestore. Existe também um painel administrativo para gerenciar psicólogos cadastrados e uma Cloud Function que integra com a API da OpenAI para gerar resumos clínicos via I.A.

---

## Tecnologias Utilizadas

| Camada | Tecnologia | Versão | Papel |
|---|---|---|---|
| **Frontend** | React | 19.2.x | Biblioteca de UI, componentes funcionais com Hooks |
| **Build** | Vite | 8.x | Bundler/dev server ultrarrápido |
| **Estilização** | Tailwind CSS | 3.4.x | Utility-first CSS (dark mode via classe) |
| **Backend** | Firebase Firestore | 10.x SDK | Banco de dados NoSQL em tempo real |
| **Autenticação** | Firebase Auth | 10.x SDK | Login por e-mail/senha |
| **Hospedagem** | Firebase Hosting | — | Deploy de SPA com CDN |
| **Cloud Functions** | Firebase Functions v2 | — | Endpoint serverless (resumo I.A.) |
| **I.A.** | OpenAI GPT-4o-mini | — | Geração de resumos clínicos |
| **PDF** | jsPDF | 2.5.x | Geração de relatórios PDF no client-side |
| **Gráficos** | Recharts | 3.8.x | Gráficos (barras, pizza) no dashboard financeiro |
| **Roteamento** | React Router DOM | 7.x | Roteamento SPA (rota pública + app principal) |

---

## Estrutura de Arquivos

```
Anamnese/
├── dist/                       # Build de produção (gerada por `vite build`)
├── docs/                       # Documentação do projeto (você está aqui)
├── functions/                  # Cloud Functions (Firebase)
│   └── index.js                #   ↳ Endpoint `gerarResumoIA` (OpenAI)
├── public/                     # Arquivos estáticos públicos
├── src/                        # Código-fonte principal
│   ├── assets/                 # Recursos estáticos (imagens, ícones)
│   ├── components/             # Componentes React (31 arquivos .jsx)
│   │   ├── AddPatientModal.jsx     # Modal de cadastro de paciente
│   │   ├── AdminPanel.jsx          # Painel administrativo completo
│   │   ├── Agenda.jsx              # Agenda do psicólogo (calendário)
│   │   ├── AgendaPublica.jsx       # Página pública de agendamento
│   │   ├── AnamneseForm.jsx        # Formulário anamnese adulto (stepper)
│   │   ├── AnamneseAdolescenteForm.jsx  # Formulário anamnese adolescente
│   │   ├── Clinicas.jsx            # Gestão de locais de atendimento
│   │   ├── ConfigAgenda.jsx        # Configurações da agenda (horários, slug)
│   │   ├── ConfirmDialog.jsx       # Dialog reutilizável de confirmação
│   │   ├── ContaBloqueada.jsx      # Tela exibida quando conta é desativada
│   │   ├── Dashboard.jsx           # Dashboard principal com KPIs
│   │   ├── ErrorBoundary.jsx       # Captura de erros React
│   │   ├── Financas.jsx            # Painel financeiro completo
│   │   ├── GlobalSearch.jsx        # Busca global (Ctrl+K)
│   │   ├── HelpPanel.jsx           # Painel de ajuda / FAQ
│   │   ├── Layout.jsx              # Shell principal (sidebar + header)
│   │   ├── Lixeira.jsx             # Lixeira (soft delete com 7 dias)
│   │   ├── Login.jsx               # Tela de login
│   │   ├── MoodChart.jsx           # Gráfico de humor ao longo do tempo
│   │   ├── OnboardingOverlay.jsx   # Onboarding de primeiro acesso
│   │   ├── Pacientes.jsx           # Listagem e gestão de pacientes
│   │   ├── PatientProfileModal.jsx # Prontuário completo do paciente
│   │   ├── QuestionarioBuilder.jsx # Editor de questionários dinâmicos
│   │   ├── QuestionarioFiller.jsx  # Preenchedor de questionários dinâmicos
│   │   ├── Questionarios.jsx       # Listagem de questionários/templates
│   │   ├── SelecionarTemplateModal.jsx  # Modal de seleção de template
│   │   ├── SessaoEvolucao.jsx      # Registro de nova sessão/evolução
│   │   ├── ToastContainer.jsx      # Sistema de notificações toast
│   │   ├── Tooltip.jsx             # Componente de tooltip reutilizável
│   │   └── UpgradeProModal.jsx     # Modal de upgrade de plano
│   ├── contexts/               # React Contexts
│   │   ├── ThemeContext.jsx        # Controle dark/light mode
│   │   └── ToastContext.jsx        # Sistema global de toasts
│   ├── hooks/                  # Custom Hooks
│   │   ├── useKeyboard.js          # Atalhos de teclado globais (Ctrl+S, Esc)
│   │   └── useUnsavedChanges.js    # Aviso ao sair com alterações pendentes
│   ├── locales/                # Internacionalização (reservado)
│   ├── services/               # Serviços / camada de dados
│   │   ├── adminService.js         # CRUD admin (psicólogos, logs, avisos)
│   │   ├── agendaService.js        # CRUD agendamentos + API pública
│   │   ├── anamnesisService.js     # [LEGADO] CRUD anamnese (coleção plana)
│   │   ├── authService.js          # Login/logout + observer de auth state
│   │   ├── firebase.js             # [LEGADO] Config Firebase antiga
│   │   ├── firebaseConfig.js       # Config Firebase ativa (Firestore + Auth)
│   │   ├── iaService.js            # Cliente da Cloud Function de I.A.
│   │   ├── logService.js           # Telemetria/auditoria (action_logs)
│   │   ├── patientService.js       # CRUD principal (pacientes, anamneses, sessões, clínicas, questionários)
│   │   ├── pdfUtils.js             # Gerador de PDFs (PdfBuilder class)
│   │   └── templatesPadrao.js      # Templates de anamnese embutidos
│   ├── utils/                  # Utilitários puros
│   │   ├── formatUtils.js          # Máscaras (CPF, telefone) + validação
│   │   ├── helpData.js             # Dados do FAQ / central de ajuda
│   │   └── migrationV2.js          # Script de migração para estrutura hierárquica
│   ├── App.jsx                 # Componente raiz (roteamento, auth, estado global)
│   ├── App.css                 # Estilos adicionais da aplicação
│   ├── index.css               # CSS base (Tailwind directives + custom)
│   └── main.jsx                # Entry point (React.createRoot, providers, force-reload diário)
├── firebase.json               # Config de deploy Firebase
├── firestore.rules             # Regras de segurança do Firestore
├── firestore.indexes.json      # Índices do Firestore
├── tailwind.config.js          # Configuração Tailwind (darkMode: 'class')
├── vite.config.js              # Configuração Vite
└── package.json                # Dependências e scripts
```

---

## Fluxo de Conexão entre Páginas/Módulos

```
┌─────────────────────────────────────────────────────────┐
│                    main.jsx (Entry Point)                │
│  ThemeProvider → ToastProvider → App → ToastContainer    │
│  + Force Reload Diário (localStorage check)             │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │     App.jsx     │
              │  BrowserRouter  │
              └───┬─────────┬───┘
                  │         │
    ┌─────────────▼───┐  ┌──▼──────────────┐
    │  /agendar/:slug │  │   /* (AppMain)   │
    │  AgendaPublica  │  │                  │
    │  (Sem auth)     │  │  Auth Check      │
    └─────────────────┘  │    ├─ Login      │
                         │    ├─ AdminPanel  │
                         │    ├─ Bloqueado   │
                         │    └─ Layout +    │
                         │       Conteúdo    │
                         └────────┬─────────┘
                                  │
                    ┌─────────────▼──────────────────┐
                    │         Layout.jsx              │
                    │  Sidebar + Header + GlobalSearch│
                    └──┬──────────────────────────────┘
                       │ renderContent() por rota interna
          ┌────────────┼────────────┬──────────────┐
          │            │            │              │
     Dashboard    Pacientes   SessaoEvolucao   Agenda
          │            │            │              │
     Financas    Questionarios   Clinicas      Lixeira
```

### Fluxo de Dados (Firestore)

```
Firestore Database
├── admins/{uid}                    ← Admins do sistema
├── psicologos/{uid}                ← Perfil do psicólogo
│   ├── pacientes/{pid}             ← Pacientes do psicólogo
│   │   ├── anamneses/{aid}         ← Anamneses do paciente
│   │   └── sessoes/{sid}           ← Sessões/evoluções do paciente
│   ├── questionarios/{qid}         ← Templates criados pelo psicólogo
│   ├── agendamentos/{aid}          ← Agendamentos (privado)
│   ├── horarios_ocupados/{sid}     ← Espelho público de slots
│   ├── clinicas/{cid}              ← Locais de atendimento
│   └── config/agenda               ← Configuração da agenda
├── slugs/{slug}                    ← Lookup: slug → uid (público)
├── config/aviso_global             ← Aviso broadcast do admin
├── action_logs/{logId}             ← Logs de telemetria/auditoria
└── logs_ia/{logId}                 ← Logs de uso da I.A. (Cloud Function)
```

---

## Modelo de Autenticação e Autorização

> **Atualizado em 15/10/2026** — 2FA passou a ser validado no servidor e exigido pelas regras do Firestore.

1. **Login**: E-mail + senha via Firebase Auth (`authService.js`).
2. **Verificação em duas etapas (2FA) por e-mail** — o código nunca existe no navegador:
   - `enviarCodigoMfa` (Cloud Function) gera 6 dígitos com `crypto.randomInt`, grava só o **hash** em `mfa_codigos/{uid}` (validade 10 min, 5 tentativas, reenvio a cada 60 s, máx. 5 envios/hora) e enfileira o e-mail na coleção `mail` (extensão **Trigger Email**).
   - `verificarCodigoMfa` compara em tempo constante, cria `mfa_sessoes/{uid}_{auth_time}` (validade 12 h), marca `emailVerified` e, se pedido, devolve um **token de dispositivo confiável** (30 dias; só o hash fica em `mfa_dispositivos`).
   - `validarDispositivoMfa` libera um novo login com esse token.
   - **Regras do Firestore** (`mfaOk()`): nenhum dado de `psicologos/**`, `config` ou `admins` é lido/escrito sem a sessão 2FA do `auth_time` atual. Senha vazada sozinha não abre prontuário.
3. **Roles**: Super Admin = documento em `admins/{uid}`. Só o e-mail bootstrap (com e-mail comprovado) se auto-registra; demais admins pelo console/Admin SDK.
4. **Líder Clínico**: definido **na assinatura** — quem contrata o Plano Clínica & Equipe (`perfil.plano === 'clinica'`). Não existe mais alternância manual de modo líder.
5. **Isolamento**: Cada psicólogo só acessa dados sob `/psicologos/{seu_uid}/...` (Firestore Rules).
6. **Conta bloqueada**: Admin pode desativar `ativo: false` → tela `ContaBloqueada`.
7. **Planos**: `basico`, `profissional` e `clinica` (`PLANOS_CARITAS` em `paymentService.js`). Pagamento ainda é simulado no cliente (ver `docs/tarefas.md`).

### Implantação do 2FA (obrigatória antes de publicar as regras)

1. Instalar a extensão **Trigger Email from Firestore** (coleção `mail`) e configurar o SMTP.
2. `firebase deploy --only functions` (runtime Node 22).
3. `firebase deploy --only firestore:rules`.
4. (Recomendado) Política de TTL do Firestore no campo `expiraEm` de `mfa_sessoes` e `mfa_dispositivos`.

> Publicar as regras sem as functions ou sem a extensão bloqueia o acesso de todos (ninguém recebe código).

### Testes das regras e do 2FA (Firebase Emulator Suite)

`npm run test:rules` sobe os emuladores de Auth, Firestore e Functions (`firebase emulators:exec`, projeto `demo-caritas`, nada toca produção) e roda `tests/emulador/` com `vitest.emulador.config.js`. `npm test` não inclui esses arquivos.

Pré-requisitos: Firebase CLI global (`npm i -g firebase-tools`), **JDK 21+** no PATH (o Firestore emulator não roda com JRE reduzido nem Java < 21) e `npm install` dentro de `functions/`.

- `regras.test.js` (`@firebase/rules-unit-testing`): sem `mfa_sessoes/{uid}_{auth_time}` válido, `psicologos/{uid}/**` é negado (inclusive sessão expirada ou de outro login); `admins/{uid}` só pelo e-mail bootstrap com `email_verified`; slugs só pelo dono; agendamento público só no formato da página, com espelho `horarios_ocupados` igual em data/hora (`getAfter`); `action_logs` append-only; campos de plano/cobrança fora do alcance do dono.
- `mfa-functions.test.js`: usa ID tokens reais do Auth emulator e chama as callables. Prova que `request.auth.token.auth_time` existe nas regras e que o id gravado pela Function é o mesmo que `mfaOk()` procura (leitura REST passa de 403 para 200 após `verificarCodigoMfa`). Cobre 5 tentativas erradas, validade de 10 min, reenvio a cada 60 s e dispositivo confiável.

> O emulador reproduz o formato do token, mas não é produção. Depois de publicar, confirmar um login real com 2FA antes de liberar o hosting.

---

## Scripts de Desenvolvimento

```bash
npm run dev              # Servidor de desenvolvimento (Vite)
npm run build            # Build de produção
npm run preview          # Preview do build localmente
npm test                 # Testes unitários (Vitest)
npm run test:rules       # Regras do Firestore + functions de 2FA no Emulator Suite (JDK 21+)
npm run deploy:hosting   # Build + deploy no Firebase Hosting
firebase deploy          # Deploy completo (hosting + rules + functions)
```

---

## Avaliação de Usabilidade

Uma auditoria detalhada de Experiência do Usuário (UX) e da interface foi realizada aplicando as 10 Heurísticas de Nielsen.
A avaliação completa encontra-se documentada no arquivo centralizado: **[`AUDITORIA_UX.md`](./AUDITORIA_UX.md)**.
