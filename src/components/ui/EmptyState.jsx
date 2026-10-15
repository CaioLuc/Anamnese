import { createElement } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState reutilizável (Ponytail style).
 * Exibe mensagem amigável quando listas ou consultas retornam vazio
 * e, quando houver, a próxima ação que resolve o vazio.
 */
export default function EmptyState({
  icon = Inbox,
  title = "Nenhum registro encontrado",
  description = "Comece criando um novo registro para visualizar aqui.",
  actionLabel,
  onAction,
  className = ""
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-10 text-center rounded-[var(--radius)] ${className}`}
      style={{ border: '1px dashed var(--border-strong)', backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="w-12 h-12 mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
        {icon ? createElement(icon, { size: 22, strokeWidth: 1.8 }) : null}
      </div>
      <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h4>
      {description && (
        <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
