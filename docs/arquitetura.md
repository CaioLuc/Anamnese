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

1. **Login**: E-mail + senha via Firebase Auth (`authService.js`)
2. **Roles**: Determinado por lista hardcoded de e-mails admin (`adminService.js`)
3. **Isolamento**: Cada psicólogo só acessa dados sob `/psicologos/{seu_uid}/...` (Firestore Rules)
4. **Conta bloqueada**: Admin pode desativar `ativo: false` → tela `ContaBloqueada`
5. **Planos**: `basico` (1 local) e `profissional` (4 locais) — controlado pelo admin

---

## Scripts de Desenvolvimento

```bash
npm run dev              # Servidor de desenvolvimento (Vite)
npm run build            # Build de produção
npm run preview          # Preview do build localmente
npm run deploy:hosting   # Build + deploy no Firebase Hosting
firebase deploy          # Deploy completo (hosting + rules + functions)
```

---

## Avaliação de Usabilidade

Uma auditoria detalhada de Experiência do Usuário (UX) e da interface foi realizada aplicando as 10 Heurísticas de Nielsen.
A avaliação completa encontra-se documentada no arquivo centralizado: **[`AUDITORIA_UX.md`](./AUDITORIA_UX.md)**.
