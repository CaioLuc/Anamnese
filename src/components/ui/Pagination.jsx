import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente reutilizável de paginação.
 * Exibe controles de navegação com indicador de range e botões de página.
 *
 * @param {number} currentPage - Página atual (1-indexed)
 * @param {number} totalPages - Total de páginas
 * @param {number} totalItems - Total de itens
 * @param {number} startIndex - Índice inicial do range atual (0-indexed)
 * @param {number} itemsPerPage - Itens por página
 * @param {Function} onPageChange - Callback (pageNumber) => void
 * @param {string} itemLabel - Label para os itens (ex: "pacientes", "sessões")
 */
export default function Pagination({ currentPage, totalPages, totalItems, startIndex, itemsPerPage, onPageChange, itemLabel = 'itens' }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push({ type: 'page', value: i });
      } else if (
        i === currentPage - 2 ||
        i === currentPage + 2
      ) {
        pages.push({ type: 'ellipsis', value: i });
      }
    }
    return pages;
  };

  return (
    <div 
      className="flex items-center justify-between px-4 py-3 sm:px-6"
      style={{ borderTop: '0.5px solid var(--border)' }}
    >
      {/* Mobile: simple prev/next */}
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="ds-btn ds-btn-secondary py-1.5"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="ds-btn ds-btn-secondary py-1.5 ml-3"
        >
          Próximo
        </button>
      </div>

      {/* Desktop: full pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Mostrando <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</span> a{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.min(startIndex + itemsPerPage, totalItems)}</span> de{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{totalItems}</span> {itemLabel}
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-md" style={{ boxShadow: 'var(--shadow)' }} aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 focus:z-20 disabled:opacity-50 transition-colors duration-150"
              style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <span className="sr-only">Anterior</span>
              <ChevronLeft size={18} />
            </button>
            {getVisiblePages().map((item, idx) =>
              item.type === 'ellipsis' ? (
                <span 
                  key={`e-${item.value}`} 
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={item.value}
                  onClick={() => onPageChange(item.value)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors duration-150`}
                  style={{
                    border: '0.5px solid var(--border)',
                    backgroundColor: currentPage === item.value ? 'var(--accent)' : 'var(--bg-card)',
                    color: currentPage === item.value ? '#FFFFFF' : 'var(--text-primary)',
                    zIndex: currentPage === item.value ? 10 : 1,
                  }}
                >
                  {item.value}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 focus:z-20 disabled:opacity-50 transition-colors duration-150"
              style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <span className="sr-only">Próximo</span>
              <ChevronRight size={18} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
