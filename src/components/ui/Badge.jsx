/**
 * Badge/Pill reutilizável para status.
 * @param {'success'|'danger'|'warning'|'info'|'neutral'} variant
 * @param {'sm'|'md'} size
 */
export default function Badge({ children, variant = 'neutral', size = 'sm', className = '' }) {
  const baseClasses = "ds-badge";
  
  const variantClasses = {
    success: 'ds-badge-success',
    danger: 'ds-badge-danger',
    warning: 'ds-badge-warning',
    info: '',
    neutral: '', // fallback to default ds-badge colors
  };

  const styles = {
    neutral: {
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)'
    }
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const customStyle = variant === 'neutral' ? styles.neutral : variant === 'info' ? { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info-text)' } : {};

  return (
    <span 
      className={`${baseClasses} max-w-full truncate ${variantClasses[variant] || ''} ${sizes[size] || sizes.sm} ${className}`}
      style={customStyle}
    >
      {children}
    </span>
  );
}
