import { useEffect } from 'react';

/**
 * useUnsavedChanges — Avisa o usuário quando tenta sair da página com alterações não salvas.
 *
 * Uso:
 *   useUnsavedChanges(hasUnsavedData);
 *
 * @param {boolean} isDirty — true se existem alterações não salvas
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Você tem alterações não salvas. Deseja sair mesmo assim?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
