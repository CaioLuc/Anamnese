import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

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

  const positionStyles = {
    top: 'bottom-full left-0 mb-2',
    bottom: 'top-full left-0 mt-2',
    left: 'right-full top-0 mr-2',
    right: 'left-full top-0 ml-2',
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
          className="inline-flex items-center justify-center w-5 h-5 rounded-full cursor-help shrink-0 transition-colors duration-150"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          aria-label="Mais informações"
        >
          <HelpCircle size={12} />
        </button>
      )}
      {visible && text && (
        <span
          role="tooltip"
          className={`absolute z-[300] ${positionStyles[position]} pointer-events-none`}
          style={{ width: '280px' }}
        >
          <span
            className="block w-full px-4 py-3 text-[13px] rounded-lg leading-relaxed"
            style={{ 
              backgroundColor: 'var(--bg-sidebar)', 
              color: '#E6EDF3',
              boxShadow: 'var(--shadow)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              wordBreak: 'normal', 
              overflowWrap: 'break-word', 
              whiteSpace: 'normal' 
            }}
          >
            {text}
          </span>
        </span>
      )}
    </span>
  );
}
