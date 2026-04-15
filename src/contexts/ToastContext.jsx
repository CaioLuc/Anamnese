import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext();

let toastIdCounter = 0;

/**
 * ToastProvider — Gerencia uma fila global de notificações toast.
 *
 * Uso em qualquer componente:
 *   const { showToast } = useToast();
 *   showToast({ type: 'success', message: 'Salvo!' });
 *   showToast({ type: 'error', message: 'Falha.', action: { label: 'Tentar novamente', onClick: retry } });
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', message, action, duration }) => {
    const id = ++toastIdCounter;
    const defaultDuration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 5000;
    const timeout = duration || defaultDuration;

    setToasts(prev => {
      // Limita a 4 toasts visíveis
      const updated = prev.length >= 4 ? prev.slice(1) : prev;
      return [...updated, { id, type, message, action, createdAt: Date.now() }];
    });

    timersRef.current[id] = setTimeout(() => removeToast(id), timeout);

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback para componentes fora do provider (ex: AgendaPublica)
    return {
      showToast: ({ message }) => console.warn('[Toast fallback]:', message),
      removeToast: () => {},
      toasts: []
    };
  }
  return ctx;
}
