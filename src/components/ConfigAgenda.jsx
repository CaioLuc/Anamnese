import { useState, useEffect } from 'react';
import { salvarConfigAgenda, lerConfigAgenda, verificarSlugDisponivel } from '../services/agendaService';

const DIAS = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça' },
  { id: 'qua', label: 'Quarta' },
  { id: 'qui', label: 'Quinta' },
  { id: 'sex', label: 'Sexta' },
  { id: 'sab', label: 'Sábado' },
];

const defaultDia = { ativo: false, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' };

export default function ConfigAgenda({ onClose }) {
  const [slug, setSlug] = useState('');
  const [nomePublico, setNomePublico] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [duracaoPadrao, setDuracaoPadrao] = useState(50);
  const [valorConsulta, setValorConsulta] = useState('');
  const [dias, setDias] = useState(
    Object.fromEntries(DIAS.map(d => [d.id, { ...defaultDia, ativo: d.id !== 'sab' }]))
  );
  const [slugStatus, setSlugStatus] = useState(''); // 'ok', 'taken', 'checking', ''
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const config = await lerConfigAgenda();
        if (config) {
          setSlug(config.slug || '');
          setNomePublico(config.nome_publico || '');
          setEspecialidade(config.especialidade || '');
          setDuracaoPadrao(config.duracao_padrao || 50);
          setValorConsulta(config.valor_consulta || '');
          if (config.dias) setDias(prev => ({ ...prev, ...config.dias }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Slug validation
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugStatus(''); return; }
    const timer = setTimeout(async () => {
      setSlugStatus('checking');
      try {
        const available = await verificarSlugDisponivel(slug);
        setSlugStatus(available ? 'ok' : 'taken');
      } catch {
        setSlugStatus('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const handleSlugChange = (val) => {
    // Normalizar: só lowercase, letras, números e hifens
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    setSlug(cleaned);
  };

  const toggleDia = (diaId) => {
    setDias(prev => ({ ...prev, [diaId]: { ...prev[diaId], ativo: !prev[diaId].ativo } }));
  };

  const updateDia = (diaId, field, value) => {
    setDias(prev => ({ ...prev, [diaId]: { ...prev[diaId], [field]: value } }));
  };

  const handleSave = async () => {
    if (!slug || slug.length < 3) return alert('O slug precisa ter pelo menos 3 caracteres.');
    if (slugStatus === 'taken') return alert('Este slug já está em uso. Escolha outro.');
    if (!nomePublico) return alert('Preencha o nome público.');

    setIsSaving(true);
    try {
      await salvarConfigAgenda({
        slug,
        nome_publico: nomePublico,
        especialidade,
        duracao_padrao: duracaoPadrao,
        valor_consulta: valorConsulta,
        dias,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar: ' + (e.message || 'Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = slug ? `${window.location.origin}/agendar/${slug}` : '';

  const handleCopy = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Configurar Agenda Pública</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Defina seus horários e gere um link para seus pacientes agendarem online.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Link Público */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Link Público</h3>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Seu slug (URL personalizada)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center border border-slate-300 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-950">
              <span className="px-3 text-xs text-slate-400 bg-slate-100 dark:bg-zinc-800 py-2.5 border-r border-slate-300 dark:border-white/10 whitespace-nowrap">/agendar/</span>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="dra-maria"
                className="flex-1 px-3 py-2.5 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none"
              />
            </div>
            {slugStatus === 'checking' && <span className="text-xs text-slate-400">Verificando...</span>}
            {slugStatus === 'ok' && <span className="text-xs text-emerald-400 font-semibold">✓ Disponível</span>}
            {slugStatus === 'taken' && <span className="text-xs text-red-400 font-semibold">✗ Em uso</span>}
          </div>
        </div>

        {publicUrl && slugStatus === 'ok' && (
          <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <span className="text-xs text-indigo-400 truncate flex-1 font-mono">{publicUrl}</span>
            <button onClick={handleCopy} className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors">
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nome Público</label>
            <input
              type="text"
              value={nomePublico}
              onChange={e => setNomePublico(e.target.value)}
              placeholder="Dra. Maria Silva"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Especialidade / CRP</label>
            <input
              type="text"
              value={especialidade}
              onChange={e => setEspecialidade(e.target.value)}
              placeholder="Psicóloga Clínica - CRP 05/12345"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Duração da sessão (min)</label>
            <input
              type="number" min="15" max="180" step="5"
              value={duracaoPadrao}
              onChange={e => setDuracaoPadrao(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Valor da consulta (R$)</label>
            <input
              type="text"
              value={valorConsulta}
              onChange={e => setValorConsulta(e.target.value)}
              placeholder="150,00"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Horários de Trabalho */}
      <div className="bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Horários de Atendimento</h3>
        <div className="space-y-2">
          {DIAS.map(dia => {
            const d = dias[dia.id];
            return (
              <div key={dia.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${d.ativo ? 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10' : 'bg-slate-100/50 dark:bg-zinc-950/50 border-transparent opacity-50'}`}>
                <button
                  type="button"
                  onClick={() => toggleDia(dia.id)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${d.ativo ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${d.ativo ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-20">{dia.label}</span>
                {d.ativo && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="time" value={d.inicio} onChange={e => updateDia(dia.id, 'inicio', e.target.value)}
                      className="px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white" />
                    <span className="text-xs text-slate-400">até</span>
                    <input type="time" value={d.fim} onChange={e => updateDia(dia.id, 'fim', e.target.value)}
                      className="px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white" />
                    <span className="text-[10px] text-slate-400 mx-1">Intervalo:</span>
                    <input type="time" value={d.intervalo_inicio} onChange={e => updateDia(dia.id, 'intervalo_inicio', e.target.value)}
                      className="px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white" />
                    <span className="text-xs text-slate-400">-</span>
                    <input type="time" value={d.intervalo_fim} onChange={e => updateDia(dia.id, 'intervalo_fim', e.target.value)}
                      className="px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
        {saved && <span className="text-sm text-emerald-400 font-semibold animate-in fade-in">✓ Salvo com sucesso!</span>}
      </div>
    </div>
  );
}
