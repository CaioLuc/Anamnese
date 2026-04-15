import { useEscapeKey } from '../hooks/useKeyboard';

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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        
        {/* Ícone */}
        <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDanger ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
          {isDanger ? (
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        {/* Texto */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed mb-6">{message}</p>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white transition-all shadow-lg ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {confirmText || (isDanger ? 'Sim, apagar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
