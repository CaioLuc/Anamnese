const fs = require('fs');
const p = 'c:/Projetos Faculdade/Anamnese/src/components/PatientProfileModal.jsx';
let content = fs.readFileSync(p, 'utf8');

const target1 = `) : !selectedFormType ? (`;
const target2 = `(selectedFormType === 'adulto' || (isEditingAnamnese && anamneses[0]?.tipo !== 'adolescente')) ? (`

if (!content.includes(target1) || !content.includes(target2)) {
    console.log('Targets not found');
    process.exit(1);
}

const p1 = content.split(target1);
const p2 = content.split(target2);

const newText = p1[0] + `) : !selectedFormType && !selectedTemplate ? (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <div className="max-w-md w-full text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                  <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhuma anamnese registrada</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Inicie a ficha deste paciente criando e preenchendo uma anamnese.</p>
                                <button
                                  onClick={() => setShowTemplateSelector(true)}
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  Nova Anamnese
                                </button>
                            </div>

                            <SelecionarTemplateModal
                              isOpen={showTemplateSelector}
                              onClose={() => setShowTemplateSelector(false)}
                              onSelecionar={(template) => {
                                setSelectedTemplate(template);
                                setTemplateRespostas({});
                                setShowTemplateSelector(false);
                              }}
                            />
                        </div>

                    ) : selectedTemplate ? (
                        <div className="w-full p-6 bg-white dark:bg-zinc-950/80 h-full overflow-y-auto custom-scrollbar">
                          <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{selectedTemplate.icone}</span> {selectedTemplate.nome}
                              </h3>
                              {selectedTemplate.descricao && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedTemplate.descricao}</p>
                              )}
                            </div>
                            <button
                              onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                              className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-xl"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {anamneseSaveError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                              {anamneseSaveError}
                            </div>
                          )}

                          <div className="bg-slate-50/50 dark:bg-zinc-900/30 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                            <QuestionarioFiller
                              template={selectedTemplate}
                              respostas={templateRespostas}
                              onChange={setTemplateRespostas}
                            />
                          </div>

                          <div className="mt-8 pt-4 flex justify-end items-center gap-3">
                            <button
                              onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }}
                              className="px-5 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium border border-transparent hover:border-slate-300 dark:hover:border-white/10 rounded-xl"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={async () => {
                                setIsSavingAnamnese(true);
                                setAnamneseSaveError('');
                                try {
                                  // Assumindo que o importar está ok
                                  await criarAnamnese({
                                    id_paciente: patient.id,
                                    questionario_id: selectedTemplate.id,
                                    questionario_nome: selectedTemplate.nome,
                                    tipo: 'dinamico',
                                    respostas: templateRespostas,
                                  });
                                  setSelectedTemplate(null);
                                  setTemplateRespostas({});
                                  loadHistory();
                                } catch (e) {
                                  console.error(e);
                                  setAnamneseSaveError('Erro ao salvar. Verifique sua conexão.');
                                } finally {
                                  setIsSavingAnamnese(false);
                                }
                              }}
                              disabled={isSavingAnamnese}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-md disabled:opacity-50"
                            >
                              {isSavingAnamnese ? (
                                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Salvando...</>
                              ) : 'Salvar Anamnese'}
                            </button>
                          </div>
                        </div>

                    ) : (` + p2[1];

fs.writeFileSync(p, newText, 'utf8');
console.log('SUCCESS_P2');
