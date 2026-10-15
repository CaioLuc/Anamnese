/**
 * Botão reutilizável com variantes visuais.
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled = false, ...props }) {
  const base = 'ds-btn disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'ds-btn-primary',
    secondary: 'ds-btn-secondary',
    danger: 'ds-btn-danger',
    ghost: 'ds-btn-ghost',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[13px] gap-1.5 min-h-[34px]',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-[15px] gap-2.5 min-h-[48px]',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
