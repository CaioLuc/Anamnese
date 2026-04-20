# Plano de Implementação: Melhorias de Performance

Este plano detalha as otimizações de performance para o projeto Caritas, focando em carregamento inicial mais rápido, navegação fluida em grandes listas e redução de latência em queries.

## 1. Code Splitting (React.lazy)
O bundle principal está muito grande (~1.6MB). Vamos dividir o carregamento dos componentes que não são necessários no "primeiro frame" do app.

- **App.jsx**: Lazy load para `AdminPanel`, `Financas`, `Agenda`, `Clinicas`, `Lixeira` e `Questionarios`.
- **PatientProfileModal.jsx**: Lazy load para `AnamneseForm` e `AnamneseAdolescenteForm`.
- **UI**: Adicionar um `<Suspense>` com um spinner elegante para evitar "saltos" na interface durante o carregamento.

## 2. Otimização de Queries (Cache Local)
A função `lerTodasSessoes()` é lenta pois busca cada paciente individualmente (N+1).

- **Estratégia**: Implementar cache em memória no `patientService.js`.
- **TTL**: 5 minutos.
- **Invalidação**: O cache será limpo automaticamente sempre que uma sessão for criada, editada ou excluída.
- **Vantagem**: Velocidade instantânea no Dashboard Financeiro após a primeira carga, sem necessidade de configurar novos índices complexos no Firestore agora.

## 3. Paginação Local
Listas longas de pacientes e sessões pesam no DOM.

- **Pacientes.jsx**: Exibir 10 pacientes por página.
- **Financas.jsx**: Exibir 15 sessões por página.
- **Componente**: Criar uma barra de navegação de páginas (`[Anterior] 1 2 3 [Próximo]`) consistente entre as telas.

---
**Aprovação**: Responda com "Aprovado" ou "Pode seguir" para iniciarmos.
