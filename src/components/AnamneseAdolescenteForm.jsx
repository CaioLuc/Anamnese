import { useState, useEffect } from 'react';
import { criarAnamnese, atualizarAnamnese } from '../services/patientService';

export default function AnamneseAdolescenteForm({ patient, onSaved, initialData }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  
    // ==========================================
    // ESTRUTURA DE ESTADO DA ANAMNESE ADOLESCENTE
    // ==========================================
    const [formData, setFormData] = useState({
      tipo: 'adolescente', // Marcador para leitura condicional

      // Seção 0: Histórico Prévio
      psicologo_previo: false,
      psiquiatra_previo: false,
      foi_ambulatorio: false,
      houve_internamento: false,
      
      // Seção 1: Dados Familiares
      nome_pai: '',
      idade_pai: '',
      profissao_pai: '',
      nome_mae: '',
      idade_mae: '',
      profissao_mae: '',
      qtd_irmaos: 0,
      irmaos_masculino: 0,
      irmaos_feminino: 0,
      
      // Seção 2: Histórico de Desenvolvimento e Escolar
      gestacao_planejada: false,
      gestacao_notas: '',
      tipo_parto: 'Natural',
      testes_nascimento: false,
      testes_notas: '',
      internacao_nascimento: false,
      internacao_notas: '',
      mamou: false,
      tempo_amamentacao: '',
      desenvolvimento_motor: '',
      atraso_fala: '',
      seletividade_alimentar: false,
      seletividade_notas: '',
      interacao_brincadeiras: '',
      dificuldade_escolar: false,
      dificuldade_escolar_notas: '',
      mudanca_escola: false,
      mudanca_escola_notas: '',
      
      // Seção 3: Motivo da Consulta e Dinâmicas
      motivo_consulta: '',
      historico_queixa: '',
      dinamica_familiar: '',
      dinamica_amorosa: '',
      
      // Seção 4: Quadro Clínico e Sintomas
      sintomas_apresentados: '',
      fatores_agravantes: '',
      transtornos_anteriores: '',
      doencas_importantes: '',
      medicamentos: '',
      tentativa_suicidio: '',
      
      // Seção 5: Finalização
      observacoes_gerais: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setStatusMessage({ type: '', text: '' });

      try {
        if (initialData?.id) {
            await atualizarAnamnese(initialData.id, formData);
            setStatusMessage({ type: 'success', text: 'Anamnese atualizada com sucesso!' });
        } else {
            await criarAnamnese({
              id_paciente: patient.id,
              ...formData
            });
            setStatusMessage({ type: 'success', text: 'Anamnese salva com sucesso!' });
        }
        
        if (onSaved) {
            setTimeout(() => onSaved(), 2000);
        }
      } catch (err) {
        console.error(err);
        setStatusMessage({ type: 'error', text: 'Erro ao salvar a Anamnese.' });
      } finally {
        setIsSubmitting(false);
      }
    };

    const Switch = ({ label, name, checked }) => (
      <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="relative">
          <input type="checkbox" name={name} checked={checked} onChange={handleChange} className="sr-only" />
          <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-zinc-700'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
        </div>
      </label>
    );

    const SectionHeader = ({ title, desc, step }) => (
        <div className="flex items-center gap-4 mb-6 pt-8 first:pt-0">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner border border-cyan-500/30">
             {step}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {desc && <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>}
          </div>
        </div>
    );

    return (
      <div className="w-full max-w-4xl mx-auto custom-scrollbar h-full overflow-y-auto pr-2 pb-10">
        
        {statusMessage.text && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 transition-all sticky top-0 z-10 ${
            statusMessage.type === 'success' 
            ? 'bg-emerald-500/90 backdrop-blur-md border-emerald-500/20 text-emerald-50 shadow-xl' 
            : 'bg-red-500/90 backdrop-blur-md border-red-500/20 text-red-50 shadow-xl'
          }`}>
            <p className="text-sm font-medium">{statusMessage.text}</p>
          </div>
        )}

        {/* Título da Ficha */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-b border-cyan-500/20 p-6 rounded-t-3xl -mx-6 -mt-6 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Ficha Psicológica Infantil / Adolescente
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Instrumento focado em desenvolvimento infanto-juvenil e âmbito escolar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* Seção 0 */}
            <section className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg">
                <SectionHeader step="0" title="Histórico Prévio" desc="Relacionamentos anteriores com serviços de Saúde Mental." />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Switch label="Já consultou um psicólogo anteriormente?" name="psicologo_previo" checked={formData.psicologo_previo} />
                    <Switch label="Já consultou um psiquiatra anteriormente?" name="psiquiatra_previo" checked={formData.psiquiatra_previo} />
                </div>
                {formData.psiquiatra_previo && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 animate-in fade-in zoom-in-95 duration-200">
                      <Switch label="Se sim, foi em ambulatório?" name="foi_ambulatorio" checked={formData.foi_ambulatorio} />
                      <Switch label="Se sim, houve internamento?" name="houve_internamento" checked={formData.houve_internamento} />
                   </div>
                )}
            </section>

            {/* Seção 1 */}
            <section className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg">
                <SectionHeader step="1" title="Dados Familiares" desc="Estrutura e composição do núcleo base." />
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome do Pai</label>
                           <input type="text" name="nome_pai" value={formData.nome_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade do Pai</label>
                           <input type="number" name="idade_pai" value={formData.idade_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div className="md:col-span-3">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão do Pai</label>
                           <input type="text" name="profissao_pai" value={formData.profissao_pai} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-4"></div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome da Mãe</label>
                           <input type="text" name="nome_mae" value={formData.nome_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade da Mãe</label>
                           <input type="number" name="idade_mae" value={formData.idade_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div className="md:col-span-3">
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Profissão da Mãe</label>
                           <input type="text" name="profissao_mae" value={formData.profissao_mae} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <div>
                           <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total de Irmãos</label>
                           <input type="number" name="qtd_irmaos" value={formData.qtd_irmaos} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-blue-400 mb-1">Destes: Masc.</label>
                           <input type="number" name="irmaos_masculino" value={formData.irmaos_masculino} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-pink-400 mb-1">Destes: Fem.</label>
                           <input type="number" name="irmaos_feminino" value={formData.irmaos_feminino} onChange={handleChange} className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white font-sm custom-input" />
                        </div>
                    </div>
                </div>
            </section>

             {/* Seção 2: Desenvolvimento - EXCLUSIVO ADOLESCENTE */}
             <section className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg border-l-4 border-l-cyan-500">
                <SectionHeader step="2" title="Desenvolvimento e Escolaridade" desc="Gestação, desenvolvimento motor e vida acadêmica." />
                
                <div className="space-y-6">
                    {/* Gestação e Parto */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="flex-1">
                              <Switch label="Foi uma gestação planejada?" name="gestacao_planejada" checked={formData.gestacao_planejada} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="gestacao_notas" value={formData.gestacao_notas} onChange={handleChange} placeholder="Como foi a gestação?" className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-200 dark:border-white/5 rounded-xl flex items-center gap-6">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Parto:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="tipo_parto" value="Natural" checked={formData.tipo_parto === 'Natural'} onChange={handleChange} className="text-cyan-500 focus:ring-cyan-500" />
                                <span className="text-slate-900 dark:text-white text-sm">Natural</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="tipo_parto" value="Cesárea" checked={formData.tipo_parto === 'Cesárea'} onChange={handleChange} className="text-cyan-500 focus:ring-cyan-500" />
                                <span className="text-slate-900 dark:text-white text-sm">Cesárea</span>
                            </label>
                        </div>
                    </div>

                    {/* Pós-nascimento */}
                    <div className="grid grid-cols-1 gap-4 bg-zinc-900/40 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="flex-1">
                              <Switch label="Realizou os testes do nascimento? (Pezinho, Orelhinha..)" name="testes_nascimento" checked={formData.testes_nascimento} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="testes_notas" value={formData.testes_notas} onChange={handleChange} placeholder="Se houve alterações, quais?" className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="flex-1">
                              <Switch label="Precisou de internação após nascer?" name="internacao_nascimento" checked={formData.internacao_nascimento} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="internacao_notas" value={formData.internacao_notas} onChange={handleChange} placeholder="Motivo e tempo" className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>
                    </div>

                    {/* Alimentação e Motor */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="flex-1">
                              <Switch label="A criança mamou?" name="mamou" checked={formData.mamou} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="tempo_amamentacao" value={formData.tempo_amamentacao} onChange={handleChange} placeholder="Tempo de amamentação / desmame" className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>
                        
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Como foi o desenvolvimento motor? (Ex: começou a andar em que época, etc)</label>
                           <textarea name="desenvolvimento_motor" value={formData.desenvolvimento_motor} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                        </div>

                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Falou no período esperado ou apresentou atraso na linguagem?</label>
                           <textarea name="atraso_fala" value={formData.atraso_fala} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-xl">
                           <div className="w-64">
                              <Switch label="Apresenta seletividade alimentar?" name="seletividade_alimentar" checked={formData.seletividade_alimentar} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="seletividade_notas" value={formData.seletividade_notas} onChange={handleChange} placeholder="Texturas, cores, sabores que evita..." className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-4"></div>

                    {/* Social/Escolar */}
                    <div className="space-y-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Gosta de brincar? Como o adolescente/criança interage bem com outras crianças?</label>
                           <textarea name="interacao_brincadeiras" value={formData.interacao_brincadeiras} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="sm:w-80">
                              <Switch label="Apresenta dificuldade escolar?" name="dificuldade_escolar" checked={formData.dificuldade_escolar} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="dificuldade_escolar_notas" value={formData.dificuldade_escolar_notas} onChange={handleChange} placeholder="Quais matérias ou situações sociais?" className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                           <div className="sm:w-80">
                              <Switch label="Mudou muito de turmas ou escolas?" name="mudanca_escola" checked={formData.mudanca_escola} />
                           </div>
                           <div className="flex-1">
                               <input type="text" name="mudanca_escola_notas" value={formData.mudanca_escola_notas} onChange={handleChange} placeholder="Motivos das mudanças..." className="w-full h-full min-h-[56px] px-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-sm" />
                           </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção 3 */}
            <section className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg">
                <SectionHeader step="3" title="Motivo da Consulta e Dinâmicas" desc="Razões pela busca e contexto sócio-familiar." />
                <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Motivo da procura do atendimento</label>
                       <textarea name="motivo_consulta" value={formData.motivo_consulta} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Histórico das dificuldades relatadas (Desde quando apresenta a queixa?)</label>
                       <textarea name="historico_queixa" value={formData.historico_queixa} onChange={handleChange} rows="3" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Dinâmica Familiar (Famílias nuclear e constituída)</label>
                       <textarea name="dinamica_familiar" value={formData.dinamica_familiar} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Dinâmicas da vida amorosa (se aplicável ao adolescente)</label>
                       <textarea name="dinamica_amorosa" value={formData.dinamica_amorosa} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar" />
                    </div>
                </div>
            </section>

            {/* Seção 4 */}
            <section className="bg-slate-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] pointer-events-none"></div>
                <SectionHeader step="4" title="Quadro Clínico e Sintomatológico" desc="Sintomas, doenças, histórico médico." />
                <div className="space-y-4 relative z-10">
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Sintomas Apresentados</label>
                       <textarea name="sintomas_apresentados" value={formData.sintomas_apresentados} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Eventos/fatores que precipitam ou agravam crises</label>
                       <textarea name="fatores_agravantes" value={formData.fatores_agravantes} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Histórico de Transtornos Psiquiátricos Familiares</label>
                       <textarea name="transtornos_anteriores" value={formData.transtornos_anteriores} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Doenças Importantes</label>
                           <textarea name="doencas_importantes" value={formData.doencas_importantes} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Medicação Atual</label>
                           <textarea name="medicamentos" value={formData.medicamentos} onChange={handleChange} rows="2" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-red-500/50" />
                        </div>
                    </div>

                    {/* ALERTA SUICÍDIO */}
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-4">
                       <label className="block text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         Atenção: Houve tentativas de suicídio?
                       </label>
                       <textarea name="tentativa_suicidio" value={formData.tentativa_suicidio} onChange={handleChange} rows="2" className="w-full p-3 bg-zinc-950/90 border border-red-500/20 rounded-lg text-red-100 placeholder-red-900/50 resize-y focus:ring-1 focus:ring-red-500 text-sm" placeholder="Se sim, detalhe época, método e desfecho..." />
                    </div>
                </div>
            </section>

             {/* Seção 5 */}
             <section className="bg-gradient-to-br from-white/5 to-transparent p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg">
                <SectionHeader step="5" title="Finalização" desc="Parecer do profissional ou comentários extras não mapeados." />
                <div>
                   <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Outras Observações</label>
                   <textarea name="observacoes_gerais" value={formData.observacoes_gerais} onChange={handleChange} rows="4" className="w-full p-4 bg-white/80 dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white resize-y custom-scrollbar focus:ring-1 focus:ring-cyan-500" placeholder="Anotações finais..." />
                </div>
            </section>

            {/* BOTÃO FLUTUANTE DE SALVAR */}
            <div className="sticky bottom-0 mt-8 py-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-white/5 flex justify-end z-20">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-white transition-all bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-xl shadow-cyan-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : initialData?.id ? 'Atualizar Ficha' : 'Salvar Anamnese Adolescente/Infantil'}
              </button>
            </div>
        </form>
      </div>
    );
}
