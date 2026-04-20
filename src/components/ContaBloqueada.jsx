import { logoutFirebaseUser } from '../services/authService';
import { Ban, Mail, LogOut } from 'lucide-react';

export default function ContaBloqueada() {
  return (
    <div className="h-full w-full flex flex-col justify-center items-center p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      
      <div className="max-w-md w-full text-center">
        <div 
          className="w-16 h-16 mx-auto mb-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--status-danger-bg)' }}
        >
          <Ban size={28} style={{ color: 'var(--status-danger)' }} />
        </div>
        
        <h1 className="text-2xl font-heading font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Conta Inativa
        </h1>
        <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Sua conta no Caritas ainda não foi ativada ou foi temporariamente desabilitada pelo administrador. 
          Entre em contato com o suporte para regularizar seu acesso.
        </p>

        <div className="ds-card p-5 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Mail size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Contato</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Entre em contato com o administrador do sistema</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => logoutFirebaseUser()}
          className="ds-btn ds-btn-secondary gap-2 px-6 py-2.5"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  );
}
