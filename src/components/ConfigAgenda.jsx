import { useState, useEffect } from 'react';
import { salvarConfigAgenda, lerConfigAgenda, verificarSlugDisponivel } from '../services/agendaService';
import Button from './ui/Button';
import { Check, X } from 'lucide-react';

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
        <svg className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24">
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
          <h1 className="text-2xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Configurar Agenda Pública</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Defina seus horários e gere um link para seus pacientes agendarem online.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
      </div>

      {/* Link Público */}
      <div className="ds-card p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h3 className="text-sm font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Link Público</h3>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Seu slug (URL personalizada)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
              <span className="px-3 text-xs py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>/agendar/</span>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="dra-maria"
                className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            {slugStatus === 'checking' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Verificando...</span>}
            {slugStatus === 'ok' && <span className="text-xs font-semibold" style={{ color: 'var(--status-success)' }}>✓ Disponível</span>}
            {slugStatus === 'taken' && <span className="text-xs font-semibold" style={{ color: 'var(--status-danger)' }}>✗ Em uso</span>}
          </div>
        </div>

        {publicUrl && slugStatus === 'ok' && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
            <span className="text-xs truncate flex-1 font-mono" style={{ color: 'var(--accent)' }}>{publicUrl}</span>
            <Button size="sm" onClick={handleCopy}>
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome Público</label>
            <input
              type="text"
              value={nomePublico}
              onChange={e => setNomePublico(e.target.value)}
              placeholder="Dra. Maria Silva"
              className="ds-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Especialidade / CRP</label>
            <input
              type="text"
              value={especialidade}
              onChange={e => setEspecialidade(e.target.value)}
              placeholder="Psicóloga Clínica - CRP 05/12345"
              className="ds-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Duração da sessão (min)</label>
            <input
              type="number" min="15" max="180" step="5"
              value={duracaoPadrao}
              onChange={e => setDuracaoPadrao(Number(e.target.value))}
              className="ds-input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Valor da consulta (R$)</label>
            <input
              type="text"
              value={valorConsulta}
              onChange={e => setValorConsulta(e.target.value)}
              placeholder="150,00"
              className="ds-input"
            />
          </div>
        </div>
      </div>

      {/* Horários de Trabalho */}
      <div className="ds-card p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h3 className="text-sm font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Horários de Atendimento</h3>
        <div className="space-y-2">
          {DIAS.map(dia => {
            const d = dias[dia.id];
            return (
              <div 
                key={dia.id} 
                className={`flex items-center gap-3 p-3 rounded-xl transition-all`}
                style={{ 
                    backgroundColor: d.ativo ? 'var(--bg-secondary)' : 'transparent',
                    border: `0.5px solid ${d.ativo ? 'var(--border)' : 'transparent'}`,
                    opacity: d.ativo ? 1 : 0.5
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleDia(dia.id)}
                  className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0`}
                  style={{ backgroundColor: d.ativo ? 'var(--accent)' : 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
                >
                  <span 
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-all duration-200 ${d.ativo ? 'translate-x-4' : 'translate-x-0'}`} 
                    style={{ backgroundColor: '#FFFFFF' }}
                  />
                </button>
                <span className="text-sm font-medium w-20" style={{ color: 'var(--text-primary)' }}>{dia.label}</span>
                {d.ativo && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="time" value={d.inicio} onChange={e => updateDia(dia.id, 'inicio', e.target.value)}
                      className="ds-input py-1.5 px-2 text-xs" />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>até</span>
                    <input type="time" value={d.fim} onChange={e => updateDia(dia.id, 'fim', e.target.value)}
                      className="ds-input py-1.5 px-2 text-xs" />
                    <span className="text-[10px] mx-1" style={{ color: 'var(--text-muted)' }}>Intervalo:</span>
                    <input type="time" value={d.intervalo_inicio} onChange={e => updateDia(dia.id, 'intervalo_inicio', e.target.value)}
                      className="ds-input py-1.5 px-2 text-xs" />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                    <input type="time" value={d.intervalo_fim} onChange={e => updateDia(dia.id, 'intervalo_fim', e.target.value)}
                      className="ds-input py-1.5 px-2 text-xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
        {saved && <span className="text-sm font-semibold animate-in fade-in flex items-center gap-1" style={{ color: 'var(--status-success)' }}><Check size={16} /> Salvo com sucesso!</span>}
      </div>
    </div>
  );
}
