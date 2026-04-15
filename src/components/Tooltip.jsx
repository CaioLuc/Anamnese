import { useState, useRef, useEffect } from 'react';

/**
 * Tooltip — Componente reutilizável de tooltip contextual.
 * Exibe informação de ajuda ao hover/focus no ícone de "?".
 *
 * Uso:
 *   <Tooltip text="Explicação do campo aqui...">
 *     <label>Meu Campo</label>
 *   </Tooltip>
 *
 * Ou com ícone automático:
 *   <Tooltip text="Explicação do campo" showIcon>
 *     <label>Meu Campo</label>
 *   </Tooltip>
 */
export default function Tooltip({ children, text, showIcon = false, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  // Fechar ao clicar fora (mobile)
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [visible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-zinc-800 dark:border-t-zinc-700 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 dark:border-b-zinc-700 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-zinc-800 dark:border-l-zinc-700 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-zinc-800 dark:border-r-zinc-700 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <span ref={containerRef} className="inline-flex items-center gap-1.5 relative">
      {children}
      {showIcon && (
        <button
          type="button"
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          onFocus={() => setVisible(true)}
          onBlur={() => setVisible(false)}
          onClick={() => setVisible(v => !v)}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors text-[10px] font-bold cursor-help shrink-0"
          aria-label="Mais informações"
        >
          ?
        </button>
      )}
      {visible && text && (
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[300] ${positionClasses[position]} pointer-events-none`}
        >
          <span className="block max-w-xs px-3 py-2 text-xs text-white bg-zinc-800 dark:bg-zinc-700 rounded-lg shadow-xl whitespace-normal leading-relaxed">
            {text}
          </span>
          <span className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
}
