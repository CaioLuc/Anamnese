# Diretrizes do Agente — CARITAS (AGENTS.md)

Este documento define as diretrizes, padrões técnicos, regras de segurança (LGPD/CFP) e arquitetura que devem ser rigorosamente seguidos pelo agente de IA ao operar em qualquer arquivo deste repositório.

---

## 1. Identidade e Propósito do Projeto

* **Sistema:** **CARITAS** — Plataforma Clínica e Sistema de Anamnese Digital para Psicólogas(os).
* **Público-alvo:** Profissionais de saúde mental e clínicas de psicologia.
* **Foco:** Prontuário eletrônico seguro, agilidade durante a sessão de atendimento, facilidade de uso (IHC), controle financeiro e geração de resumos clínicos por I.A.
* **Idioma:** Todo o conteúdo de interface, mensagens de erro, documentação e comentários de código deve ser em **Português do Brasil (pt-BR)**.

---

## 2. Segurança de Dados, LGPD e Ética Profissional (CFP)

> [!IMPORTANT]
> Prontuários e anotações de evolução psicológica contêm **Dados Pessoais Sensíveis** (Art. 5º, II e Art. 11 da LGPD - Lei 13.709/2018). Toda modificação no sistema deve respeitar as regras abaixo:

1. **Isolamento de Dados por Psicólogo (Multi-tenancy Rígido):**
   * Nenhum psicólogo pode ter acesso aos pacientes, anamneses, sessões ou finanças de outro profissional.
   * No banco de dados relacional (PostgreSQL/Supabase), o isolamento **deve ser garantido por Row Level Security (RLS)** em 100% das tabelas baseando-se em `auth.uid() = psicologo_id`.
   * Nunca criar consultas públicas ou sem filtro de tenancy que exponham dados de saúde.

2. **Guarda Documental Obrigatória (Resolução CFP nº 01/2009):**
   * O Conselho Federal de Psicologia exige a guarda do prontuário por no mínimo **5 anos**.
   * Ao atender pedidos de exclusão de pacientes (direito ao esquecimento da LGPD), **não realizar deleção física imediata** dos registros clínicos. Proceder com a **anonimização cadastral** (desvinculando dados de identificação pessoal como nome e CPF) e preservando o histórico temporal exigido pelo conselho.
   * O sistema implementa **Soft-Delete com Lixeira de 7 dias** antes de qualquer expurgo.

3. **Criptografia de Campos Confidenciais:**
   * Textos de queixa principal, hipótese diagnóstica e anotações de evolução de sessão devem trafegar e ser armazenados com criptografia robusta (AES-GCM-256).

4. **Trilha de Auditoria Obrigatória (Art. 37 da LGPD):**
   * Qualquer visualização, edição ou exportação de prontuário deve gerar um registro na tabela `audit_logs` com timestamp, ID do profissional, ID do paciente, tipo de ação e IP de origem.
   * A tabela de auditoria é **append-only** (sem permissão de `UPDATE` ou `DELETE`).

---

## 3. Stack Tecnológica e Padrões de Código

### Frontend
* **React 19.2 + Vite 8** — Componentes funcionais com Hooks modernos.
* **Roteamento:** `react-router-dom` v7 com rotas SPA reais (`/dashboard`, `/pacientes`, `/nova-sessao`, `/agenda`, `/financas`, `/questionarios`, `/clinicas`, `/lixeira`, `/agendar/:slug`).
* **Estilização:** Tailwind CSS 3.4 com `darkMode: 'class'` controlado pelo `ThemeContext.jsx`.
* **Design System:** Usar as variáveis CSS de tema (`var(--bg-primary)`, `var(--bg-card)`, `var(--text-primary)`, `var(--accent)`, `var(--status-*)`) e classes utilitárias:
  * `ds-card`, `ds-btn`, `ds-input`, `font-heading` (fonte `Sora` para títulos; `Inter` para texto corrido).
* **Componentes Reutilizáveis:** Priorizar os componentes em [`src/components/ui/`](file:///c:/Projetos%20Faculdade/Anamnese/src/components/ui/) (`Button`, `Card`, `Badge`, `Pagination`, `Select`).
* **Telemetria e Logs:** Nunca usar `console.log` solto em produção; usar [`src/utils/logger.js`](file:///c:/Projetos%20Faculdade/Anamnese/src/utils/logger.js).

### Banco de Dados & Backend
* **PostgreSQL via Supabase:**
  * Modelagem normalizada com integridade referencial (`FOREIGN KEY ON DELETE CASCADE` ou `RESTRICT`).
  * Row Level Security (RLS) habilitado em todas as tabelas sensíveis.
  * Extensões: `pgcrypto` para criptografia e UUIDs.
* **Supabase Auth:**
  * Gestão de sessões, confirmação de e-mail e recuperação de senha.
* **Cloud Functions / Edge Functions:**
  * Resumos clínicos gerados via OpenAI (`gpt-4o-mini`) com prompts restritos à psicologia clínica (3ª pessoa, técnicos, sem alucinações).
  * Chaves e segredos armazenados exclusivamente em variáveis de ambiente seguras.

### Pagamentos
* **Asaas:** Gateway oficial para gestão de assinaturas recorrentes dos psicólogos (Planos Básico vs. Pro) e conciliação financeira via Webhook.

---

## 4. Usabilidade e Qualidade da Interface (IHC)

* **Heurísticas de Nielsen:** O sistema mantém nota de usabilidade **4.55/5.00** comprovada por auditoria técnica.
* **Feedback Imediato:** Toda ação assíncrona (salvar, carregar, deletar) deve apresentar feedback visual (spinners em botões, skeletons, toasts de sucesso ou erro).
* **Prevenção e Saída de Emergência:** Ações destrutivas requerem confirmação através de [`ConfirmDialog.jsx`](file:///c:/Projetos%20Faculdade/Anamnese/src/components/ConfirmDialog.jsx). Formulários longos (como anamnese) possuem auto-save com debounce no cliente e atalhos (`Ctrl+S`, `Ctrl+K`).

---

## 5. Skills Ativas no Workspace

O workspace conta com skills especializadas instaladas em `.agents/skills/`. O agente deve consultá-las antes de planejar ou executar alterações nos respectivos temas:

1. **`supabase`**: Padrões e boas práticas para Supabase (Auth, RLS, Edge Functions e Storage).
2. **`supabase-postgres-best-practices`**: Design de tabelas relacionais, migrations, índices e políticas de RLS no PostgreSQL.
3. **`migration`**: Execução de transições de banco, esquema e dados de forma reversível com prova de integridade.
4. **`safe-refactor`** e **`surgical-patch`**: Refatorações que preservam comportamento e correções cirúrgicas no escopo correto.
5. **`vercel-react-best-practices`**: Otimizações de renderização, bundle splitting e performance em React.
6. **`vercel-composition-patterns`**: Padrões de composição e arquitetura limpa de componentes React 19.
7. **`web-design-guidelines`**: Acessibilidade (a11y), contrastes e diretrizes de design de interface web.
8. **`caveman`**: Comunicação concisa e objetiva de alta densidade técnica com redução de tokens.
9. **`obsidian-best-practices`** e **`obsidian-cli`**: Manutenção da base de conhecimento na pasta `docs/`.

---

## 6. Documentação do Projeto (`docs/`)

A pasta [`docs/`](file:///c:/Projetos%20Faculdade/Anamnese/docs/) funciona como um cofre do **Obsidian** e é a fonte da verdade para arquitetura e decisões:
* [`docs/arquitetura.md`](file:///c:/Projetos%20Faculdade/Anamnese/docs/arquitetura.md) — Visão geral da arquitetura e fluxos.
* [`docs/decisoes.md`](file:///c:/Projetos%20Faculdade/Anamnese/docs/decisoes.md) — Architectural Decision Records (ADRs).
* [`docs/tarefas.md`](file:///c:/Projetos%20Faculdade/Anamnese/docs/tarefas.md) — Backlog técnico e histórico de tarefas.
* [`docs/design-system.md`](file:///c:/Projetos%20Faculdade/Anamnese/docs/design-system.md) — Especificação visual do Design System.
* [`docs/componentes.md`](file:///c:/Projetos%20Faculdade/Anamnese/docs/componentes.md) — Catálogo de componentes e funções.

Toda grande alteração arquitetural deve ser devidamente registrada nos arquivos correspondentes em `docs/`.

---

## 7. Verificação e Testes

Antes de concluir qualquer tarefa ou sugerir que um recurso está pronto:
1. Executar os testes automatizados: `npm test` (Vitest).
2. Garantir que a compilação do projeto passe sem erros: `npm run build`.
3. Verificar conformidade com as regras de ESLint: `npm run lint`.
