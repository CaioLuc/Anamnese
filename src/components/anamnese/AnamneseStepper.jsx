import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

// Seção completa = todos os campos de texto/seleção preenchidos. Switches não contam: "não" também é resposta.
function secaoCompleta(secao) {
  const campos = secao.querySelectorAll('textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden])');
  return campos.length > 0 && [...campos].every((c) => c.value.trim() !== '');
}

/**
 * Stepper fixo das anamneses. A etapa ativa acompanha a rolagem (seções com id `{idPrefix}{i}`),
 * um marcador desliza até ela e etapas completas trocam o ícone por um check.
 */
export default function AnamneseStepper({ steps, active, onActiveChange, onSelect, progressKey, idPrefix = 'step-' }) {
  const botoesRef = useRef([]);
  const [completos, setCompletos] = useState([]);
  const [marcador, setMarcador] = useState({ x: 0, w: 0 });
  // Durante a rolagem disparada por um clique, a rolagem não decide a etapa: a última seção, curta,
  // nunca chega à faixa de ativação e o clique nela seria trocado pela penúltima
  const travadoRef = useRef(false);
  const selecionar = (i) => {
    travadoRef.current = true;
    const liberar = () => {
      travadoRef.current = false;
      clearTimeout(reserva);
      document.removeEventListener('scrollend', liberar, true);
    };
    // Sem rolagem (já está na seção) ou navegador sem `scrollend`: o tempo limite libera
    const reserva = setTimeout(liberar, 1500);
    document.addEventListener('scrollend', liberar, { capture: true, once: true });
    onSelect(i);
  };

  // Ativa a seção que cruza a faixa logo abaixo do stepper
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const secoes = steps.map((_, i) => document.getElementById(`${idPrefix}${i}`)).filter(Boolean);
    const observer = new IntersectionObserver((entradas) => {
      if (travadoRef.current) return;
      const visivel = entradas
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visivel) onActiveChange(Number(visivel.target.id.slice(idPrefix.length)));
    }, { rootMargin: '-20% 0px -70% 0px' });
    secoes.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [steps, onActiveChange, idPrefix]);

  // Lê o DOM depois de cada mudança do formulário: funciona igual para os dois formulários sem mapear campo a campo
  useEffect(() => {
    const quadro = requestAnimationFrame(() => {
      setCompletos(steps.map((_, i) => {
        const secao = document.getElementById(`${idPrefix}${i}`);
        return secao ? secaoCompleta(secao) : false;
      }));
    });
    return () => cancelAnimationFrame(quadro);
  }, [steps, progressKey, idPrefix]);

  useLayoutEffect(() => {
    const posicionar = () => {
      const botao = botoesRef.current[active];
      if (!botao) return;
      setMarcador({ x: botao.offsetLeft, w: botao.offsetWidth });
      const container = botao.parentElement;
      if (container && typeof container.scrollTo === 'function') {
        const left = Math.max(0, botao.offsetLeft - container.clientWidth / 2 + botao.offsetWidth / 2);
        container.scrollTo({ left, behavior: 'smooth' });
      }
    };
    posicionar();
    window.addEventListener('resize', posicionar);
    return () => window.removeEventListener('resize', posicionar);
  }, [active]);

  return (
    <nav
      aria-label="Etapas da anamnese"
      className="sticky top-0 z-30 pt-1.5 sm:pt-2 border-b -mx-1 px-1 sm:mx-0 sm:px-0"
      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
    >
      <div className="relative flex items-center gap-1 overflow-x-auto no-scrollbar pb-2.5 sm:pb-3 px-0.5">
        {steps.map((s, i) => {
          const ativo = active === i;
          const completo = completos[i];
          const Icone = completo ? Check : s.icon;
          return (
            <button
              key={s.key}
              ref={(el) => { botoesRef.current[i] = el; }}
              type="button"
              onClick={() => selecionar(i)}
              aria-current={ativo ? 'step' : undefined}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 min-h-[38px] sm:min-h-0 text-[11px] font-bold whitespace-nowrap rounded-lg transition-colors duration-200 hover:bg-[var(--bg-card)] shrink-0"
              style={{ color: ativo ? 'var(--accent)' : completo ? 'var(--status-success-text)' : 'var(--text-secondary)' }}
            >
              <Icone key={completo ? 'ok' : 'etapa'} size={14} className={`shrink-0 ${completo ? 'animate-in zoom-in' : ''}`} />
              <span>{s.label}</span>
              {completo && <span className="sr-only">(completa)</span>}
            </button>
          );
        })}
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-0 h-[3px] w-px origin-left rounded-full transition-transform duration-300 ease-out"
          style={{ backgroundColor: 'var(--accent)', transform: `translateX(${marcador.x}px) scaleX(${marcador.w})` }}
        />
      </div>
    </nav>
  );
}
