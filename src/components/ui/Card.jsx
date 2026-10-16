/**
 * Card reutilizável.
 */
export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`ds-card ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Header de card com borda inferior.
 */
export function CardHeader({ children, className = '' }) {
  return (
    <div 
      className={`px-4 py-3.5 sm:px-5 sm:py-4 ${className}`}
      style={{ 
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Body de card com padding padrão.
 */
export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}
