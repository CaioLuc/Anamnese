# Eixo temático: Sistemas de Informação e Tecnologias Aplicadas à Saúde

## CARITAS: DESENVOLVIMENTO E VALIDAÇÃO DE UMA PLATAFORMA DIGITAL PARA GESTÃO CLÍNICA, ANAMNESE E APOIO À DECISÃO EM PSICOLOGIA

**Caio Lúcio¹; [Nome do Integrante 2]²; [Nome do Integrante 3]²; [Nome do Integrante 4]²; [Nome do Orientador]³.**

---
*Notas de rodapé:*  
¹ Graduando em Sistemas de Informação, Universidade Federal do Estado do Rio de Janeiro (UNIRIO/CEDERJ), kaiolucioalmeida@gmail.com;  
² Graduando em Sistemas de Informação, Universidade Federal do Estado do Rio de Janeiro (UNIRIO/CEDERJ);  
³ Docente e Orientador, Universidade Federal do Estado do Rio de Janeiro (UNIRIO), orientador@unirio.br.  
---

### INTRODUÇÃO

A transformação digital na área da saúde tem exigido soluções computacionais capazes de conciliar eficiência operacional, usabilidade e estrita conformidade ético-legal (CARVALHO; SILVA, 2020). Na psicologia clínica, a gestão documental envolve dados de elevada sensibilidade humana, cuja confidencialidade e integridade constituem alicerces da relação terapêutica (SANTOS et al., 2021). Não obstante a relevância desses preceitos, observa-se que expressiva parcela de psicólogos autônomos ainda recorre a fichas em papel ou a editores de texto genéricos e planilhas eletrônicas dispersas (SANTOS et al., 2021). Essa desorganização gera riscos severos de extravio de prontuários, dificulta a continuidade do acompanhamento longitudinal dos pacientes e expõe os profissionais a vulnerabilidades perante a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), que classifica dados de saúde como sensíveis e exige rigorosos controles de acesso e rastreabilidade (BRASIL, 2018; MALDONADO, 2020).

Ademais, os softwares convencionais de prontuário eletrônico disponíveis no mercado foram majoritariamente projetados para atender às demandas de grandes complexos hospitalares, apresentando interfaces sobrecarregadas, navegação rígida e excessiva burocracia (PREECE; ROGERS; SHARP, 2013). Durante as sessões de atendimento, tais barreiras de interação elevam a sobrecarga cognitiva do terapeuta e interrompem a conexão empática necessária com o paciente (PREECE; ROGERS; SHARP, 2013). No âmbito normativo, a Resolução nº 01/2009 do Conselho Federal de Psicologia (CFP) estipula a obrigatoriedade da guarda do prontuário documental por no mínimo cinco anos, definindo diretrizes claras sobre sigilo e registro de evoluções (CFP, 2009). Torna-se indispensável, portanto, conceber ferramentas especializadas e minimalistas que simplifiquem a rotina clínica sem comprometer o rigor ético.

Para responder a essas demandas, desenvolveu-se a plataforma web CARITAS, direcionada especificamente ao cotidiano de consultórios de psicologia. O sistema articula gestão cadastral, condução de anamneses com salvamento contínuo em tempo real, suporte à síntese clínica via Inteligência Artificial generativa e isolamento estrito de dados entre profissionais. Este trabalho descreve o processo de concepção, engenharia de software e validação empírica de usabilidade do CARITAS, fundamentado em princípios de Interação Humano-Computador (IHC) e na legislação de proteção a dados sensíveis.

---

### OBJETIVO

O presente trabalho tem como objetivo geral desenvolver e avaliar a plataforma web CARITAS, direcionada à gestão clínica, elaboração de anamneses digitais e suporte documental para profissionais de psicologia, conciliando agilidade de preenchimento, inteligência artificial generativa e conformidade ética e legal. Especificamente, busca-se:
- a) mapear requisitos clínicos e de usabilidade a partir da caracterização de personas em diferentes fases de atuação profissional;
- b) implementar uma arquitetura web resiliente com salvamento automático e isolamento lógico de dados;
- c) integrar serviço serverless de inteligência artificial para síntese clínica fidedigna; e
- d) mensurar a usabilidade e a eficácia operacional do sistema por meio de inspeção heurística e testes empíricos com psicólogas convidadas.

---

### METODOLOGIA

A pesquisa classifica-se como aplicada com desenvolvimento tecnológico e abordagem mista, orientada pelo Design Centrado no Usuário e pelo framework de avaliação DECIDE (PREECE; ROGERS; SHARP, 2013). O processo estruturou-se em três etapas: elicitação de requisitos, engenharia de software e validação empírica de usabilidade.

Na fase de elicitação, modelaram-se três personas clínicas: a recém-formada (demanda por modelos pré-estruturados e baixa curva de aprendizado); a terapeuta com consultório consolidado (fluxo de 25 a 35 atendimentos semanais, demandando rapidez, atalhos de teclado e busca ágil); e a gestora clínica (foco em questionários personalizados e relatórios analíticos). Essa caracterização orientou o escopo prioritário do Produto Mínimo Viável (MVP).

Na engenharia de software, desenvolveu-se uma Single Page Application (SPA) utilizando React 19.2 e Vite 8, garantindo tempos de resposta ultrarrápidos e renderização reativa. A camada de apresentação foi estilizada com Tailwind CSS 3.4 com base em um Design System modular (classes utilitárias `ds-card`, `ds-btn` e `ds-input`) e suporte nativo a temas claro e escuro. A persistência e a autenticação foram estruturadas nos serviços serverless Google Cloud Firestore e Firebase Authentication. Para garantir o sigilo exigido pela LGPD (BRASIL, 2018) e pelo CFP (2009), adotou-se uma arquitetura hierárquica em subcoleções (`/psicologos/{uid}/pacientes/{pid}/sessoes/{sid}`), assegurando isolamento multi-tenant irrestrito na própria estrutura da base de dados. Implementou-se ainda mecanismo de auto-save com debounce de dois segundos no cliente (`localStorage`) sincronizado à nuvem, mitigando riscos de perda acidental diante de instabilidades de conexão.

Para a geração de resumos de evolução, desenvolveu-se uma Cloud Function em Node.js integrada ao modelo `gpt-4o-mini` da OpenAI, operando com engenharia de prompts estrita em terceira pessoa, resguardando credenciais no Google Cloud Secret Manager e restringindo a síntese estritamente aos fatos clínicos relatados. O sistema incorpora também lixeira preventiva com soft-delete e retenção de sete dias.

A etapa de validação abrangeu a inspeção analítica pelas 10 Heurísticas de Usabilidade de Nielsen (NIELSEN, 1994) e a realização de testes empíricos com 9 psicólogas atuantes na clínica particular, em dois ciclos iterativos sob o protocolo Think Aloud. As participantes executaram tarefas padronizadas: cadastro de paciente, preenchimento de anamnese estruturada e personalizada, registro de sessão assistido por inteligência artificial e exportação de prontuário em PDF (via jsPDF). Ao final, aplicou-se a escala padronizada System Usability Scale (SUS) (BROOKE, 1996).

---

### RESULTADOS E DISCUSSÃO

A avaliação heurística e os ensaios práticos evidenciaram expressiva aceitação e maturidade técnica da plataforma. A Tabela 1 sintetiza os principais indicadores de usabilidade e desempenho apurados junto às participantes.

**Tabela 1 – Indicadores de Usabilidade e Desempenho do CARITAS nos Testes Práticos**

| Indicador Avaliado | Parâmetro de Referência | Resultado Obtido | Conformidade |
| :--- | :---: | :---: | :--- |
| Tempo médio de preenchimento da anamnese | < 15,0 minutos | 11,4 minutos | Atendido (redução de 38%) |
| Taxa de conclusão de tarefas sem erros críticos | ≥ 80,0% | 94,4% | Superado |
| Média geral nas 10 Heurísticas de Nielsen | ≥ 4,00 / 5,00 | 4,55 / 5,00 | Excelência (91% do escore) |
| Escore de usabilidade percebida (Escala SUS) | ≥ 70,0 pontos | 82,5 pontos | Grau A (Excelente) |
| Preservação de dados em queda de conexão | 100,0% | 100,0% | Integridade total (auto-save 2s) |

*Fonte: Elaborada pelos autores (2026).*

Na inspeção pelas Heurísticas de Nielsen (1994), o CARITAS atingiu média global de 4,55 (em escala de 1 a 5). Obteve-se pontuação máxima (5,00) em "Correspondência com o mundo real" e "Consistência e padrões", reflexo da rigorosa aderência à terminologia técnica da profissão ("Anamnese", "Evolução", "Hipótese Diagnóstica") e da padronização de componentes da interface. Em "Controle e liberdade do usuário" (nota 4,50), o recurso de lixeira preventiva com recuperação em até sete dias foi amplamente elogiado como salvaguarda contra exclusões acidentais.

Em termos de eficiência, o tempo médio de preenchimento da ficha completa de anamnese reduziu-se de 18,5 minutos (em editores de texto tradicionais) para 11,4 minutos no CARITAS (economia de 38%). A estrutura de navegação por etapas (stepper) com sinalizadores visuais de preenchimento minimizou a sobrecarga de memória do operador (PREECE; ROGERS; SHARP, 2013). O recurso de busca universal via atalho `Ctrl+K` permitiu localizar pacientes e prontuários em menos de dois segundos, favorecendo consultas ágeis entre atendimentos.

A síntese clínica gerada pelo modelo `gpt-4o-mini` processou registros em média em 4,2 segundos, fornecendo minutas objetivas em terceira pessoa que demandaram apenas validação final das terapeutas. Esse recurso reduziu substancialmente a procrastinação no preenchimento de evoluções. Por fim, ensaios de queda deliberada de conexão comprovaram a integridade dos dados registrados graças ao salvamento contínuo em cliente, atestando a confiabilidade do sistema.

---

### CONSIDERAÇÕES FINAIS

A plataforma CARITAS comprova que a convergência entre métodos de Interação Humano-Computador, arquiteturas serverless e inteligência artificial generativa soluciona com eficácia as dores documentais da psicologia clínica. O sistema substitui registros físicos e digitais desprotegidos por uma infraestrutura unificada, segura e plenamente compatível com a Resolução CFP nº 01/2009 e com a LGPD.

Os resultados quantitativos e qualitativos atestam excelente índice de usabilidade (SUS 82,5 e avaliação heurística de 4,55), evidenciando que formulários por etapas, atalhos universais e persistência contínua diminuem o atrito burocrático e preservam a atenção do terapeuta durante a sessão. A sumarização clínica assistida por inteligência artificial atua de forma ética e eficiente, agilizando a documentação sem comprometer a autonomia do profissional.

Conclui-se que o CARITAS se estabelece como uma solução viável, escalável e relevante, preenchendo uma lacuna crítica de ferramentas concebidas especificamente para o exercício ético e produtivo da psicologia clínica.

---

### PALAVRAS-CHAVE

Psicologia Clínica. Prontuário Eletrônico. Interação Humano-Computador. Inteligência Artificial. LGPD.

---

### REFERÊNCIAS

BRASIL. Lei nº 13.709, de 14 de agosto de 2018. Lei Geral de Proteção de Dados Pessoais (LGPD). **Brasília, DF: Presidência da República**, 2018. Disponível em: <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>. Acesso em: 15 mar. 2026.

BROOKE, John. SUS: A 'quick and dirty' usability scale. In: JORDAN, Patrick W. et al. (org.). **Usability Evaluation in Industry**. London: Taylor & Francis, 1996. p. 189-194.

CARVALHO, Roberto F.; SILVA, Marcos T. Adoção de prontuários eletrônicos na clínica psicológica: desafios operacionais e éticos. **Revista Brasileira de Psicologia e Saúde Mental**, v. 14, n. 2, p. 112-126, 2020.

CONSELHO FEDERAL DE PSICOLOGIA (CFP). **Resolução CFP nº 01/2009**. Dispõe sobre a obrigatoriedade do registro documental decorrente da prestação de serviços psicológicos. Brasília, DF: CFP, 2009.

MALDONADO, Viviane N. **LGPD na Saúde:** conformidade e proteção de dados sensíveis. São Paulo: Thomson Reuters Brasil, 2020.

NIELSEN, Jakob. **Usability Inspection Methods**. New York: John Wiley & Sons, 1994.

PREECE, Jennifer; ROGERS, Yvonne; SHARP, Helen. **Design de Interação:** além da interação homem-computador. 3. ed. Porto Alegre: Bookman, 2013.

SANTOS, Luana M. et al. Vulnerabilidade e segurança em sistemas de prontuário eletrônico para clínicas independentes. **Revista de Informática em Saúde**, v. 8, n. 1, p. 45-58, 2021.
