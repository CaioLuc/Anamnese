const fs = require('fs');
const p = 'c:/Projetos Faculdade/Anamnese/src/components/PatientProfileModal.jsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

lines.splice(427 - 1, 3,
`              {activeTab === 'anamnese' && (`,
`                <div className="bg-white/80 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-2xl flex flex-col items-start justify-center w-full">`,
`                  {/* Navegador de Múltiplas Anamneses */}`,
`                  {anamneses.length > 1 && !isEditingAnamnese && !showTemplateSelector && !selectedTemplate && (`,
`                    <div className="w-full border-b border-slate-200 dark:border-white/10 px-6 py-4 overflow-x-auto flex gap-2 custom-scrollbar shrink-0">`,
`                      {anamneses.map((ana) => (`,
`                        <button`,
`                          key={ana.id}`,
`                          onClick={() => setSelectedAnamneseId(ana.id)}`,
`                          className={\`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all \${`,
`                            selectedAnamneseId === ana.id `,
`                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300' `,
`                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-zinc-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'`,
`                          }\`}`,
`                        >`,
`                          {ana.tipo === 'dinamico' ? ana.questionario_nome || 'Personalizada' : (ana.tipo === 'adolescente' ? 'Adolescente' : 'Adulto')} - {new Date(ana.createdAt?.toDate() || Date.now()).toLocaleDateString()}`,
`                        </button>`,
`                      ))}`,
`                    </div>`,
`                  )}`,
`                   {anamneses.length > 0 && !isEditingAnamnese && currentAnamnese ? (`
);

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('PATCH BY LINE SUCCESS');
