import { useToast } from '../contexts/ToastContext';
import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICON_MAP = {
  success: <CheckCircle size={18} style={{ color: 'var(--status-success)' }} />,
  error: <AlertCircle size={18} style={{ color: 'var(--status-danger)' }} />,
  warning: <AlertTriangle size={18} style={{ color: 'var(--status-warning)' }} />,
  info: <Info size={18} style={{ color: 'var(--status-info)' }} />,
};

const STYLE_MAP = {
  success: { backgroundColor: 'var(--status-success-bg)', borderColor: 'var(--status-success)' },
  error: { backgroundColor: 'var(--status-danger-bg)', borderColor: 'var(--status-danger)' },
  warning: { backgroundColor: 'var(--status-warning-bg)', borderColor: 'var(--status-warning)' },
  info: { backgroundColor: 'var(--status-info-bg)', borderColor: 'var(--status-info)' },
};

function ToastItem({ toast, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in
    const timer = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const styles = STYLE_MAP[toast.type] || STYLE_MAP.info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg max-w-sm w-full transition-all duration-200 ease-out ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
      style={{ 
        ...styles, 
        border: `1px solid ${styles.borderColor}`,
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Icon */}
      <span className="shrink-0 mt-0.5">{ICON_MAP[toast.type] || ICON_MAP.info}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
          {toast.message}
        </p>
        {toast.action && (
          <button
            onClick={() => { toast.action.onClick(); handleRemove(); }}
            className="mt-2 text-xs font-semibold transition-colors duration-150"
            style={{ color: 'var(--accent)' }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleRemove}
        className="shrink-0 p-0.5 transition-colors duration-150"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * ToastContainer — Renderiza a lista global de toasts.
 * Deve ser colocado no nível mais alto da aplicação (dentro do ToastProvider).
 */
export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}
