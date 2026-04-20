/**
 * Card reutilizável com glassmorphism.
 * @param {'default'|'bordered'|'elevated'} variant
 */
export default function Card({ children, className = '', variant = 'default', ...props }) {
  const variants = {
    default: 'bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl',
    bordered: 'bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm',
    elevated: 'bg-white/60 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/5 rounded-2xl shadow-lg',
  };

  return (
    <div className={`${variants[variant] || variants.default} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Header de card com borda inferior.
 */
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-5 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] ${className}`}>
      {children}
    </div>
  );
}

/**
 * Body de card com padding padrão.
 */
export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}
