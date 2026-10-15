# Design System — CARITAS ("Consultório")

> Documento de referência para qualquer alteração visual no front-end.
> **Última atualização:** 15/10/2026 — nova identidade visual (ver ADR-2026-10-E em `decisoes.md`).

**Personalidade:** calma, não fria. Papel quente de consultório, tinta esverdeada, petróleo como cor da marca e terracota só em pontos de atenção. O registro clínico vem primeiro: nada decorativo compete com a escrita da sessão.

---

## 1. Fontes

| Uso | Família | Pesos |
|-----|---------|-------|
| Títulos de página, seções e marca (`h1`–`h3`, `.font-heading`) | `Newsreader` (serifa editorial, tamanho óptico) | 500–700 |
| Interface, rótulos, botões, tabelas, texto corrido | `Public Sans` | 400–700 |

```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500..700&display=swap" rel="stylesheet">
```

- Corpo em 15px, `line-height: 1.5`.
- Números de tabela/valores: classe `tabular` (ou dentro de `<table>`) aplica `tabular-nums`.
- `h4`–`h6` usam a fonte da interface (não a serifa).

---

## 2. Paleta (variáveis CSS em `src/index.css`)

### Fundos
| Variável | Light | Dark | Uso |
|----------|-------|------|-----|
| `--bg-primary` | `#F5F3EE` | `#121615` | Fundo da página (papel) |
| `--bg-secondary` | `#FAF8F4` | `#171C1B` | Faixas, cabeçalhos de card, hover de linha |
| `--bg-sidebar` | `#ECE8DF` | `#0E1211` | Navegação lateral |
| `--bg-card` | `#FFFFFF` | `#1A1F1E` | Cards, modais |
| `--bg-sunken` | `#EEEBE4` | `#101413` | Controles segmentados, skeleton |

### Texto
| Variável | Light | Dark |
|----------|-------|------|
| `--text-primary` | `#1B2422` | `#E8ECEA` |
| `--text-secondary` | `#46514D` | `#AEB8B4` |
| `--text-muted` | `#646E69` | `#8C9692` |

### Marca
| Variável | Light | Dark | Uso |
|----------|-------|------|-----|
| `--accent` | `#0E6B66` | `#2C9A8F` | Ação principal, seleção, foco |
| `--accent-hover` | `#0B5753` | `#4FB3A9` | Hover |
| `--accent-light` | `#E3F0EE` | petróleo 16% | Fundos de destaque, avatar |
| `--accent-contrast` | `#FFFFFF` | `#04201F` | **Texto sobre `--accent`** (nunca `#FFF` fixo) |
| `--warm` / `--warm-light` | `#A9532A` / `#FBF1EB` | `#E09E72` / 12% | Avisos de conta (teste grátis), pendências |

Escalas Tailwind: `brand-50…950` (petróleo) e `clay-50…900` (terracota). Não usar `indigo`, `blue`, `cyan`, `violet` etc.

### Status semânticos
`--status-{success|warning|danger|info}`, `-bg`, `-text`. Sucesso é verde (`#2E7D4F`), distinto do petróleo da marca.

### Outros
`--border`, `--border-strong`, `--radius` (14px), `--radius-sm` (10px), `--shadow`, `--shadow-lg`, `--input-bg`, `--input-border`, `--overlay`, `--accent-ring`.

---

## 3. Classes `ds-*` (`@layer components`)

| Classe | Uso |
|--------|-----|
| `ds-card` | Container com borda 1px, raio 14px e sombra suave |
| `ds-btn` + `ds-btn-primary/secondary/danger/ghost` | Botões (mín. 40px; 44px em telas de toque) |
| `ds-input` | Inputs, selects e textareas (foco com anel `--accent-ring`; `aria-invalid="true"` pinta a borda de erro) |
| `ds-label` | Rótulo de formulário |
| `ds-badge` + `-success/-warning/-danger` | Pílulas de status |
| `ds-segmented` | Controle segmentado; o botão ativo usa `aria-pressed="true"` |
| `ds-nav-item` / `ds-nav-group` | Item e título de grupo da navegação lateral |
| `animate-in` | Entrada discreta (fade + 6px). Variações: `fade-in` (só opacidade), `zoom-in`/`zoom-in-95` (escala 0.96), `slide-in-from-top-2` (desce 8px). Em `prefers-reduced-motion` vira só opacidade em 150ms |
| `ds-arrive` | Contorno de destaque que se apaga em 900ms: mostra onde um item chegou (campo novo/movido no construtor, texto trocado pela I.A.). Não desloca nada, por isso continua em movimento reduzido |

**Movimento nas telas clínicas:** o stepper das anamneses (`components/anamnese/AnamneseStepper.jsx`) acompanha a rolagem, desliza um marcador até a etapa ativa e troca o ícone por um check quando todos os campos de texto da seção estão preenchidos. Barras de progresso animam `transform: scaleX`, nunca `width`.

---

## 4. Ícones

**lucide-react**, traço único. Nunca SVG inline nem emoji como ícone.

---

## 5. Componentes

| Componente | Notas |
|------------|-------|
| `ui/Button` | `size="sm"` 34px, `md` 40px, `lg` 48px |
| `ui/Badge` | `variant`: success, danger, warning, info, neutral |
| `ui/EmptyState` | Vazio que ensina: ícone, título, descrição e a ação que resolve |
| `ui/Skeleton` | Carregamento sem salto de layout |
| `ConfirmDialog` | `variant` danger/warning; `isLoading` desabilita os botões durante a ação |
| `Layout` | Sidebar agrupada (Atendimento, Gestão, Conta), botão "Registrar sessão" sempre visível, busca `Ctrl K`; no celular, barra superior + barra inferior (Início, Pacientes, Sessão, Agenda, Mais) |

---

## 6. Regras

1. Cores sempre por variável (`var(--…)`) ou escala `brand`/`clay`.
2. Texto sobre fundo `--accent` usa `--accent-contrast`.
3. Alvos de toque ≥ 44px no celular; grades colapsam para 1 coluna abaixo de `sm`.
4. Sem gradiente em texto, sem glassmorphism decorativo, sem borda lateral colorida grossa em cards.
5. Movimento só para estado (150–250 ms, `ease-out-expo`).
6. Testar light e dark.

---

## 7. Temas

`data-theme="light" | "dark"` no `<html>`, controlado por `ThemeContext.jsx`. O seletor de tema fica no grupo **Conta** da navegação.

---

## 8. Documentos PDF

`src/services/pdfUtils.js` (`PdfBuilder`) segue a mesma identidade: marca vetorial (esfera + onda), petróleo nos títulos de seção numerados, grade de 2 colunas para campos curtos, rodapé com sigilo CFP/LGPD, "Página X de Y" e código de controle. Seções só aparecem quando têm conteúdo.

---

## 9. Avaliação de Usabilidade

Ver `avaliacao-heuristicas.md`.
