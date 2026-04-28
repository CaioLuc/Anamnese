# Componentes, Funções e Estilos — Caritas

> **Última atualização:** 28/04/2026
---

## Componentes Visuais (React)

### Páginas / Telas Principais

| Componente | Arquivo | Descrição |
|---|---|---|
| **Login** | `Login.jsx` | Tela de autenticação com e-mail/senha via Firebase Auth. |
| **DashboardSummary** | `Dashboard.jsx` | Dashboard principal com KPIs: total de pacientes, sessões do mês, próximos agendamentos, e alertas globais do admin. |
| **Pacientes** | `Pacientes.jsx` | Listagem de pacientes com busca, filtros por local, visualização em cards ou lista. Botão para adicionar novo paciente. |
| **SessaoEvolucao** | `SessaoEvolucao.jsx` | Formulário para registrar nova sessão/evolução. Campos: data, status (Presente/Faltou/Cancelou), humor (escala), valor, pagamento, observações, comportamento, sintomas. |
| **Agenda** | `Agenda.jsx` | Calendário interativo com agendamentos do psicólogo. CRUD completo de agendamentos com data, hora, paciente e duração. |
| **AgendaPublica** | `AgendaPublica.jsx` | Página pública (sem auth) acessível via slug `/agendar/:slug` para pacientes agendar consultas. |
| **ConfigAgenda** | `ConfigAgenda.jsx` | Configuração da agenda: dias/horários de atendimento, duração padrão, intervalo, slug personalizado. |
| **Financas** | `Financas.jsx` | Painel financeiro com KPIs (total, recebido, pendente, ticket médio), gráficos (barras e pizza por forma de pagamento), filtros por período e tabela detalhada de sessões. |
| **Questionarios** | `Questionarios.jsx` | Listagem de templates de anamnese (padrão + personalizados). Permite criar, editar, duplicar e excluir questionários. |
| **Clinicas** | `Clinicas.jsx` | Gestão de locais de atendimento (CRUD de clínicas vinculadas ao psicólogo). |
| **Lixeira** | `Lixeira.jsx` | Pacientes soft-deleted com contagem regressiva de 7 dias. Permite restaurar antes da exclusão definitiva. |
| **AdminPanel** | `AdminPanel.jsx` | Painel administrativo para gerenciar psicólogos: visualizar métricas, alterar planos (básico/profissional), ativar/desativar contas, gerenciar trials, enviar avisos globais e auditar logs. |
| **ContaBloqueada** | `ContaBloqueada.jsx` | Tela exibida quando o admin desativa a conta do psicólogo. |

### Formulários Especializados

| Componente | Arquivo | Descrição |
|---|---|---|
| **AnamneseForm** | `AnamneseForm.jsx` | Formulário de anamnese para adultos. 7 seções (stepper): Histórico, Família, Motivo, Dinâmicas, Hábitos, Quadro Clínico, Finalização. Suporta auto-save, rascunho, barra de progresso, contagem de caracteres, tooltips clínicos e Ctrl+S. |
| **AnamneseAdolescenteForm** | `AnamneseAdolescenteForm.jsx` | Formulário de anamnese infanto-juvenil. Mesma arquitetura do adulto com seções específicas (gestação, desenvolvimento motor, seletividade alimentar, etc.). |
| **QuestionarioBuilder** | `QuestionarioBuilder.jsx` | Editor drag-and-drop para construir questionários personalizados. Suporta: text, textarea, radio, checkbox, select, section, scale. |
| **QuestionarioFiller** | `QuestionarioFiller.jsx` | Renderizador dinâmico de questionários. Recebe um template e gera o formulário correspondente. Pode operar em modo `readOnly`. |

### Modais

| Componente | Arquivo | Descrição |
|---|---|---|
| **PatientProfileModal** | `PatientProfileModal.jsx` | Prontuário completo do paciente. Abas: Evoluções (timeline com gráfico de humor) e Anamnese. Permite editar sessões, excluir, exportar PDF da sessão, exportar PDF do prontuário clínico completo e criar anamneses. |
| **AddPatientModal** | `AddPatientModal.jsx` | Modal para cadastrar novo paciente. Campos: nome, CPF (com validação e verificação de duplicidade), data de nascimento, telefone, e-mail, local de atendimento (select dinâmico a partir das clínicas cadastradas), valor da sessão, observações. |
| **AddAnamnesisModal** | `AddAnamnesisModal.jsx` | Modal para selecionar o tipo de anamnese (adulto, adolescente ou dinâmico) antes de iniciar o preenchimento. |
| **SelecionarTemplateModal** | `SelecionarTemplateModal.jsx` | Modal para escolher template de questionário (padrão embutido ou personalizado do psicólogo). |
| **ConfirmDialog** | `ConfirmDialog.jsx` | Dialog genérico de confirmação com variantes: `default` e `danger` (vermelho). Reusado em toda a aplicação. |
| **UpgradeProModal** | `UpgradeProModal.jsx` | Modal informativo sobre upgrade de plano (básico → profissional). |

### Componentes de Infraestrutura / UX

| Componente | Arquivo | Descrição |
|---|---|---|
| **Layout** | `Layout.jsx` | Shell principal da aplicação: sidebar retrátil com navegação, header com busca e controles, toggle de tema. |
| **GlobalSearch** | `GlobalSearch.jsx` | Busca global ativável por `Ctrl+K`. Pesquisa pacientes por nome/CPF com navegação rápida. |
| **Tooltip** | `Tooltip.jsx` | Componente de tooltip hover com ícone de interrogação. Usado para dicas clínicas nos formulários. |
| **ToastContainer** | `ToastContainer.jsx` | Renderiza notificações toast empilhadas (sucesso, erro, info). Integrado com `ToastContext`. |
| **OnboardingOverlay** | `OnboardingOverlay.jsx` | Overlay de onboarding para primeiro acesso do psicólogo. Apresenta as funcionalidades principais. |
| **MoodChart** | `MoodChart.jsx` | Gráfico de linha (Recharts) mostrando a evolução do humor do paciente ao longo das sessões. |
| **ErrorBoundary** | `ErrorBoundary.jsx` | Componente React class que captura erros em renderização de filhos e exibe fallback amigável. |
| **HelpPanel** | `HelpPanel.jsx` | Painel lateral de ajuda com FAQ estruturado e busca. Dados vindos de `helpData.js`. |
| **Button** | `ui/Button.jsx` | Botão reutilizável com variantes visuais (`primary`, `secondary`, `danger`, `ghost`) e tamanhos (`sm`, `md`, `lg`). |
| **Card** | `ui/Card.jsx` | Card base com variantes (`default`, `bordered`, `elevated`) e subcomponentes (`CardHeader`, `CardBody`). |
| **Badge** | `ui/Badge.jsx` | Badge/Pill de status com variantes de cores (`success`, `danger`, `warning`, `info`, `neutral`). |
| **Pagination** | `ui/Pagination.jsx` | Componente responsivo de paginação com controles visuais de numeração e ranges. |

---

## Funções JavaScript (Services)

### `patientService.js` — Serviço Principal de Dados

| Função | Parâmetros | Descrição |
|---|---|---|
| `lerPerfilPsicologo()` | — | Lê o perfil (plano, ativo, etc.) do psicólogo logado. |
| `salvarPerfilPsicologo(dados)` | `dados: object` | Cria ou atualiza o perfil do psicólogo. Usa `setDoc` para criação e `updateDoc` para atualização. |
| `criarPaciente(pacienteData)` | `pacienteData: object` | Cria um novo paciente na subcoleção do psicólogo logado. |
| `lerPacientes()` | — | Retorna todos os pacientes ativos (exclui soft-deleted). |
| `lerPaciente(id)` | `id: string` | Lê um paciente específico pelo ID. |
| `buscarPacientePorCPF(cpf)` | `cpf: string` | Busca paciente pelo CPF normalizado (dígitos). Usado para verificação de duplicidade. |
| `atualizarPaciente(id, dados)` | `id: string, dados: object` | Atualiza campos de um paciente existente. |
| `deletarPaciente(id)` | `id: string` | Soft delete: marca com `deletedAt` (lixeira). |
| `limparLixeiraPacientes(dias)` | `dias: number (default: 7)` | Hard delete automático de pacientes na lixeira há mais de N dias. Exclui subcoleções (anamneses + sessões). |
| `lerPacientesDeletados(dias)` | `dias: number (default: 7)` | Lista pacientes na lixeira com `diasRestantes` até exclusão definitiva. |
| `restaurarPaciente(id)` | `id: string` | Remove o campo `deletedAt` restaurando o paciente. |
| `criarAnamnese(anamneseData)` | `anamneseData: object` | Cria anamnese na subcoleção do paciente. Requer `id_paciente`. |
| `lerAnamnesesDoPaciente(id_paciente)` | `id_paciente: string` | Lista anamneses de um paciente, ordenadas por data (recente primeiro). |
| `lerAnamnese(id, id_paciente)` | `id: string, id_paciente: string` | Lê uma anamnese específica. |
| `atualizarAnamnese(id, id_paciente, dados)` | `id, id_paciente: string, dados: object` | Atualiza campos de uma anamnese. |
| `deletarAnamnese(id, id_paciente)` | `id, id_paciente: string` | Exclui permanentemente uma anamnese. |
| `criarSessao(sessaoData)` | `sessaoData: object` | Cria sessão/evolução. Requer `id_paciente`. |
| `lerSessoesDoPaciente(id_paciente)` | `id_paciente: string` | Lista sessões de um paciente, ordenadas por data. |
| `deletarSessao(id, id_paciente)` | `id, id_paciente: string` | Exclui permanentemente uma sessão. |
| `atualizarSessao(id, id_paciente, dados)` | `id, id_paciente: string, dados: object` | Atualiza campos de uma sessão. |
| `lerTodasSessoes()` | — | Busca todas as sessões de todos os pacientes (para o painel financeiro). Itera pacientes sequencialmente. |
| `lerTodasAnamneses()` | — | Busca todas as anamneses de todos os pacientes. |
| `criarQuestionario(dados)` | `dados: object` | Cria um template de questionário personalizado. |
| `lerQuestionarios()` | — | Lista todos os questionários do psicólogo. |
| `lerQuestionario(id)` | `id: string` | Lê um questionário específico. |
| `atualizarQuestionario(id, dados)` | `id: string, dados: object` | Atualiza um questionário. |
| `deletarQuestionario(id)` | `id: string` | Exclui um questionário. |
| `duplicarQuestionario(id)` | `id: string` | Duplica um questionário adicionando " (cópia)" ao nome. |
| `criarClinica(clinicaData)` | `clinicaData: object` | Cria um local de atendimento. |
| `lerClinicas()` | — | Lista clínicas do psicólogo, ordenadas por nome. |
| `deletarClinica(id)` | `id: string` | Exclui um local de atendimento. |

### `agendaService.js` — Agendamentos

| Função | Parâmetros | Descrição |
|---|---|---|
| `criarAgendamento(data)` | `data: object` | Cria agendamento + espelha slot público. |
| `lerAgendamentos()` | — | Lista todos os agendamentos do psicólogo. |
| `atualizarAgendamento(id, dados)` | `id: string, dados: object` | Atualiza agendamento + espelho. |
| `deletarAgendamento(id)` | `id: string` | Remove agendamento + espelho. |
| `salvarConfigAgenda(config)` | `config: object` | Salva configuração da agenda (horários, slug). Cria lookup de slug. |
| `lerConfigAgenda()` | — | Lê configuração da agenda do psicólogo logado. |
| `verificarSlugDisponivel(slug)` | `slug: string` | Verifica se um slug já está em uso por outro psicólogo. |
| `resolverSlug(slug)` | `slug: string` | **Público.** Converte slug → uid do psicólogo. |
| `lerConfigAgendaPublica(uid)` | `uid: string` | **Público.** Lê a configuração de agenda de qualquer psicólogo. |
| `lerAgendamentosDoDia(uid, dataStr)` | `uid: string, dataStr: string` | **Público.** Lista slots ocupados de um dia (sem dados pessoais). |
| `criarAgendamentoPublico(uid, dados)` | `uid: string, dados: object` | **Público.** Paciente cria agendamento pelo link de agenda. |

### `adminService.js` — Administração

| Função | Parâmetros | Descrição |
|---|---|---|
| `isAdminEmail(email)` | `email: string` | Verifica se o e-mail está na lista de admins (hardcoded). |
| `verificarOuCriarAdmin()` | — | Cria o documento admin no Firestore se não existir. |
| `listarTodosPsicologos()` | — | Lista todos os psicólogos cadastrados na plataforma. |
| `getMetricasPsicologo(uid)` | `uid: string` | Conta pacientes, sessões e anamneses de um psicólogo. |
| `contarPacientesDoPsicologo(uid)` | `uid: string` | Conta apenas pacientes de um psicólogo (rápida). |
| `atualizarPlanoPsicologo(uid, plano)` | `uid: string, plano: 'basico'\|'profissional'` | Altera o plano e o limite de locais. |
| `toggleAtivoPsicologo(uid, ativo)` | `uid: string, ativo: boolean` | Ativa/desativa conta de psicólogo. |
| `atualizarTrialPsicologo(uid, data)` | `uid: string, data: Date` | Define data de vencimento do trial. |
| `salvarAvisoGlobal(mensagem)` | `mensagem: string` | Define aviso global exibido no Dashboard de todos os psicólogos. |
| `lerAvisoGlobal()` | — | Lê o aviso global ativo. |
| `getEstatisticasGlobais(psicologos)` | `psicologos: array` | Calcula estatísticas agregadas (total, ativos, por plano). |
| `obterLogsAuditoria(max)` | `max: number (default: 250)` | Lista os logs mais recentes de auditoria. |
| `limparLogsAntigos(dias)` | `dias: number (default: 30)` | Deleta logs com mais de N dias. |

### `authService.js` — Autenticação

| Função | Parâmetros | Descrição |
|---|---|---|
| `loginFirebaseUser(email, password)` | `email, password: string` | Login via e-mail/senha com telemetria. |
| `logoutFirebaseUser()` | — | Logout com telemetria. |
| `subscribeToAuthChanges(callback)` | `callback: function` | Observer de mudanças no estado de auth (retorna unsubscribe). |

### `logService.js` — Telemetria

| Função | Parâmetros | Descrição |
|---|---|---|
| `trackAction(actionType, metadata)` | `actionType: string, metadata: object` | Registra ação no Firestore (`action_logs`). Captura uid, email, userAgent. Silencia erros para não quebrar a UI. |

### `exportService.js` — Exportação

| Função | Parâmetros | Descrição |
|---|---|---|
| `exportarDadosCSV(onProgress)` | `onProgress: function` | Busca todos os pacientes, sessões e anamneses, formata e dispara o download de 3 arquivos CSV. |

### `iaService.js` — Inteligência Artificial

| Função | Parâmetros | Descrição |
|---|---|---|
| `gerarResumoIA(tipo, conteudo)` | `tipo: 'sessao'\|'anamnese', conteudo: string` | Chama Cloud Function que usa GPT-4o-mini para gerar resumo clínico. Retorna `{ resumo, tokens }`. |

### `pdfUtils.js` — Geração de PDFs

| Função / Classe | Descrição |
|---|---|
| **`PdfBuilder`** (classe) | Builder para gerar PDFs com design system consistente (cores, headers, footers, paginação automática). Métodos: `addSection`, `addField`, `addInline`, `addInfoBlock`, `addTextBlock`, `addSpace`, `addAlert`, `save`. |
| `sanitizeText(str)` | Remove acentos e caracteres não-ASCII para compatibilidade com jsPDF. |
| `calcularIdade(dataNascimento)` | Calcula idade a partir de data de nascimento (string ISO). |
| `formatDateBR(dateStr)` | Converte `YYYY-MM-DD` para `DD/MM/YYYY`. |
| `gerarRelatorioFinanceiroPDF(sessoes, pacientes, label, totais)` | Gera PDF do relatório financeiro com resumo de KPIs e lista detalhada de sessões. |

### `templatesPadrao.js` — Templates Embutidos

| Exportação | Descrição |
|---|---|
| `TEMPLATE_ADULTO` | Template padrão de anamnese adulto (7 seções, 40 campos). |
| `TEMPLATE_ADOLESCENTE` | Template padrão de anamnese adolescente (7 seções, 35 campos). |
| `TEMPLATES_PADRAO` | Array com ambos os templates (disponíveis sem Firestore). |

---

## Custom Hooks

| Hook | Arquivo | Parâmetros | Descrição |
|---|---|---|---|
| `useKeyboard(shortcuts, enabled)` | `useKeyboard.js` | `shortcuts: Array<{key, ctrl?, shift?, action}>` | Registra atalhos de teclado globais. Ignora inputs exceto com `Ctrl` ou `Escape`. |
| `useEscapeKey(isOpen, onClose)` | `useKeyboard.js` | `isOpen: boolean, onClose: function` | Convenience hook para fechar modais com Escape. |
| `useUnsavedChanges(isDirty)` | `useUnsavedChanges.js` | `isDirty: boolean` | Mostra aviso do navegador ao tentar sair com dados não salvos (`beforeunload`). |

---

## Contexts (React Context API)

| Context | Arquivo | Valores Expostos | Descrição |
|---|---|---|---|
| `ThemeContext` | `ThemeContext.jsx` | `{ theme, toggleTheme }` | Controla dark/light mode. Persiste preferência no localStorage. Aplica classe `dark`/`light` no `<html>`. |
| `ToastContext` | `ToastContext.jsx` | `{ showToast, toasts }` | Sistema global de notificações toast. `showToast({ type, message, action? })`. |

---

## Utilitários (`utils/`)

### `formatUtils.js`

| Função | Parâmetros | Descrição |
|---|---|---|
| `formatCPF(value)` | `value: string` | Aplica máscara `XXX.XXX.XXX-XX`. |
| `cleanCPF(value)` | `value: string` | Remove máscara, retorna apenas dígitos. |
| `validarCPF(cpf)` | `cpf: string` | Valida CPF com dígitos verificadores. Rejeita sequências repetidas. Retorna `true` se vazio (opcional). |
| `formatTelefone(value)` | `value: string` | Aplica máscara `(XX) XXXXX-XXXX`. |

### `migrationV2.js`

| Função | Descrição |
|---|---|
| `migrateToV2()` | Migra dados do psicólogo logado da estrutura plana (v1) para a hierárquica (v2: `/psicologos/{uid}/...`). Usa batch write. |

### `helpData.js`

| Exportação | Descrição |
|---|---|
| Estrutura de FAQ | Dados estruturados em categorias para o `HelpPanel`. Perguntas e respostas sobre funcionalidades, segurança e uso da plataforma. |

---

## Cloud Functions (`functions/index.js`)

| Função | Trigger | Região | Descrição |
|---|---|---|---|
| `gerarResumoIA` | `onCall` (HTTPS) | `southamerica-east1` | Recebe `{ tipo, conteudo }`, valida auth e plano (`pro`/`premium`), chama GPT-4o-mini com prompts especializados e retorna `{ resumo, tokens }`. Registra uso em `logs_ia`. |

---

## Classes CSS Reutilizáveis (Tailwind)

O projeto utiliza **Tailwind CSS 3.4** com `darkMode: 'class'`. As classes mais recorrentes nos componentes são:

| Padrão | Uso |
|---|---|
| `bg-white/60 dark:bg-zinc-900/60` | Cards com glassmorphism (transparência) |
| `border border-slate-200 dark:border-white/5` | Bordas sutis com suporte a dark mode |
| `rounded-2xl` / `rounded-xl` | Cantos arredondados consistentes |
| `shadow-lg shadow-indigo-500/20` | Sombras coloridas (glow effect) |
| `text-slate-900 dark:text-white` | Texto principal |
| `text-slate-600 dark:text-slate-400` | Texto secundário |
| `bg-indigo-500 hover:bg-indigo-600` | Botões primários |
| `bg-emerald-500/10 text-emerald-400` | Status: pago / sucesso |
| `bg-red-500/10 text-red-400` | Status: risco / erro |
| `bg-amber-500/10 text-amber-400` | Status: pendente / alerta |
| `bg-cyan-500/10 text-cyan-400` | Elementos do formulário adolescente |
| `animate-in fade-in duration-500` | Animação de entrada de páginas |
| `custom-scrollbar` | Scrollbar estilizada (definida em `App.css`) |
| `transition-all` / `transition-colors` | Micro-animações em interações |
| `hover:scale-[1.02]` | Efeito hover em cards |
