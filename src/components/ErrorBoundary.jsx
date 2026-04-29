import logger from '../utils/logger';
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-10 m-4 text-center">
          <div 
            className="w-16 h-16 mb-6 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--status-danger-bg)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--status-danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-heading font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Ops! Algo deu errado.
          </h2>
          <p className="text-sm max-w-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Ocorreu um erro inesperado na interface. Não se preocupe, seus dados salvos anteriormente estão seguros. Tente recarregar a página ou clique no botão abaixo.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="ds-btn ds-btn-primary px-5 py-2.5"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="ds-btn ds-btn-secondary px-5 py-2.5"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
