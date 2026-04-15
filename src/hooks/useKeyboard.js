import { useEffect, useRef } from 'react';

/**
 * useKeyboard — Hook para registrar atalhos de teclado globais.
 *
 * Uso:
 *   useKeyboard([
 *     { key: 'k', ctrl: true, action: () => openSearch() },
 *     { key: 'Escape', action: () => closeModal() },
 *     { key: 's', ctrl: true, action: () => saveForm() },
 *   ]);
 *
 * @param {Array} shortcuts — array de { key, ctrl?, shift?, action }
 * @param {boolean} enabled — se false, desabilita todos os atalhos
 */
export function useKeyboard(shortcuts, enabled = true) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      // Não interceptar quando estiver digitando em inputs/textareas
      // EXCETO para Escape e Ctrl+combinações
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      const hasModifier = e.ctrlKey || e.metaKey;

      for (const shortcut of shortcutsRef.current) {
        const matchKey = e.key === shortcut.key || e.key.toLowerCase() === shortcut.key?.toLowerCase();
        const matchCtrl = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const matchShift = shortcut.shift ? e.shiftKey : true;

        // Permitir Escape sempre; outros atalhos precisam de Ctrl ou não estar em input
        if (matchKey && matchCtrl && matchShift) {
          if (isInput && !hasModifier && shortcut.key !== 'Escape') continue;
          e.preventDefault();
          shortcut.action(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

/**
 * useEscapeKey — Convenience hook para fechar modais com Escape.
 *
 * Uso:
 *   useEscapeKey(isOpen, onClose);
 */
export function useEscapeKey(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
}
