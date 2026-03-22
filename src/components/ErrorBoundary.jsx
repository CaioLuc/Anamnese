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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl m-4 overflow-hidden">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
            💥 Ops! Ocorreu um erro interno na interface.
          </h2>
          <p className="text-sm text-red-500/80 mb-4">
            Em vez da tela ficar preta, capturamos o erro. Por favor, copie o texto abaixo e envie para o suporte/IA:
          </p>
          <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-xl overflow-auto text-xs font-mono text-red-700 dark:text-red-300 max-h-60">
            <strong>{this.state.error?.toString()}</strong>
            <br /><br />
            {this.state.errorInfo?.componentStack}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}
