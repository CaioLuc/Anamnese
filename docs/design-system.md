# Design System — Caritas

> Documento de referência para qualquer alteração visual no front-end.
> **Última atualização:** 28/04/2026

---

## 1. Fontes

| Uso | Família | Pesos |
|-----|---------|-------|
| Corpo de texto, labels, inputs | `Inter` | 400, 500 |
| Títulos, nome do sistema | `Sora` | 500, 600 |

Importação no `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Sora:wght@500;600&display=swap" rel="stylesheet">
```

Aplicação no CSS:
```css
body { font-family: 'Inter', system-ui, sans-serif; }
h1, h2, h3, h4, h5, h6 { font-family: 'Sora', 'Inter', system-ui, sans-serif; }
```

Classe utilitária: `font-heading` (aplica a família Sora).

---

## 2. Paleta de Cores (Variáveis CSS)

Definidas em `src/index.css` nos seletores `:root` / `[data-theme="light"]` e `[data-theme="dark"]`.

### Fundos
| Variável | Light | Dark | Uso |
|----------|-------|------|-----|
| `--bg-primary` | `#F8F9FA` | `#0D1117` | Fundo geral da página |
| `--bg-secondary` | `#FFFFFF` | `#161B22` | Fundo de seções secundárias |
| `--bg-sidebar` | `#0A1628` | `#010409` | Sidebar lateral |
| `--bg-card` | `#FFFFFF` | `#161B22` | Cards e modais |

### Texto
| Variável | Light | Dark |
|----------|-------|------|
| `--text-primary` | `#0A1628` | `#E6EDF3` |
| `--text-secondary` | `#4A5568` | `#8B949E` |
| `--text-muted` | `#718096` | `#6E7681` |
| `--text-sidebar` | `#CBD5E1` | `#8B949E` |
| `--text-sidebar-active` | `#FFFFFF` | `#E6EDF3` |

### Accent
| Variável | Light | Dark |
|----------|-------|------|
| `--accent` | `#2563EB` | `#3B82F6` |
| `--accent-light` | `#EFF6FF` | `#1D2D3E` |
| `--accent-hover` | `#1D4ED8` | `#60A5FA` |

### Status Semânticos
| Status | Cor | Background | Texto |
|--------|-----|------------|-------|
| Success | `--status-success` | `--status-success-bg` | `--status-success-text` |
| Warning | `--status-warning` | `--status-warning-bg` | `--status-warning-text` |
| Danger | `--status-danger` | `--status-danger-bg` | `--status-danger-text` |
| Info | `--status-info` | `--status-info-bg` | `--status-info-text` |

### Outros
| Variável | Uso |
|----------|-----|
| `--border` | Bordas de cards, separadores |
| `--shadow` | Sombra padrão de cards |
| `--input-bg` | Fundo de inputs |
| `--input-border` | Borda de inputs |
| `--overlay` | Fundo de modais/overlays |
| `--scrollbar-thumb` | Cor do polegar da scrollbar |
| `--table-stripe` | Fundo alternado de linhas de tabela |
| `--badge-bg` / `--badge-text` | Badge padrão |

---

## 3. Classes do Design System (`ds-*`)

Definidas em `src/index.css` dentro de `@layer components`.

### `ds-card`
Card padrão com fundo, borda, radius e sombra.
```jsx
<div className="ds-card p-6">...</div>
```

### `ds-btn` + variantes
Botão base. Usar sempre combinado com uma variante:
```jsx
<button className="ds-btn ds-btn-primary">Salvar</button>
<button className="ds-btn ds-btn-secondary">Cancelar</button>
<button className="ds-btn ds-btn-danger">Excluir</button>
<button className="ds-btn ds-btn-ghost">Ação suave</button>
```

### `ds-input`
Input/textarea/select padrão:
```jsx
<input className="ds-input" />
<textarea className="ds-input resize-y min-h-[100px]" />
<select className="ds-input appearance-none">...</select>
```

### `ds-badge` + variantes
Badge/tag inline:
```jsx
<span className="ds-badge">Padrão</span>
<span className="ds-badge ds-badge-success">Pago</span>
<span className="ds-badge ds-badge-warning">Pendente</span>
<span className="ds-badge ds-badge-danger">Cancelado</span>
```

### `ds-nav-item`
Item de navegação na sidebar:
```jsx
<button className="ds-nav-item active">Dashboard</button>
```

---

## 4. Ícones

Biblioteca: **lucide-react** (instalada via npm).

```jsx
import { Search, Plus, Trash2 } from 'lucide-react';
<Search size={16} />
```

**Regra:** Nunca usar SVGs inline para ícones de interface. Sempre usar componentes lucide-react.

---

## 5. Componentes UI Reutilizáveis

Localizados em `src/components/ui/`:

| Componente | Arquivo | Uso |
|------------|---------|-----|
| Button | `ui/Button.jsx` | Botão padronizado |
| Card | `ui/Card.jsx` | Container de conteúdo |
| Badge | `ui/Badge.jsx` | Tags de status |
| Pagination | `ui/Pagination.jsx` | Paginação de listas |

---

## 6. Padrões de Migração

### ❌ Antes (legado)
```jsx
// Hardcoded Tailwind dark mode
<div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
<button className="bg-indigo-500 text-white rounded-xl hover:bg-indigo-600">
<input className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
```

### ✅ Depois (design system)
```jsx
// CSS Variables + DS classes
<div className="ds-card">
<button className="ds-btn ds-btn-primary">
<input className="ds-input">
```

### Regras de migração

1. **Cards/containers:** Substituir `bg-white dark:bg-zinc-900 border ...` por `ds-card`
2. **Inputs:** Substituir toda a chain de classes por `ds-input`
3. **Botões:** Substituir por `ds-btn ds-btn-{variant}`
4. **Badges:** Substituir por `ds-badge ds-badge-{variant}`
5. **Cores de texto:** Usar `style={{ color: 'var(--text-primary)' }}` ou `var(--text-secondary)`
6. **Overlays de modais:** Usar `style={{ backgroundColor: 'var(--overlay)' }}`
7. **Bordas:** Usar `style={{ borderColor: 'var(--border)' }}` ou `border: '1px solid var(--border)'`
8. **Status semânticos:** Usar variáveis `--status-{type}`, `--status-{type}-bg`, `--status-{type}-text`
9. **Títulos:** Adicionar classe `font-heading` para aplicar a fonte Sora

---

## 7. Temas

O tema é controlado pelo atributo `data-theme` no `<html>`:
- `data-theme="light"` → variáveis light
- `data-theme="dark"` → variáveis dark

Gerenciado pelo `ThemeContext.jsx`. O toggle de tema na sidebar alterna entre os dois valores.

---

## 8. Status da Migração

> **Última atualização:** 28/04/2026

### ✅ Completamente migrados
- `Layout.jsx`, `App.jsx`
- `Pacientes.jsx`, `Agenda.jsx`, `Clinicas.jsx`, `Questionarios.jsx`, `Lixeira.jsx`
- `Login.jsx`, `AdminPanel.jsx`, `Dashboard.jsx`
- `AnamneseForm.jsx`, `AnamneseAdolescenteForm.jsx`
- `SessaoEvolucao.jsx`
- `QuestionarioBuilder.jsx`, `QuestionarioFiller.jsx`
- `AgendaPublica.jsx`, `ConfigAgenda.jsx`
- `AddPatientModal.jsx`, `AddAnamnesisModal.jsx`
- `SelecionarTemplateModal.jsx`
- `ConfirmDialog.jsx`, `ContaBloqueada.jsx`, `ErrorBoundary.jsx`, `Tooltip.jsx`
- `ToastContainer.jsx`
- `Financas.jsx`
- `GlobalSearch.jsx`
- `HelpPanel.jsx`
- `OnboardingOverlay.jsx`
- `UpgradeProModal.jsx` (gradientes de marketing preservados)
- `MoodChart.jsx`
- `ui/Button.jsx`, `ui/Card.jsx`, `ui/Badge.jsx`, `ui/Pagination.jsx`

### ✅ 100% migrado — Nenhum componente pendente

> Todos os componentes foram migrados para o Design System em 2026-04-19.
> O `PatientProfileModal.jsx` (~63KB, 900 linhas) foi o último a ser completado.

---

## 9. Checklist para Novo Componente

1. [ ] Importar ícones de `lucide-react` (nunca SVG inline)
2. [ ] Usar `ds-card` para containers
3. [ ] Usar `ds-input` para campos de formulário
4. [ ] Usar `ds-btn ds-btn-{variant}` para botões
5. [ ] Usar `ds-badge` para status/tags
6. [ ] Usar `font-heading` em títulos `<h1>`–`<h6>`
7. [ ] Usar variáveis CSS para todas as cores (`--text-primary`, `--accent`, etc.)
8. [ ] Overlays: `style={{ backgroundColor: 'var(--overlay)' }}`
9. [ ] Nunca usar `dark:` diretamente — as variáveis CSS já lidam com temas
10. [ ] Testar em light mode E dark mode

---

## 10. Avaliação de Usabilidade

Uma auditoria profunda do design system e da experiência do usuário (UX) com base nas 10 Heurísticas de Nielsen está documentada separadamente no arquivo centralizado: **[`AUDITORIA_UX.md`](./AUDITORIA_UX.md)**. Leia-o antes de propor grandes mudanças de interação ou arquitetura de informação.
