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
 * @param {Array} shortcuts — array de { key, ctrl?, shift?, alt?, action }
 * @param {boolean} enabled — se false, desabilita todos os atalhos
 */
export function useKeyboard(shortcuts, enabled = true) {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; });

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
        // Modificadores estritos: Ctrl+Shift+S não dispara o atalho Ctrl+S
        const matchShift = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const matchAlt = shortcut.alt ? e.altKey : !e.altKey;

        // Permitir Escape sempre; outros atalhos precisam de Ctrl ou não estar em input
        if (matchKey && matchCtrl && matchShift && matchAlt) {
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

// Pilha de handlers de Escape ativos: só o modal aberto mais recentemente fecha
const escapeStack = [];

function handleEscape(e) {
  const top = escapeStack[escapeStack.length - 1];
  if (e.key !== 'Escape' || !top) return;
  // Esc dentro de textarea/contentEditable não fecha o modal (evita perder o texto)
  if (e.target?.tagName === 'TEXTAREA' || e.target?.isContentEditable) return;
  e.stopPropagation();
  top.current();
}

/**
 * useEscapeKey — Convenience hook para fechar modais com Escape.
 *
 * Uso:
 *   useEscapeKey(isOpen, onClose);
 */
export function useEscapeKey(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  // Depende só de isOpen: callbacks inline não reordenam a pilha a cada render
  useEffect(() => {
    if (!isOpen) return;
    escapeStack.push(onCloseRef);
    if (escapeStack.length === 1) window.addEventListener('keydown', handleEscape);
    return () => {
      escapeStack.splice(escapeStack.indexOf(onCloseRef), 1);
      if (escapeStack.length === 0) window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);
}
