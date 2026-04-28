# Backlog de Tarefas — Caritas

Documento com melhorias sugeridas, problemas identificados e TODOs encontrados no código.

---

## TODOs e Comentários Encontrados no Código

### ✅ API Deprecated — `firebaseConfig.js`
- [x] **`enableMultiTabIndexedDbPersistence(db)`** — Substituída pela nova API `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`. O aviso de deprecação no console foi eliminado.

### ✅ Função Obsoleta — `patientService.js`
- [x] **`vincularDadosAoUsuarioAtual()`** — Função morta removida. Nenhuma referência restante no código.

### ✅ Query N+1 — `patientService.js`
- [x] **`lerTodasSessoes()`** — Queries paralelizadas com `Promise.all()` em vez de loop sequencial. Cache de 5min mantido.
- [x] **`lerTodasAnamneses()`** — Queries paralelizadas com `Promise.all()` + cache de 5min adicionado (antes não havia cache).

### ✅ Console.logs em Produção
- [x] **Logger centralizado** — Criado `src/utils/logger.js`. Em produção, todos os logs são silenciados automaticamente. Em desenvolvimento (`npm run dev`), funcionam normalmente. Aplicado em: `patientService.js`, `adminService.js`, `authService.js`, `logService.js`, `pdfUtils.js`.

---

## Limpeza de Código Legado

- [x] Remover `src/services/firebase.js` — ✅ Deletado.
- [x] Remover `src/services/anamnesisService.js` — ✅ Deletado.
- [x] Remover `src/utils/migrationV2.js` — ✅ Deletado.
- [x] Remover `debug_bug.cjs` e `debug_bug_hard.cjs` — ✅ Deletados.
- [x] Remover `vincularDadosAoUsuarioAtual()` de `patientService.js` — ✅ Removida.

---

## Melhorias de Performance

- [x] **Code-splitting com React.lazy()** — Componentes pesados são carregados sob demanda.
- [x] **Cache local em `lerTodasSessoes()` e `lerTodasAnamneses()`** — Cache em memória com TTL de 5min e invalidação automática.
- [x] **Queries paralelizadas** — `Promise.all()` em vez de loop `for...of` sequencial.
- [x] **Paginação** — Componente `Pagination.jsx` em `src/components/ui/`.

---

## Melhorias de Segurança

- [x] **Rate limiting na agenda pública** — Honeypot + rate limit via sessionStorage.
- [x] **Migrar lista de admins para Firestore** — Coleção `admins` com 1 fallback hardcoded.
- [x] **Variáveis de ambiente** — `.env.example` criado, `firebaseConfig.js` usa `import.meta.env` com fallback.

---

## Melhorias de UX

- [x] **Deep linking / URLs por seção** — Rotas reais via React Router.
- [x] **Modo offline** — Persistência offline do Firestore via `persistentLocalCache` (nova API).
- [x] **Exportação de dados em massa** — `exportService.js` com exportação CSV.
- [x] **PWA (Progressive Web App)** — `manifest.json`, `sw.js` e ícones PNG configurados.
- [ ] **Sincronização de rascunhos entre dispositivos** — Rascunhos de anamnese ficam apenas no `localStorage`.
- [ ] **Notificações de agendamento** — Notificar psicólogo quando paciente agenda pelo link público.
- [ ] **Responsividade mobile completa** — Ajustes finos para telas < 400px.

---

## Melhorias de Qualidade de Código

- [x] **Componentes de UI reutilizáveis** — `Button.jsx`, `Card.jsx`, `Badge.jsx`, `Pagination.jsx`.
- [x] **Testes unitários** — Vitest com 25 testes passando (formatUtils + pdfUtils).
- [x] **ESLint** — Script `lint:fix` configurado.
- [x] **Logger centralizado** — `src/utils/logger.js` silencia console em produção.
- [ ] **Adicionar TypeScript** — Migrar gradualmente `.jsx` → `.tsx`.

---

## Melhorias no PDF

- [x] **Suporte a acentos** — Fonte Unicode adicionada.
- [x] **Logo no cabeçalho do PDF** — Logotipo incluído.
- [x] **PDF de prontuário completo** — Anamnese + todas as sessões.

---

## Melhorias no Financeiro

- [x] **Normalizar valores no save** — Conversão para `Number` no `SessaoEvolucao.jsx`.
- [x] **Relatório mensal** — Exportação PDF com filtro mensal.
- [ ] **Integração com nota fiscal** — APIs de NFS-e (futuro).

---

## Infraestrutura

- [x] **CI/CD** — Criado `.github/workflows/deploy.yml` com GitHub Actions: checkout → npm ci → npm test → npm run build → Firebase deploy.
- [x] **Migrar API deprecated do Firestore** — `enableMultiTabIndexedDbPersistence` substituída por `persistentLocalCache`.
- [x] **Limpar console em produção** — Logger centralizado implementado com `import.meta.env.DEV`.
- [ ] **Ambiente de staging** — Criar projeto Firebase separado para testes antes de produção.
- [ ] **Monitoramento de erros** — Integrar Sentry ou similar para capturar erros em produção.
- [ ] **Backup automático do Firestore** — Cloud Function agendada para exports.

---

## Documentação e Usabilidade

- [x] **Redesign Completo (Design System)** — Migração 100% concluída.
- [x] **Avaliação de Heurísticas de Nielsen** — Score médio: 4.55/5.00.
- [x] **Auditoria UX** — `AUDITORIA_UX.md`.
- [x] **PWA configurada** — Manifest, Service Worker e ícones.

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

> **Última atualização:** 28/04/2026
