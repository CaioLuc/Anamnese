import { useId } from 'react';
import { useEscapeKey } from '../hooks/useKeyboard';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

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
 *   isLoading {boolean}  - Desabilita os botões enquanto a ação roda
 */
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, variant = 'danger', confirmText, isLoading = false }) {
  const tituloId = useId();
  const cancelar = () => { if (!isLoading && onCancel) onCancel(); };
  useEscapeKey(isOpen, cancelar);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const Icone = isDanger ? Trash2 : AlertTriangle;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay)' }} onClick={cancelar}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="ds-card relative w-full max-w-sm p-6 animate-in"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: isDanger ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)', color: isDanger ? 'var(--status-danger)' : 'var(--status-warning)' }}
        >
          <Icone size={20} />
        </div>

        <h3 id={tituloId} className="text-lg font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>

        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          <button onClick={cancelar} disabled={isLoading} className="ds-btn ds-btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`ds-btn flex-1 ${isDanger ? 'ds-btn-danger' : 'ds-btn-primary'}`}
            autoFocus
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {confirmText || (isDanger ? 'Sim, apagar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
