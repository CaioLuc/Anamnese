# Backlog de Tarefas — Caritas

Documento com melhorias sugeridas, problemas identificados e TODOs encontrados no código.

---

## TODOs e Comentários Encontrados no Código

- [ ] **`firebase.js:4`** — `// TODO: Add SDKs for Firebase products that you want to use`
  - Este arquivo é legado e não é mais utilizado pela aplicação. Considerar exclusão total.

- [ ] **`patientService.js:383-388`** — `// NOTA: Agora usam Collection Group Queries se precisar de todos, mas aqui o dashboard é apenas do usuário logado.` + `// Como as sessões estão espalhadas em pacientes, precisamos buscar todos os pacientes primeiro`
  - A implementação atual itera pacientes sequencialmente (N+1). Considerar Collection Group Query com índice Firestore.

---

## Limpeza de Código Legado

- [x] Remover `src/services/firebase.js` — Arquivo legado, substituído por `firebaseConfig.js`. Contém import de `getFirestore` sem declaração e `getAnalytics` sem uso.
- [x] Remover ou marcar como deprecated `src/services/anamnesisService.js` — Usa estrutura plana v1 e importa do `firebase.js` legado. Todo o CRUD de anamneses já está em `patientService.js`.
- [x] Remover `src/utils/migrationV2.js` se a migração já foi concluída para todos os usuários, ou documentar como executá-la.
- [x] Remover `debug_bug.cjs` e `debug_bug_hard.cjs` da raiz do projeto (scripts de debug temporários).

---

## Melhorias de Performance

- [x] **Code-splitting com React.lazy()** — O chunk principal tem 1.668 KB. Dividir componentes pesados:
  - `AdminPanel.jsx` (49 KB fonte)
  - `PatientProfileModal.jsx` (58 KB fonte)
  - `AnamneseForm.jsx` / `AnamneseAdolescenteForm.jsx` (~34 KB cada)
  - `Financas.jsx` (27 KB fonte)
- [x] **Otimizar `lerTodasSessoes()`** — Implementar Collection Group Query ou cache local para evitar N+1 queries no painel financeiro.
- [x] **Implementar paginação** na listagem de pacientes e sessões para contas com muitos registros.

---

## Melhorias de Segurança

- [x] **Rate limiting na agenda pública** — `criarAgendamentoPublico()` permite escrita sem auth. Adicionado honeypot e rate limit via sessionStorage para proteção anti-spam sem custos adicionais.
- [x] **Migrar lista de admins para Firestore** — `ADMIN_EMAILS` não está mais hardcoded em `adminService.js` (mantido 1 fallback). Agora lê da coleção `admins`.
- [x] **Variáveis de ambiente para API keys** — Criado `.env.example` e configurado `firebaseConfig.js` para usar `import.meta.env` com fallback.

---

## Melhorias de UX

- [x] **Deep linking / URLs por seção** — Implementadas rotas reais (`/financas`, `/pacientes`, `/agenda`) via React Router (`App.jsx`).
- [ ] **Sincronização de rascunhos entre dispositivos** — Rascunhos de anamnese ficam apenas no `localStorage`. Considerar salvar drafts no Firestore.
- [ ] **Notificações de agendamento** — Notificar psicólogo quando um paciente agenda pelo link público (push notification ou e-mail via Cloud Function).
- [x] **Modo offline** — Habilitada persistência offline do Firestore (`enableMultiTabIndexedDbPersistence()`) para funcionar sem internet temporariamente.
- [x] **Exportação de dados em massa** — Criado `exportService.js` com botão na barra lateral para exportar pacientes, sessões e anamneses em formato CSV.

---

## Melhorias de Qualidade de Código

- [x] **Extrair componentes de UI reutilizáveis** — Criados componentes `<Button>`, `<Card>`, `<Badge>` e `<Pagination>` em `src/components/ui/` para eliminar repetição.
- [ ] **Adicionar TypeScript** — O projeto usa `@types/react` mas não tem TypeScript configurado. Migrar gradualmente para `.tsx` para type safety.
- [x] **Adicionar testes** — Vitest configurado e implementados testes unitários de:
  - Testes de `formatUtils.js` (CPF, telefone, validação)
  - Testes de `pdfUtils.js` (calcularIdade, formatDateBR)
- [x] **Implementar ESLint rigoroso** — Configurado npm script `lint:fix` no `package.json` e executado para limpar lixo (imports/vars não usados).

---

## Melhorias no PDF

- [x] **Suporte a acentos no PDF** — Adicionar fonte Unicode (ex: Roboto) ao jsPDF para preservar acentos em vez de removê-los com `sanitizeText()`.
- [x] **Logo no PDF** — Adicionar logotipo do psicólogo/plataforma no cabeçalho dos PDFs gerados.
- [x] **PDF de prontuário completo** — Gerar PDF unificado com todos os dados de um paciente (anamnese + todas as sessões).

---

## Melhorias no Financeiro

- [x] **Normalizar valores no save** — Converter `valor` para `Number` no momento de salvar em `SessaoEvolucao.jsx`, em vez de tratar strings no financeiro.
- [x] **Relatório mensal automático** — Gerar relatório financeiro mensal automaticamente e disponibilizar para download. (Implementado via exportação PDF na aba de Finanças com filtro mensal).
- [ ] **Integração com nota fiscal** — Considerar integração futura com APIs de NFS-e para emissão de recibos.

---

## Infraestrutura

- [ ] **CI/CD** — Configurar GitHub Actions para build automático + deploy no Firebase em pushes para `main`.
- [ ] **Ambiente de staging** — Criar projeto Firebase separado para testes antes de produção.
- [ ] **Monitoramento de erros** — Integrar Sentry ou similar para capturar erros em produção.
- [ ] **Backup automático** — Configurar exports automáticos do Firestore para Cloud Storage.

---

## Template para Novas Tarefas

```markdown
### [Título da Tarefa]

**Prioridade:** Alta / Média / Baixa
**Componente:** [Nome do arquivo ou módulo afetado]
**Descrição:**
[Descreva o que precisa ser feito e por quê]

**Critérios de Aceite:**
- [ ] [Critério 1]
- [ ] [Critério 2]
- [ ] [Critério 3]

**Observações:**
[Notas adicionais, links de referência, etc.]
```

---

> **Última atualização:** 19/04/2026
