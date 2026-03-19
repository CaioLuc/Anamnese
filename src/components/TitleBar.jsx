import { useTheme } from '../contexts/ThemeContext';

export default function TitleBar() {
  const { theme } = useTheme();

  const handleMinimize = () => {
    if (window.api && window.api.windowMinimize) window.api.windowMinimize();
  };

  const handleMaximize = () => {
    if (window.api && window.api.windowMaximize) window.api.windowMaximize();
  };

  const handleClose = () => {
    if (window.api && window.api.windowClose) window.api.windowClose();
  };

  return (
    <div 
      className="w-full h-8 flex items-center justify-between bg-zinc-100 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-white/5 select-none z-[9999]"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center pl-3">
        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300 tracking-wide flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          PsycoBrain
        </span>
      </div>

      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          onClick={handleMinimize} 
          className="h-full px-4 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center"
          title="Minimizar"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button 
          onClick={handleMaximize} 
          className="h-full px-4 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center"
          title="Maximizar"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={2} />
          </svg>
        </button>
        <button 
          onClick={handleClose} 
          className="h-full px-4 text-slate-600 dark:text-slate-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
          title="Fechar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
