import { createElement } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState reutilizável (Ponytail style).
 * Exibe mensagem amigável quando listas ou consultas retornam vazio.
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
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 ${className}`}>
      <div className="w-12 h-12 mb-3 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500">
        {icon ? createElement(icon, { size: 24, strokeWidth: 1.75 }) : null}
      </div>
      <h4 className="text-base font-heading font-medium text-slate-800 dark:text-slate-100 mb-1">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
