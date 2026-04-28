# Avaliação de Usabilidade — Heurísticas de Nielsen

> **Data da Avaliação:** 20/04/2026
> **Avaliador:** Sistema de Agente Assistente (IA)
> **Escopo:** Plataforma Clínica Caritas (Pós-Redesign e Design System)

Este documento apresenta uma avaliação detalhada do sistema Caritas com base nas **10 Heurísticas de Usabilidade de Jakob Nielsen**. Cada heurística foi analisada no contexto do sistema atual e recebeu uma nota de **1 a 5** (onde 1 é muito deficiente e 5 é excelente).

---

### 1. Visibilidade do status do sistema
*Mantenha o usuário informado sobre o que está acontecendo.*
**Nota: 4.5 / 5**
- **Pontos Fortes:** O sistema faz um uso exemplar de *spinners* (animações de carregamento) em botões ao salvar dados (ex: salvar anamnese, login, atualizar plano no Admin) e *skeletons/loading states* ao buscar listas do banco de dados. O uso de `ToastContainer` (notificações toast) garante que o usuário saiba imediatamente se uma ação foi bem-sucedida ou falhou.
- **Oportunidade de Melhoria:** Algumas transições de página ou carregamentos pesados (como a geração do PDF completo do paciente) poderiam ter uma barra de progresso em vez de apenas um spinner genérico.

### 2. Correspondência entre sistema e mundo real
*Use a linguagem, termos e ícones familiares ao usuário, evitando jargões técnicos.*
**Nota: 5.0 / 5**
- **Pontos Fortes:** A linguagem é totalmente voltada para o contexto da Psicologia e Saúde. Termos como "Anamnese", "Prontuário", "Evolução", "Financeiro" e "Lixeira" são universais. O uso da biblioteca `lucide-react` fornece ícones com metáforas perfeitas (um calendário para Agenda, um estetoscópio/prancheta para Anamnese, uma lixeira para exclusão). O sistema fala a língua do psicólogo.

### 3. Controle e liberdade do usuário
*Forneça "saídas de emergência" claras (ex: desfazer, refazer, cancelar).*
**Nota: 4.5 / 5**
- **Pontos Fortes:** Destaca-se fortemente a implementação da **Lixeira** (`Lixeira.jsx`), que funciona como um "Soft Delete". Se o psicólogo apagar um paciente por engano, ele tem 7 dias para restaurá-lo, oferecendo uma saída de emergência robusta. Modais possuem botões claros de "Cancelar" e ícones de "X" para fechar.
- **Oportunidade de Melhoria:** Ações menores, como excluir uma sessão específica de evolução ou um agendamento, são hard-deletes. Poderia haver um botão "Desfazer" momentâneo (undo no estilo Gmail) no toast de exclusão da sessão.

### 4. Consistência e padrões
*Siga convenções da plataforma e mantenha o design padronizado para evitar confusão.*
**Nota: 5.0 / 5**
- **Pontos Fortes:** Com a migração recente e finalização do **Design System**, o Caritas atingiu excelência neste quesito. Elementos da interface usam classes unificadas (`ds-card`, `ds-btn`, `ds-input`). Títulos sempre usam a fonte `Sora` e textos a `Inter`. As cores de status (`success`, `warning`, `danger`) são usadas uniformemente em crachás (badges) e notificações por todo o sistema.

### 5. Prevenção de erros
*Projete interfaces que evitem erros antes que ocorram (ex: confirmar exclusão).*
**Nota: 4.5 / 5**
- **Pontos Fortes:** O sistema implementa máscaras e validações estritas (ex: CPF, Telefone, e-mail) antes de submeter formulários. A exclusão de itens exige a passagem pelo `ConfirmDialog.jsx` (modal vermelho de confirmação de exclusão), o que impede apagamentos acidentais. Há validação de duplicidade de CPF.

### 6. Reconhecimento em vez de memorização
*Minimize a carga de memória do usuário tornando objetos, ações e opções visíveis.*
**Nota: 4.5 / 5**
- **Pontos Fortes:** A implementação da Busca Global (`GlobalSearch.jsx` com atalho `Ctrl+K`) permite que o psicólogo acesse qualquer paciente sem precisar navegar por menus e memorizar onde os colocou. O dashboard resume informações chave sem exigir que o usuário navegue para as abas de finanças ou pacientes para obter um panorama.

### 7. Flexibilidade e eficiência de uso
*Ofereça atalhos para usuários experientes e facilidades para iniciantes.*
**Nota: 4.0 / 5**
- **Pontos Fortes:** O atalho de teclado `Ctrl+K` para busca e suporte para `Ctrl+S` no preenchimento de anamneses tornam o uso por power-users muito mais rápido. O layout é responsivo, otimizando o uso em tablets e telas grandes.
- **Oportunidade de Melhoria:** Poderia haver mais atalhos de teclado (ex: `N` para novo paciente direto do Dashboard).

### 8. Design estético e minimalista
*Evite informações irrelevantes ou desnecessárias que competem com o conteúdo principal.*
**Nota: 5.0 / 5**
- **Pontos Fortes:** A interface pós-redesign adota um padrão de mercado SaaS Premium (com uso de variáveis CSS para tons neutros e acentos de cores precisas, sombras suaves estilo glassmorphism, etc.). Espaçamentos (`padding` e `margin`) são generosos, evitando a sensação de sobrecarga cognitiva. O modo escuro foi completamente normalizado.

### 9. Ajude os usuários a reconhecerem, diagnosticarem e recuperarem-se de erros
*Mensagens de erro devem ser claras, técnicas e sugerir soluções.*
**Nota: 4.0 / 5**
- **Pontos Fortes:** O sistema conta com um `ErrorBoundary.jsx` global. Quando ocorre uma falha na renderização do React, a tela não fica em branco; em vez disso, apresenta uma mensagem amigável com um botão para recarregar a página. Erros de rede ou permissão geram notificações toast vermelhas descritivas.
- **Oportunidade de Melhoria:** Alguns erros de Firebase no Console (como o `enableMultiTabIndexedDbPersistence` warning) e rejeições em regras de segurança podem ser logados mas, ocasionalmente, dão mensagens genéricas de "Falha ao salvar" no UI, que poderiam sugerir mais explicitamente "Verifique sua conexão ou contate o suporte".

### 10. Ajuda e documentação
*Embora seja melhor que o sistema não precise de ajuda, ela deve ser fácil de buscar e focada na tarefa.*
**Nota: 4.5 / 5**
- **Pontos Fortes:** Existe um overlay interativo de Onboarding (`OnboardingOverlay.jsx`) para os usuários de primeiro acesso e um painel lateral de ajuda (`HelpPanel.jsx`) com dúvidas frequentes pesquisáveis. O próprio código conta com a pasta `docs/` rigorosamente preenchida, o que cobre a documentação para o desenvolvedor e para o sistema. 

---

### Conclusão e Média Geral
**Média: 4.55 / 5.00**

A aplicação **Caritas** encontra-se em um estado **excelente** em termos de usabilidade e arquitetura de front-end. O fluxo de trabalho (cadastrar paciente -> preencher anamnese -> lançar sessões -> acompanhar o financeiro) é ininterrupto, consistente e esteticamente impecável. As principais oportunidades de melhoria residem em refinamentos granulares de atalhos de teclado, histórico local de edições (undo) e customização avançada de templates de impressão.
