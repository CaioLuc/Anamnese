/**
 * Logger centralizado para o Caritas.
 * Em modo de desenvolvimento (npm run dev), imprime tudo normalmente.
 * Em produção (npm run build), silencia todos os logs para manter o console limpo.
 */

const isDev = import.meta.env.DEV;

const logger = {
  log: (...args) => { if (isDev) console.log(...args); },
  warn: (...args) => { if (isDev) console.warn(...args); },
  error: (...args) => { if (isDev) console.error(...args); },
  info: (...args) => { if (isDev) console.info(...args); },
};

export default logger;
