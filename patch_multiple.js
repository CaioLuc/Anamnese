const fs = require('fs');
const p = 'c:/Projetos Faculdade/Anamnese/src/components/PatientProfileModal.jsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add import
content = content.replace("deletarSessao, criarAnamnese, atualizarAnamnese }", "deletarSessao, criarAnamnese, atualizarAnamnese, deletarAnamnese }");

// 2. Add states
const statesMatch = `  const [isSavingAnamnese, setIsSavingAnamnese] = useState(false);
  const [anamneseSaveError, setAnamneseSaveError] = useState('');`;

content = content.replace(statesMatch, `${statesMatch}
  const [selectedAnamneseId, setSelectedAnamneseId] = useState(null);
  const [confirmDeleteAnamnese, setConfirmDeleteAnamnese] = useState({ isOpen: false, anamnese: null });`);

// 3. Add handle function & update loadHistory
const loadHistoryMatch = `      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
    } catch (error) {`;

content = content.replace(loadHistoryMatch, `      setAnamneses(anamnesesData);
      setSessoes(sessoesData);
      
      if (anamnesesData.length > 0) {
        if (!selectedAnamneseId || !anamnesesData.find(a => a.id == selectedAnamneseId)) {
           setSelectedAnamneseId(anamnesesData[0].id);
        }
      } else {
        setSelectedAnamneseId(null);
      }
    } catch (error) {`);

const handleExcluirSessaoMatch = `  const handleExcluirSessao = (sessao) => {`;
const newHandleAnamnese = `  const confirmExcluirAnamnese = async () => {
    const ana = confirmDeleteAnamnese.anamnese;
    setConfirmDeleteAnamnese({ isOpen: false, anamnese: null });
    if (!ana) return;
    try {
      await deletarAnamnese(ana.id);
      loadHistory();
    } catch (err) {
      console.error('Erro ao deletar anamnese:', err);
    }
  };

`;
content = content.replace(handleExcluirSessaoMatch, newHandleAnamnese + handleExcluirSessaoMatch);

// 4. Add currentAnamnese before PDF generators
const pdfMatch = `  // ====== FUNÇÕES DE PDF ======`;
content = content.replace(pdfMatch, `  const currentAnamnese = anamneses.find(a => a.id === selectedAnamneseId) || anamneses[0];\n\n  // ====== FUNÇÕES DE PDF ======`);

// 5. Replace PDF usage of anamneses[0]
content = content.replace(`     if (anamneses.length === 0) return;\n     const ana = anamneses[0];`, `     if (anamneses.length === 0 || !currentAnamnese) return;\n     const ana = currentAnamnese;`);

// 6. Fix activeTab === 'anamnese' rendering
const activeTabAnamneseMatch = `              {activeTab === 'anamnese' && (
                <div className="bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-2xl flex items-start justify-center">
                   {anamneses.length > 0 && !isEditingAnamnese ? (`;

const newActiveTabAnamnese = `              {activeTab === 'anamnese' && (
                <div className="bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col items-start justify-center w-full">
                  {/* Navegador de Múltiplas Anamneses */}
                  {anamneses.length > 1 && !isEditingAnamnese && !showTemplateSelector && !selectedTemplate && (
                    <div className="w-full border-b border-slate-200 dark:border-white/10 px-6 py-4 overflow-x-auto flex gap-2 custom-scrollbar shrink-0">
                      {anamneses.map((ana) => (
                        <button
                          key={ana.id}
                          onClick={() => setSelectedAnamneseId(ana.id)}
                          className={\`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all \${
                            selectedAnamneseId === ana.id 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
                          }\`}
                        >
                          {ana.tipo === 'dinamico' ? ana.questionario_nome || 'Personalizada' : (ana.tipo === 'adolescente' ? 'Adolescente' : 'Adulto')} - {new Date(ana.createdAt?.toDate() || Date.now()).toLocaleDateString()}
                        </button>
                      ))}
                    </div>
                  )}
                   {anamneses.length > 0 && !isEditingAnamnese && currentAnamnese ? (`;
                   
content = content.replace(activeTabAnamneseMatch, newActiveTabAnamnese);

// 7. Update Header of Anamnese
const headerMatchStart = `<div className="flex justify-between items-center mb-8 border-b border-slate-300 dark:border-white/10 pb-4">`;
const headerMatchEnd = `</span>
                            </div>
                         </div>`;

const splitContent = content.split(headerMatchStart);
const innerSplit = splitContent[1].split(headerMatchEnd);

const newHeader = `                            <div>
                               <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                   Anamnese Registrada
                                   <span className={\`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full \${currentAnamnese.tipo === 'adolescente' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : (currentAnamnese.tipo === 'dinamico' ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30')}\`}>
                                       {currentAnamnese.tipo === 'adolescente' ? 'Infantil / Adolescente' : (currentAnamnese.tipo === 'dinamico' ? (currentAnamnese.questionario_nome || 'Personalizada') : 'Adulto')}
                                   </span>
                               </h3>
                               <p className="text-sm text-slate-600 dark:text-slate-400">Criada em: {new Date(currentAnamnese.createdAt?.toDate() || Date.now()).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                               <button onClick={() => setIsEditingAnamnese(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 font-medium rounded-xl hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-300 dark:border-white/10 shadow-sm text-sm" title="Editar">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                               <button onClick={gerarPdfAnamnese} className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 font-medium rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 shadow-sm text-sm" title="Exportar">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                               </button>
                               <button onClick={() => setConfirmDeleteAnamnese({ isOpen: true, anamnese: currentAnamnese })} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 font-medium rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20 shadow-sm text-sm" title="Excluir">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               </button>
                            </div>
                         </div>`;

content = splitContent[0] + headerMatchStart + newHeader + innerSplit[1];

// 8. Replace anamneses[0] with currentAnamnese in the rest of the read-only block
const oldBottomSplit = content.split(`) : (!selectedFormType && !selectedTemplate) ? (`);
const oldReadOnly = oldBottomSplit[0];
const replacedReadOnly = oldReadOnly.replace(/anamneses\[0\]/g, 'currentAnamnese');

content = replacedReadOnly + `) : (!selectedFormType && !selectedTemplate) ? (` + oldBottomSplit[1];

// 9. Add ConfirmDialog at the end
const confirmMatch = `      <ConfirmDialog
        isOpen={confirmSessao.isOpen}`;
const newConfirm = `      <ConfirmDialog
        isOpen={confirmDeleteAnamnese.isOpen}
        title="Excluir Anamnese"
        message={\`Deseja apagar permanentemente a anamnese do dia \${confirmDeleteAnamnese.anamnese?.createdAt ? new Date(confirmDeleteAnamnese.anamnese.createdAt.toDate() || Date.now()).toLocaleDateString() : ''}? Esta ação não pode ser desfeita e os dados serão perdidos.\`}
        onConfirm={confirmExcluirAnamnese}
        onCancel={() => setConfirmDeleteAnamnese({ isOpen: false, anamnese: null })}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmSessao.isOpen}`;

content = content.replace(confirmMatch, newConfirm);

fs.writeFileSync(p, content, 'utf8');
console.log('PATCH SUCCESS');
