# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Psicóloga(o) clínica(o) no Brasil** (autônoma ou em clínica pequena). Usa o CARITAS no computador do consultório durante e logo após a sessão (anamnese, evolução, documentos) e no celular entre atendimentos (agenda, financeiro, consulta rápida de prontuário). Desktop e celular têm o mesmo peso.
- **Líder Clínico(a)**: quem assina o Plano Clínica & Equipe. Supervisiona até 8 psicólogos(as), acompanha ocupação, pendências de evolução e triagem. O papel é definido na assinatura, não por troca manual.
- **Paciente**: só acessa a página pública de agendamento (`/agendar/:slug`).
- **Super Admin**: gestão de psicólogos, contratos de clínicas, auditoria.

## Product Purpose

Prontuário eletrônico e gestão de consultório para psicologia clínica: pacientes, anamnese (adulto, infanto-juvenil e questionários próprios), evolução de sessões, agenda com link público, financeiro com PIX, documentos CFP (declaração, atestado, relatório, recibo) e resumo clínico por I.A. Sucesso = a profissional registra a sessão rápido, encontra o histórico na hora e emite documentos corretos sem retrabalho.

## Positioning

Feito para a rotina e as regras da psicologia brasileira: Resoluções CFP 01/2009 (guarda de 5 anos) e 06/2019 (documentos), LGPD para dados sensíveis de saúde, PIX nativo e terminologia clínica em pt-BR.

## Operating Context

- Uso durante a sessão exige baixa carga cognitiva, atalhos (`Ctrl+K`, `Ctrl+S`), auto-save e nada que distraia o atendimento.
- Documentos saem em PDF A4 para impressão ou envio ao paciente, convênio ou outro profissional.
- Logout automático após 10 min de inatividade; verificação em duas etapas por e-mail.

## Capabilities and Constraints

- React 19 + Vite 8 + Tailwind 3.4, Firebase (Auth, Firestore, Functions v2 em `southamerica-east1`, Hosting). jsPDF no cliente.
- Isolamento rígido por profissional nas regras do Firestore; trilha de auditoria append-only; soft-delete com lixeira de 7 dias; anonimização em vez de exclusão física de registros clínicos.
- Todo texto de interface em pt-BR.
- Pagamento de assinatura (Asaas) ainda é simulado no cliente; não afirmar cobrança real.

## Brand Commitments

- Nome **CARITAS** e o logo esférico com a onda (`src/assets/logo.svg`, `public/favicon.svg`) são preservados.
- Paleta, tipografia e componentes podem ser substituídos (decisão do usuário em 15/10/2026).

## Evidence on Hand

- Não há depoimentos, clientes, métricas de mercado ou certificações reais. Não inventar.
- Auditoria interna de usabilidade (Nielsen) em `docs/avaliacao-heuristicas.md`.

## Product Principles

1. O registro clínico vem primeiro: nada na interface compete com a escrita da sessão.
2. Sigilo visível: o sistema mostra quando algo é confidencial, auditado ou compartilhável.
3. Documento certo na primeira emissão: PDFs só mostram o que foi preenchido, organizados e assináveis.
4. Mesmo trabalho no consultório e no celular.
5. Calma, não frieza: acolhedor para quem cuida, sem perder rigor técnico.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste, foco visível, alvos de toque ≥ 44px no celular, `prefers-reduced-motion` respeitado.
