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
    info: '', // fallback to default ds-badge colors
    neutral: '', // fallback to default ds-badge colors
  };

  const styles = {
    neutral: {
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-secondary)',
      border: '0.5px solid var(--border)'
    }
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const customStyle = variant === 'neutral' ? styles.neutral : {};

  return (
    <span 
      className={`${baseClasses} ${variantClasses[variant] || ''} ${sizes[size] || sizes.sm} ${className}`}
      style={customStyle}
    >
      {children}
    </span>
  );
}
