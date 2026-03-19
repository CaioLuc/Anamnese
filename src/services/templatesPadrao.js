// Templates padrão de questionários (embutidos no app, não precisam de Firestore)
// Estes são usados como fallback e estão sempre disponíveis.

export const TEMPLATE_ADULTO = {
  id: 'padrao_adulto',
  nome: 'Anamnese Adulto (Padrão)',
  descricao: 'Questionário completo de anamnese para pacientes adultos.',
  tipo: 'padrao',
  icone: '👤',
  campos: [
    { id: 's1', ordem: 0, tipo: 'section', label: 'I. Identificação' },
    { id: 'f_nome', ordem: 1, tipo: 'text', label: 'Nome Completo', placeholder: 'Nome do paciente', obrigatorio: true },
    { id: 'f_nasc', ordem: 2, tipo: 'date', label: 'Data de Nascimento', obrigatorio: false },
    { id: 'f_sexo', ordem: 3, tipo: 'radio', label: 'Sexo', opcoes: ['Masculino', 'Feminino', 'Outro / Prefiro não informar'], obrigatorio: false },
    { id: 'f_ecivil', ordem: 4, tipo: 'radio', label: 'Estado Civil', opcoes: ['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Viúvo(a)'], obrigatorio: false },
    { id: 'f_escol', ordem: 5, tipo: 'select', label: 'Escolaridade', opcoes: ['Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo', 'Superior Incompleto', 'Superior Completo', 'Pós-graduação'], obrigatorio: false },
    { id: 'f_prof', ordem: 6, tipo: 'text', label: 'Profissão / Ocupação', placeholder: 'Ex: Professora, Engenheiro...', obrigatorio: false },
    { id: 'f_end', ordem: 7, tipo: 'text', label: 'Endereço Completo', placeholder: 'Rua, número, bairro, cidade', obrigatorio: false },
    { id: 'f_tel', ordem: 8, tipo: 'text', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', obrigatorio: false },
    { id: 'f_email', ordem: 9, tipo: 'text', label: 'E-mail', placeholder: 'email@exemplo.com', obrigatorio: false },
    { id: 'f_enc', ordem: 10, tipo: 'text', label: 'Como conheceu / Encaminhamento', placeholder: 'Ex: Indicação médica, redes sociais...', obrigatorio: false },

    { id: 's2', ordem: 11, tipo: 'section', label: 'II. Queixa Principal e História Atual' },
    { id: 'f_queixa', ordem: 12, tipo: 'textarea', label: 'Queixa Principal', placeholder: 'Descreva com as palavras do próprio paciente o motivo da consulta...', obrigatorio: true },
    { id: 'f_inicio', ordem: 13, tipo: 'textarea', label: 'Início e Evolução dos Sintomas', placeholder: 'Quando começou? O que desencadeou? Como evoluiu?', obrigatorio: false },
    { id: 'f_trat_ant', ordem: 14, tipo: 'textarea', label: 'Tratamentos Anteriores', placeholder: 'Já fez psicoterapia antes? Por quanto tempo? Com qual resultado?', obrigatorio: false },
    { id: 'f_med', ordem: 15, tipo: 'textarea', label: 'Uso de Medicamentos', placeholder: 'Lista de medicamentos em uso, dosagem e responsável pela prescrição', obrigatorio: false },

    { id: 's3', ordem: 16, tipo: 'section', label: 'III. História Pessoal' },
    { id: 'f_gestacao', ordem: 17, tipo: 'textarea', label: 'Gestação e Parto', placeholder: 'Como foi a gravidez da mãe, o parto, intercorrências...', obrigatorio: false },
    { id: 'f_desenv', ordem: 18, tipo: 'textarea', label: 'Desenvolvimento Infantil', placeholder: 'Marcos do desenvolvimento (fala, marcha, controle esfincteriano, etc.)', obrigatorio: false },
    { id: 'f_escolar', ordem: 19, tipo: 'textarea', label: 'História Escolar', placeholder: 'Desempenho, dificuldades, relações com colegas/professores', obrigatorio: false },
    { id: 'f_trab', ordem: 20, tipo: 'textarea', label: 'História Profissional', placeholder: 'Empregos anteriores, satisfação no trabalho, relações profissionais', obrigatorio: false },
    { id: 'f_rel', ordem: 21, tipo: 'textarea', label: 'Relacionamentos Afetivos', placeholder: 'Histórico de relacionamentos, vida conjugal atual', obrigatorio: false },
    { id: 'f_social', ordem: 22, tipo: 'textarea', label: 'Vida Social / Lazer', placeholder: 'Amizades, atividades de lazer, grupos de pertencimento', obrigatorio: false },

    { id: 's4', ordem: 23, tipo: 'section', label: 'IV. História Familiar' },
    { id: 'f_fam_comp', ordem: 24, tipo: 'textarea', label: 'Composição Familiar', placeholder: 'Com quem mora? Descreva os membros da família de origem', obrigatorio: false },
    { id: 'f_fam_rel', ordem: 25, tipo: 'textarea', label: 'Relacionamento Familiar', placeholder: 'Dinâmica familiar, conflitos, figuras de referência', obrigatorio: false },
    { id: 'f_hist_psiq', ordem: 26, tipo: 'textarea', label: 'Histórico Psiquiátrico Familiar', placeholder: 'Casos de transtornos mentais, uso de substâncias, suicídio na família', obrigatorio: false },

    { id: 's5', ordem: 27, tipo: 'section', label: 'V. Saúde Física' },
    { id: 'f_saude', ordem: 28, tipo: 'textarea', label: 'Condições de Saúde Física', placeholder: 'Doenças crônicas, cirurgias, hospitalizações', obrigatorio: false },
    { id: 'f_sono', ordem: 29, tipo: 'textarea', label: 'Sono', placeholder: 'Qualidade do sono, insônia, hipersonia, pesadelos', obrigatorio: false },
    { id: 'f_alim', ordem: 30, tipo: 'textarea', label: 'Alimentação', placeholder: 'Hábitos alimentares, restrições, compulsões', obrigatorio: false },
    { id: 'f_exerc', ordem: 31, tipo: 'radio', label: 'Prática de Exercício Físico', opcoes: ['Regularmente', 'Às vezes', 'Raramente', 'Nunca'], obrigatorio: false },
    { id: 'f_subst', ordem: 32, tipo: 'textarea', label: 'Uso de Substâncias', placeholder: 'Álcool, tabaco, drogas ilícitas: frequência e quantidade', obrigatorio: false },

    { id: 's6', ordem: 33, tipo: 'section', label: 'VI. Avaliação de Risco' },
    { id: 'f_risco_ide', ordem: 34, tipo: 'radio', label: 'Ideação Suicida Atual', opcoes: ['Não', 'Sim, ideação passiva', 'Sim, com plano', 'Prefiro não informar'], obrigatorio: false },
    { id: 'f_risco_tent', ordem: 35, tipo: 'radio', label: 'Tentativas Anteriores de Suicídio', opcoes: ['Não', 'Sim, uma vez', 'Sim, mais de uma vez'], obrigatorio: false },
    { id: 'f_risco_auto', ordem: 36, tipo: 'radio', label: 'Autolesão', opcoes: ['Não', 'No passado', 'Atualmente'], obrigatorio: false },
    { id: 'f_risco_det', ordem: 37, tipo: 'textarea', label: 'Detalhes e Plano de Segurança', placeholder: 'Descreva o contexto e as medidas de proteção acordadas', obrigatorio: false },

    { id: 's7', ordem: 38, tipo: 'section', label: 'VII. Observações do Psicólogo' },
    { id: 'f_obs', ordem: 39, tipo: 'textarea', label: 'Hipótese Diagnóstica / Impressão Clínica', placeholder: 'Observações, hipóteses diagnósticas e conduta proposta...', obrigatorio: false },
    { id: 'f_metas', ordem: 40, tipo: 'textarea', label: 'Metas Terapêuticas', placeholder: 'Objetivos estabelecidos para o processo terapêutico', obrigatorio: false },
  ]
};

export const TEMPLATE_ADOLESCENTE = {
  id: 'padrao_adolescente',
  nome: 'Anamnese Adolescente (Padrão)',
  descricao: 'Questionário focado em pacientes adolescentes (11–18 anos).',
  tipo: 'padrao',
  icone: '🎒',
  campos: [
    { id: 's1', ordem: 0, tipo: 'section', label: 'I. Dados do Adolescente' },
    { id: 'f_nome', ordem: 1, tipo: 'text', label: 'Nome Completo', placeholder: 'Nome do adolescente', obrigatorio: true },
    { id: 'f_nasc', ordem: 2, tipo: 'date', label: 'Data de Nascimento', obrigatorio: false },
    { id: 'f_sexo', ordem: 3, tipo: 'radio', label: 'Sexo', opcoes: ['Masculino', 'Feminino', 'Outro / Prefiro não informar'], obrigatorio: false },
    { id: 'f_serie', ordem: 4, tipo: 'text', label: 'Série / Escola', placeholder: 'Ex: 8º Ano - Escola Estadual X', obrigatorio: false },

    { id: 's2', ordem: 5, tipo: 'section', label: 'II. Dados dos Responsáveis' },
    { id: 'f_resp1', ordem: 6, tipo: 'text', label: 'Nome do Responsável 1', obrigatorio: false },
    { id: 'f_par1', ordem: 7, tipo: 'text', label: 'Parentesco', placeholder: 'Ex: Mãe, Pai, Avó', obrigatorio: false },
    { id: 'f_tel_resp', ordem: 8, tipo: 'text', label: 'Telefone do Responsável', placeholder: '(00) 00000-0000', obrigatorio: false },
    { id: 'f_resp2', ordem: 9, tipo: 'text', label: 'Nome do Responsável 2 (se houver)', obrigatorio: false },

    { id: 's3', ordem: 10, tipo: 'section', label: 'III. Queixa e Encaminhamento' },
    { id: 'f_queixa', ordem: 11, tipo: 'textarea', label: 'Queixa Principal (relato do responsável)', placeholder: 'O que motivou a busca pelo atendimento?', obrigatorio: true },
    { id: 'f_queixa_adol', ordem: 12, tipo: 'textarea', label: 'Queixa do Próprio Adolescente', placeholder: 'Como o adolescente percebe o problema?', obrigatorio: false },
    { id: 'f_enc', ordem: 13, tipo: 'text', label: 'Encaminhamento', placeholder: 'Ex: Escola, Pediatra, Familiar...', obrigatorio: false },
    { id: 'f_inicio', ordem: 14, tipo: 'textarea', label: 'Início dos Sintomas / Contexto', placeholder: 'Quando começou? O que estava acontecendo na vida do adolescente?', obrigatorio: false },

    { id: 's4', ordem: 15, tipo: 'section', label: 'IV. Desenvolvimento e Histórico' },
    { id: 'f_gestacao', ordem: 16, tipo: 'textarea', label: 'Gestação e Parto', placeholder: 'Gravidez planejada? Intercorrências? Tipo de parto?', obrigatorio: false },
    { id: 'f_desenv', ordem: 17, tipo: 'textarea', label: 'Marcos do Desenvolvimento', placeholder: 'Primeiras palavras, marcha, controle esfincteriano...', obrigatorio: false },
    { id: 'f_medico', ordem: 18, tipo: 'textarea', label: 'Histórico Médico', placeholder: 'Doenças, internações, cirurgias, uso de medicamentos', obrigatorio: false },
    { id: 'f_trat_ant', ordem: 19, tipo: 'textarea', label: 'Tratamentos Psicológicos Anteriores', placeholder: 'Já fez acompanhamento? Resultado?', obrigatorio: false },

    { id: 's5', ordem: 20, tipo: 'section', label: 'V. Dinâmica Familiar e Social' },
    { id: 'f_familia', ordem: 21, tipo: 'textarea', label: 'Composição e Dinâmica Familiar', placeholder: 'Com quem mora? Relação com pais, irmãos? Separação dos pais?', obrigatorio: false },
    { id: 'f_amigos', ordem: 22, tipo: 'textarea', label: 'Relacionamentos Sociais', placeholder: 'Tem amigos? Sofre bullying? Como são as relações com colegas?', obrigatorio: false },
    { id: 'f_escola', ordem: 23, tipo: 'textarea', label: 'Desempenho Escolar', placeholder: 'Notas, reprovações, dificuldades de aprendizagem, relação com professores', obrigatorio: false },
    { id: 'f_lazer', ordem: 24, tipo: 'textarea', label: 'Interesses e Lazer', placeholder: 'Hobbies, esportes, uso de redes sociais, games', obrigatorio: false },

    { id: 's6', ordem: 25, tipo: 'section', label: 'VI. Saúde Mental e Avaliação de Risco' },
    { id: 'f_humor', ordem: 26, tipo: 'scale', label: 'Humor Predominante (1 = muito triste, 10 = muito bem)', min: 1, max: 10, obrigatorio: false },
    { id: 'f_sono', ordem: 27, tipo: 'textarea', label: 'Qualidade do Sono', placeholder: 'Dorme bem? Pesadelos? Insônia?', obrigatorio: false },
    { id: 'f_alim', ordem: 28, tipo: 'textarea', label: 'Alimentação', placeholder: 'Come bem? Restrições? Compulsões?', obrigatorio: false },
    { id: 'f_subst', ordem: 29, tipo: 'radio', label: 'Uso de Substâncias', opcoes: ['Não usa', 'Experimentou', 'Usa às vezes', 'Usa frequentemente'], obrigatorio: false },
    { id: 'f_risco_ide', ordem: 30, tipo: 'radio', label: 'Ideação Suicida', opcoes: ['Não', 'Passiva (vontade de sumir)', 'Ativa sem plano', 'Ativa com plano'], obrigatorio: false },
    { id: 'f_risco_auto', ordem: 31, tipo: 'radio', label: 'Autolesão', opcoes: ['Não', 'No passado', 'Atualmente'], obrigatorio: false },
    { id: 'f_risco_det', ordem: 32, tipo: 'textarea', label: 'Detalhamento do Risco / Plano de Segurança', placeholder: 'Contexto, frequência, método utilizado, fatores de proteção...', obrigatorio: false },

    { id: 's7', ordem: 33, tipo: 'section', label: 'VII. Observações Clínicas' },
    { id: 'f_obs', ordem: 34, tipo: 'textarea', label: 'Impressão Clínica / Hipótese Diagnóstica', placeholder: 'Observações do profissional, hipóteses, conduta proposta', obrigatorio: false },
    { id: 'f_metas', ordem: 35, tipo: 'textarea', label: 'Metas Terapêuticas', placeholder: 'Objetivos para o processo terapêutico', obrigatorio: false },
  ]
};

// Todos os templates padrão, sempre disponíveis sem precisar de Firestore
export const TEMPLATES_PADRAO = [TEMPLATE_ADULTO, TEMPLATE_ADOLESCENTE];
