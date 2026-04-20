import { useEscapeKey } from '../hooks/useKeyboard';
import { Trash2, AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog - Modal de confirmação estilizado no padrão do app.
 * Substitui o window.confirm() nativo do sistema operacional.
 *
 * Props:
 *   isOpen    {boolean}  - Mostra ou esconde o dialog
 *   title     {string}   - Título do aviso
 *   message   {string}   - Mensagem de descrição
 *   onConfirm {function} - Callback ao confirmar
 *   onCancel  {function} - Callback ao cancelar
 *   variant   {string}   - 'danger' (padrão) ou 'warning'
 *   confirmText {string} - Texto customizado do botão confirmar
 */
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, variant = 'danger', confirmText }) {
  useEscapeKey(isOpen, onCancel || (() => {}));

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay)' }}>
      <div className="ds-card relative w-full max-w-sm p-6" style={{ backgroundColor: 'var(--bg-card)' }}>
        
        {/* Ícone */}
        <div 
          className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-4"
          style={{ backgroundColor: isDanger ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)' }}
        >
          {isDanger ? (
            <Trash2 size={22} style={{ color: 'var(--status-danger)' }} />
          ) : (
            <AlertTriangle size={22} style={{ color: 'var(--status-warning)' }} />
          )}
        </div>

        {/* Texto */}
        <h3 className="text-base font-heading font-semibold text-center mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm text-center leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="ds-btn ds-btn-secondary flex-1 py-2.5"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`ds-btn flex-1 py-2.5 text-white`}
            style={{ backgroundColor: isDanger ? 'var(--status-danger)' : 'var(--status-warning)' }}
          >
            {confirmText || (isDanger ? 'Sim, apagar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
