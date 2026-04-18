import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import ToastContainer from './components/ToastContainer'

// ==========================================
// FORCE RELOAD DIÁRIO — garante bundle atualizado
// ==========================================
;(() => {
  const hoje = new Date().toISOString().slice(0, 10); // "2026-04-17"
  const chave = '__caritas_last_reload__';
  const ultimo = localStorage.getItem(chave);
  if (ultimo !== hoje) {
    localStorage.setItem(chave, hoje);
    // Só recarrega se já tinha um valor anterior (evita loop na primeira visita absoluta)
    if (ultimo) {
      window.location.reload();
      return; // não renderiza React, a página vai recarregar
    }
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
