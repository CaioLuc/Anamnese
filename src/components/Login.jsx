import { useState } from 'react';
import { loginFirebaseUser } from '../services/authService';
import { Mail, Lock, AlertCircle, Shield } from 'lucide-react';
import Button from './ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await loginFirebaseUser(email, password);
      // App.jsx is listening to auth events, so it will unmount this automatically.
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha inválidos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError('Erro ao fazer login. Verifique sua conexão.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-full w-full flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center flex-col items-center">
          
          {/* Logo */}
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
            style={{ backgroundColor: 'var(--accent)', boxShadow: 'var(--shadow)' }}
          >
            <Shield size={32} style={{ color: '#FFFFFF' }} />
          </div>
          
          <h2 className="text-center text-3xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Caritas</h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Plataforma Inteligente para Terapeutas</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="ds-card py-8 px-4 sm:px-10" style={{ backgroundColor: 'var(--bg-card)' }}>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'var(--status-danger-bg)', border: '0.5px solid var(--status-danger)' }}>
               <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
               <p className="text-sm font-medium" style={{ color: 'var(--status-danger)' }}>{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço de e-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ds-input pl-10 py-2.5"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ds-input pl-10 py-2.5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3"
              >
                {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
              </Button>
            </div>
            
            <p className="text-center text-xs pt-4" style={{ color: 'var(--text-muted)' }}>
              Protegido por Criptografia End-to-End no Firebase
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
