const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'PatientProfileModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('File length:', content.length);
console.log('Has selectedFormType:', content.includes('selectedFormType'));
console.log('Has Nova Ficha:', content.includes('Nova Ficha de Anamnese'));

const oldStart = 'Nova Ficha de Anamnese';
const oldEnd = "selectedFormType === 'adulto'";

if (!content.includes(oldStart) || !content.includes(oldEnd)) {
  console.log('MARKERS NOT FOUND');
  process.exit(1);
}

// Find the ) : !selectedFormType ? ( line before "Nova Ficha"
const idxNovaFicha = content.indexOf(oldStart);
const beforeNovaFicha = content.substring(0, idxNovaFicha);
const idxBlockStart = beforeNovaFicha.lastIndexOf(') : !');
const lineStart = beforeNovaFicha.lastIndexOf('\n', idxBlockStart) + 1;

const idxOldEnd = content.indexOf(oldEnd);
const newBlock = `                    ) : !selectedFormType && !selectedTemplate ? (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <div className="max-w-md w-full text-center">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhuma anamnese registrada</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Inicie a ficha deste paciente criando uma anamnese.</p>
                                <button onClick={() => setShowTemplateSelector(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors">
                                  Nova Anamnese
                                </button>
                            </div>
                            <SelecionarTemplateModal isOpen={showTemplateSelector} onClose={() => setShowTemplateSelector(false)} onSelecionar={(tmpl) => { setSelectedTemplate(tmpl); setTemplateRespostas({}); setShowTemplateSelector(false); }} />
                        </div>
                    ) : selectedTemplate ? (
                        <div className="w-full p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><span>{selectedTemplate.icone}</span> {selectedTemplate.nome}</h3>
                            </div>
                            <button onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); }} className="text-slate-400 hover:text-red-500 transition-colors">X</button>
                          </div>
                          {anamneseSaveError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-sm text-red-600 dark:text-red-400">{anamneseSaveError}</div>}
                          <QuestionarioFiller template={selectedTemplate} respostas={templateRespostas} onChange={setTemplateRespostas} />
                          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                            <button onClick={() => { setSelectedTemplate(null); setTemplateRespostas({}); setAnamneseSaveError(''); }} className="text-sm text-slate-500 dark:text-slate-400">Cancelar</button>
                            <button onClick={async () => { setIsSavingAnamnese(true); setAnamneseSaveError(''); try { await criarAnamnese({ id_paciente: patient.id, questionario_id: selectedTemplate.id, questionario_nome: selectedTemplate.nome, tipo: 'dinamico', respostas: templateRespostas }); setSelectedTemplate(null); setTemplateRespostas({}); loadHistory(); } catch (e) { setAnamneseSaveError('Erro ao salvar.'); } finally { setIsSavingAnamnese(false); } }} disabled={isSavingAnamnese} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50">{isSavingAnamnese ? 'Salvando...' : 'Salvar Anamnese'}</button>
                          </div>
                        </div>
                    ) : `;

const newContent = content.substring(0, lineStart) + newBlock + content.substring(idxOldEnd);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: file patched, new length:', newContent.length);
