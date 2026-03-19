const fs = require('fs');
const p = 'c:/Projetos Faculdade/Anamnese/src/components/PatientProfileModal.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Update loadHistory to fetch missing templates
const loadHistoryMatch = `      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
    } catch (error) {`;

const newLoadHistory = `
      // Buscar template caso falte no snapshot (retro-compatibilidade com as primeiras criadas)
      for (const a of anamnesesData) {
         if (a.tipo === 'dinamico' && !a.template_snapshot && a.questionario_id) {
             try {
                const { lerQuestionario } = await import('../services/patientService');
                const t = await lerQuestionario(a.questionario_id);
                if (t) a.template_snapshot = t;
             } catch(e) {}
         }
      }
      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
    } catch (error) {`;
content = content.replace(loadHistoryMatch, newLoadHistory);

// 2. Update the read-only view
const readOnlyMatchStart = `                         {/* Exibição apenas-leitura da Anamnese Estruturada */}`;
const readOnlyMatchEnd = `                         </div>
                       </div>
                    ) : (!selectedFormType && !selectedTemplate) ? (`;

const p1 = content.split(readOnlyMatchStart);
const p2 = content.split(readOnlyMatchEnd);

if (p1.length < 2 || p2.length < 2) {
    console.error('READ ONLY MATCH FALHOU');
    process.exit(1);
}

const oldReadOnlyBlock = content.substring(content.indexOf(readOnlyMatchStart) + readOnlyMatchStart.length, content.indexOf(readOnlyMatchEnd));

const newReadOnlyBlock = `
                         {/* Exibição da Anamnese Estruturada ou Dinâmica */}
                         <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                           {anamneses[0].tipo === 'dinamico' ? (
                               <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 p-6 rounded-2xl shadow-sm">
                                  {anamneses[0].template_snapshot ? (
                                      <QuestionarioFiller 
                                          template={anamneses[0].template_snapshot} 
                                          respostas={anamneses[0].respostas || {}} 
                                          readOnly={true} 
                                      />
                                  ) : (
                                      <div className="space-y-4">
                                          {Object.entries(anamneses[0].respostas || {}).map(([key, val]) => (
                                              <div key={key} className="flex flex-col gap-1">
                                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Campo: {key}</span>
                                                  <span className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{Array.isArray(val) ? val.join(', ') : String(val)}</span>
                                              </div>
                                          ))}
                                          <p className="text-xs text-amber-500 mt-4">* O template original não foi salvo e não pôde ser recuperado.</p>
                                      </div>
                                  )}
                               </div>
                           ) : (
                               <>
                               ${oldReadOnlyBlock.replace(/<div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">/g, '')}
                               </>
                           )}
                           </div>
`;

content = content.substring(0, content.indexOf(readOnlyMatchStart)) + newReadOnlyBlock + content.substring(content.indexOf(readOnlyMatchEnd));


// 3. Update criarAnamnese call to include template_snapshot
const criarMatch = `                                  await criarAnamnese({
                                    id_paciente: patient.id,
                                    questionario_id: selectedTemplate.id,
                                    questionario_nome: selectedTemplate.nome,
                                    tipo: 'dinamico',
                                    respostas: templateRespostas,
                                  });`;

const newCriarCall = `                                  await criarAnamnese({
                                    id_paciente: patient.id,
                                    questionario_id: selectedTemplate.id,
                                    questionario_nome: selectedTemplate.nome,
                                    tipo: 'dinamico',
                                    respostas: templateRespostas,
                                    template_snapshot: selectedTemplate,
                                  });`;

content = content.replace(criarMatch, newCriarCall);

fs.writeFileSync(p, content, 'utf8');
console.log('PATCH SUCCESS');
