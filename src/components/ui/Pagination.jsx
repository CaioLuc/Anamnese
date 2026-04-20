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
    <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-white/5 sm:px-6">
      {/* Mobile: simple prev/next */}
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 dark:bg-zinc-800 dark:border-white/10 dark:text-slate-300"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 dark:bg-zinc-800 dark:border-white/10 dark:text-slate-300"
        >
          Próximo
        </button>
      </div>

      {/* Desktop: full pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
            <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de{' '}
            <span className="font-medium">{totalItems}</span> {itemLabel}
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-white/10 dark:hover:bg-zinc-800"
            >
              <span className="sr-only">Anterior</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            {getVisiblePages().map((item, idx) =>
              item.type === 'ellipsis' ? (
                <span key={`e-${item.value}`} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-white/10">
                  ...
                </span>
              ) : (
                <button
                  key={item.value}
                  onClick={() => onPageChange(item.value)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === item.value
                      ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                      : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.value}
                </button>
              )
            )}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-white/10 dark:hover:bg-zinc-800"
            >
              <span className="sr-only">Próximo</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
