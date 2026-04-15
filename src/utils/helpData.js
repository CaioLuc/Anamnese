/**
 * helpData.js — Base de dados centralizada de ajuda e FAQ do Caritas.
 * Cada item tem tags para facilitar busca textual.
 */

export const HELP_DATA = [
  {
    category: 'Primeiros Passos',
    icon: '🚀',
    items: [
      {
        question: 'Como cadastrar meu primeiro paciente?',
        answer: 'Acesse o menu "Pacientes" na barra lateral e clique no botão "Adicionar Paciente". Preencha o nome completo e a data de nascimento (campos obrigatórios). Os demais campos como CPF, telefone e valor da sessão são opcionais, mas recomendamos preencher para um prontuário mais completo.',
        tags: ['paciente', 'cadastro', 'novo', 'adicionar', 'primeiro']
      },
      {
        question: 'Como preencher a anamnese de um paciente?',
        answer: 'Após cadastrar o paciente, clique sobre o nome dele na lista de pacientes. No prontuário, acesse a aba "Ficha de Anamnese" e clique em "Nova Anamnese". Você poderá escolher entre os modelos padrão (Adulto, Infanto-Juvenil) ou um questionário personalizado criado por você.',
        tags: ['anamnese', 'ficha', 'preencher', 'criar', 'modelo']
      },
      {
        question: 'Como registrar uma sessão de atendimento?',
        answer: 'Vá até o menu "Nova Sessão" na barra lateral. Busque o nome do paciente, selecione-o na lista, escolha a data da sessão, defina o status de comparecimento e preencha as observações clínicas. Ao finalizar, clique em "Salvar Evolução".',
        tags: ['sessão', 'evolução', 'registrar', 'atendimento', 'nova']
      },
      {
        question: 'O que é o Dashboard?',
        answer: 'O Dashboard é sua tela inicial. Ele mostra um resumo do seu consultório: quantos pacientes você tem, sessões realizadas no período, taxa de presença, pacientes recentes e sessões do dia. Use os atalhos rápidos para navegar diretamente para as ações mais comuns.',
        tags: ['dashboard', 'início', 'resumo', 'painel']
      },
    ]
  },
  {
    category: 'Funcionalidades',
    icon: '⚙️',
    items: [
      {
        question: 'Como funciona a Agenda?',
        answer: 'A Agenda permite agendar atendimentos com seus pacientes. Clique em um dia do calendário para ver os compromissos ou adicione um novo agendamento. Você pode definir horário, duração e status. Também é possível enviar uma mensagem de confirmação pelo WhatsApp diretamente do agendamento.',
        tags: ['agenda', 'agendar', 'calendário', 'horário', 'compromisso']
      },
      {
        question: 'Como funciona o Link Público de agendamento?',
        answer: 'Na tela da Agenda, clique em "Configurar" para definir seus horários de atendimento, intervalos e gerar um link público. Seus pacientes podem acessar esse link para solicitar um horário disponível. Você receberá o pedido na sua agenda e poderá confirmar ou recusar.',
        tags: ['link', 'público', 'agendamento', 'online', 'configurar']
      },
      {
        question: 'Como exportar um PDF do prontuário?',
        answer: 'Você pode exportar PDFs de anamneses e sessões individuais. No prontuário do paciente, clique no ícone de download (seta para baixo) ao lado da anamnese ou de qualquer sessão. Na tela de "Nova Sessão", também há o botão "Exportar PDF" após preencher os dados.',
        tags: ['pdf', 'exportar', 'download', 'prontuário', 'imprimir']
      },
      {
        question: 'Como usar o Resumo com I.A.?',
        answer: 'Na tela "Nova Sessão", preencha o campo de observações gerais com suas anotações. Em seguida, clique no botão "Resumir com I.A." (gradiente colorido). A inteligência artificial irá analisar suas notas e gerar um resumo clínico estruturado. Este recurso está disponível apenas no plano PRO.',
        tags: ['ia', 'inteligência artificial', 'resumo', 'pro', 'automático']
      },
      {
        question: 'Como funciona o Financeiro?',
        answer: 'A tela Financeiro mostra um panorama das suas receitas. Você pode filtrar por período (semana, mês, semestre, ano), ver o valor total, recebido e pendente. Para registrar um pagamento, clique em "Dar Baixa" na linha da sessão correspondente. Também é possível exportar um relatório financeiro em PDF.',
        tags: ['financeiro', 'pagamento', 'faturamento', 'receita', 'dar baixa', 'pendente']
      },
      {
        question: 'O que são os Questionários personalizados?',
        answer: 'Na seção "Questionários", você pode criar modelos personalizados de anamnese com os campos que desejar (texto livre, múltipla escolha, escalas numéricas, etc.). Esses modelos aparecem como opção ao criar uma nova anamnese para qualquer paciente. Você também pode duplicar os modelos padrão e editá-los.',
        tags: ['questionário', 'personalizado', 'modelo', 'template', 'criar']
      },
      {
        question: 'Como gerenciar meus Locais de atendimento?',
        answer: 'Acesse "Locais" no menu lateral para cadastrar suas clínicas ou consultórios. Os locais cadastrados aparecerão como opção no formulário de novo paciente. O plano básico permite 1 local; planos superiores permitem mais.',
        tags: ['local', 'clínica', 'consultório', 'locais', 'atendimento']
      },
    ]
  },
  {
    category: 'Conta e Planos',
    icon: '👤',
    items: [
      {
        question: 'Qual a diferença entre plano Básico e PRO?',
        answer: 'O plano Básico oferece todas as funcionalidades essenciais: cadastro de pacientes, anamnese, sessões, agenda e exportação de PDF. O plano PRO adiciona recursos avançados como o Resumo com I.A., mais locais de atendimento e funcionalidades premium futuras.',
        tags: ['plano', 'básico', 'pro', 'premium', 'diferença', 'upgrade']
      },
      {
        question: 'Como altero o tema claro/escuro?',
        answer: 'No menu lateral, procure o botão "Tema Claro / Escuro" na parte inferior, acima da sua foto de perfil. Clique nele para alternar entre os modos. A preferência é salva automaticamente.',
        tags: ['tema', 'escuro', 'claro', 'dark', 'modo']
      },
      {
        question: 'Meus dados estão seguros?',
        answer: 'Sim. O Caritas utiliza o Firebase (Google Cloud) para armazenamento e autenticação. Todos os dados são criptografados em trânsito e em repouso. Cada psicólogo só tem acesso aos seus próprios pacientes, garantido por regras de segurança no servidor.',
        tags: ['segurança', 'dados', 'privacidade', 'criptografia', 'firebase']
      },
      {
        question: 'O que acontece quando minha conta é bloqueada?',
        answer: 'Se sua conta estiver inativa ou bloqueada pelo administrador, você verá uma tela informando a situação. Entre em contato com o suporte ou administrador do sistema para regularizar o acesso.',
        tags: ['bloqueada', 'inativa', 'conta', 'acesso', 'suporte']
      },
    ]
  },
  {
    category: 'Dicas e Atalhos',
    icon: '⌨️',
    items: [
      {
        question: 'Quais atalhos de teclado estão disponíveis?',
        answer: 'Ctrl+K (ou ⌘+K): Abre a busca global para encontrar pacientes e ações rápidas.\nEsc: Fecha qualquer modal ou painel aberto.\nCtrl+S (ou ⌘+S): Salva o formulário ativo (sessão ou anamnese).',
        tags: ['atalho', 'teclado', 'ctrl', 'esc', 'shortcut', 'keyboard']
      },
      {
        question: 'Como encontrar um paciente rapidamente?',
        answer: 'Use a busca global (Ctrl+K) de qualquer tela para localizar pacientes pelo nome ou CPF. Na tela de Pacientes, há também uma barra de busca dedicada com filtro por local de atendimento.',
        tags: ['buscar', 'encontrar', 'paciente', 'pesquisar', 'filtrar']
      },
    ]
  }
];

/**
 * Busca nos dados de ajuda por um termo de pesquisa.
 * Retorna items que correspondem ao texto buscado no question, answer ou tags.
 */
export function searchHelp(term) {
  if (!term || term.trim().length < 2) return [];
  const lower = term.toLowerCase();
  const results = [];

  for (const section of HELP_DATA) {
    for (const item of section.items) {
      const inQuestion = item.question.toLowerCase().includes(lower);
      const inAnswer = item.answer.toLowerCase().includes(lower);
      const inTags = item.tags.some(t => t.includes(lower));

      if (inQuestion || inAnswer || inTags) {
        results.push({ ...item, category: section.category, icon: section.icon });
      }
    }
  }

  return results;
}
