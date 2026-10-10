import { useState, useEffect } from 'react';
import { 
  loginFirebaseUser, 
  cadastrarFirebaseUser,
  logoutFirebaseUser,
  redefinirSenhaFirebase, 
  isDispositivoConfiavel, 
  salvarDispositivoConfiavel,
  marcarSessao2FAVerificada,
  gerarCodigo2FA, 
  verificarCodigo2FA,
  obterCodigo2FAAtivo
} from '../services/authService';
import { Mail, Lock, AlertCircle, ShieldCheck, CheckCircle2, KeyRound, Laptop, ArrowLeft, RefreshCw, User, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import logo from '../assets/logo.svg';
import { salvarPerfilPsicologo } from '../services/patientService';

export default function Login({ pending2FAUser, on2FASuccess }) {
  const [email, setEmail] = useState(pending2FAUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos fluxos ('login' | 'cadastro' | '2fa' | 'recuperar_senha')
  const [viewState, setViewState] = useState(pending2FAUser ? '2fa' : 'login');

  // Estados do 2FA
  const [codigo2FA, setCodigo2FA] = useState('');
  const [lembrarMaquina, setLembrarMaquina] = useState(false);
  const [codigoExibido, setCodigoExibido] = useState('');

  // Estados do Redefinidor de Senha
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Inicializa 2FA caso venha de pending2FAUser
  useEffect(() => {
    if (pending2FAUser?.email) {
      setEmail(pending2FAUser.email);
      setViewState('2fa');
      const cod = obterCodigo2FAAtivo(pending2FAUser.email) || gerarCodigo2FA(pending2FAUser.email);
      setCodigoExibido(cod);
    }
  }, [pending2FAUser]);

  // Submissão do login inicial
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const emailLimpo = email.trim().toLowerCase();

    try {
      await loginFirebaseUser(emailLimpo, password);

      // Verifica se a máquina já é confiável
      if (isDispositivoConfiavel(emailLimpo)) {
        marcarSessao2FAVerificada(emailLimpo);
        if (on2FASuccess) on2FASuccess();
        return;
      }

      // Máquina não confiável: gera código e transiciona para o 2FA
      const novoCodigo = gerarCodigo2FA(emailLimpo);
      setCodigoExibido(novoCodigo);
      setViewState('2fa');
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

  // Submissão do cadastro de nova conta (14 dias de teste)
  const handleCadastro = async (e) => {
    e.preventDefault();
    setError('');

    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cadastrarFirebaseUser(emailLimpo, password);
      // Salva nome inicial no perfil se preenchido
      if (nomeCadastro && nomeCadastro.trim()) {
        try {
          await salvarPerfilPsicologo({ nome: nomeCadastro.trim() });
        } catch {}
      }

      // Máquina do cadastro: marca como confiável ou gera 2FA
      const novoCodigo = gerarCodigo2FA(emailLimpo);
      setCodigoExibido(novoCodigo);
      setViewState('2fa');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta cadastrada. Faça login.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Endereço de e-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Utilize letras, números e no mínimo 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Tente novamente mais tarde.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submissão da Verificação em Duas Etapas (2FA)
  const handleVerificar2FA = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const emailAlvo = email.trim().toLowerCase();

    try {
      const res = await verificarCodigo2FA(emailAlvo, codigo2FA, lembrarMaquina);
      if (res.success) {
        if (lembrarMaquina) {
          salvarDispositivoConfiavel(emailAlvo);
        }
        marcarSessao2FAVerificada(emailAlvo);
        if (on2FASuccess) on2FASuccess();
      } else {
        setError(res.error || 'Código de verificação incorreto.');
      }
    } catch (err) {
      setError('Erro ao validar código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reenviar código 2FA
  const handleReenviarCodigo = () => {
    const emailAlvo = email.trim().toLowerCase();
    const novo = gerarCodigo2FA(emailAlvo);
    setCodigoExibido(novo);
    setCodigo2FA('');
    setError('');
  };

  // Cancelar 2FA e deslogar
  const handleCancelar2FA = async () => {
    await logoutFirebaseUser();
    setViewState('login');
    setPassword('');
    setCodigo2FA('');
    setError('');
  };

  // Redefinir Senha
  const handleSolicitarRedefinicao = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setIsSendingReset(true);

    try {
      await redefinirSenhaFirebase(resetEmail || email);
      setResetSuccess(`Link de redefinição enviado com sucesso para ${resetEmail || email}! Verifique sua caixa de entrada e spam.`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Nenhuma conta encontrada com este e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError('Falha ao enviar e-mail. Tente novamente.');
      }
    } finally {
      setIsSendingReset(false);
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
          <div className="w-24 h-24 mb-3 flex items-center justify-center relative login-logo">
            <div className="login-logo-glow" />
            <img src={logo} alt="Caritas Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          
          <h2 className="text-center text-3xl font-heading font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Caritas</h2>
          <p className="mt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Plataforma Clínica para Psicólogos e Clínicas</p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="ds-card py-8 px-4 sm:px-10 shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          
          {/* Feedback de Erro */}
          {error && (
            <div className="mb-5 p-4 rounded-xl flex items-start gap-3 animate-in fade-in" style={{ backgroundColor: 'var(--status-danger-bg)', border: '0.5px solid var(--status-danger)' }}>
               <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--status-danger)' }} />
               <p className="text-sm font-medium" style={{ color: 'var(--status-danger)' }}>{error}</p>
            </div>
          )}

          {/* Feedback de Sucesso no Reset */}
          {resetSuccess && (
            <div className="mb-5 p-4 rounded-xl flex items-start gap-3 animate-in fade-in" style={{ backgroundColor: 'var(--status-success-bg)', border: '0.5px solid var(--status-success)' }}>
               <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--status-success)' }} />
               <p className="text-sm font-medium" style={{ color: 'var(--status-success)' }}>{resetSuccess}</p>
            </div>
          )}

          {/* Abas Alternadoras (Login / Cadastro) */}
          {(viewState === 'login' || viewState === 'cadastro') && (
            <div className="flex border-b border-[var(--border)] mb-5">
              <button
                type="button"
                onClick={() => {
                  setViewState('login');
                  setError('');
                }}
                className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 ${
                  viewState === 'login'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewState('cadastro');
                  setError('');
                }}
                className={`flex-1 pb-3 text-center text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  viewState === 'cadastro'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Sparkles size={14} className="text-amber-500" />
                Criar Conta (14d grátis)
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISTA 1: FORMULÁRIO DE LOGIN NORMAL                      */}
          {/* ======================================================== */}
          {viewState === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço de e-mail</label>
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
                    placeholder="psicologo@clinica.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Senha</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setError('');
                      setResetSuccess('');
                      setViewState('recuperar_senha');
                    }}
                    className="text-xs font-medium hover:underline transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
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
                  className="w-full py-3 text-sm font-bold shadow-md"
                >
                  {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
                </Button>
              </div>

              <p className="text-center text-xs pt-3" style={{ color: 'var(--text-muted)' }}>
                Protegido por Criptografia e Políticas CFP / LGPD
              </p>
            </form>
          )}

          {/* ======================================================== */}
          {/* VISTA: FORMULÁRIO DE CADASTRO DE NOVA CONTA              */}
          {/* ======================================================== */}
          {viewState === 'cadastro' && (
            <form className="space-y-4" onSubmit={handleCadastro}>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input
                    type="text"
                    value={nomeCadastro}
                    onChange={(e) => setNomeCadastro(e.target.value)}
                    className="ds-input pl-10 py-2.5"
                    placeholder="Dra. Camila Alencar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Endereço de e-mail *
                </label>
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
                    placeholder="seu.email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Criar Senha (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ds-input pl-10 py-2.5"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="ds-input pl-10 py-2.5"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
                <span>14 dias grátis sem necessidade de cartão de crédito no cadastro.</span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 text-sm font-bold shadow-md"
                >
                  {isSubmitting ? 'Criando Conta...' : 'Criar Conta e Iniciar Avaliação'}
                </Button>
              </div>

              <p className="text-center text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
                Ao se cadastrar, você concorda com os termos de sigilo ético e proteção CFP / LGPD.
              </p>
            </form>
          )}

          {/* ======================================================== */}
          {/* VISTA 2: VERIFICAÇÃO EM DUAS ETAPAS (2FA)                */}
          {/* ======================================================== */}
          {viewState === '2fa' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-1 shadow-inner" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                  Verificação em 2 Etapas
                </h3>
                <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  Insira o código de segurança de 6 dígitos gerado para <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>.
                </p>
              </div>

              {/* Dica de Código Rápido (Homologação / Teste) */}
              {codigoExibido && (
                <div 
                  onClick={() => setCodigo2FA(codigoExibido)}
                  className="p-3 rounded-xl border border-dashed cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] text-center"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent)' }}
                  title="Clique para preencher automaticamente"
                >
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Código de teste / homologação gerado:
                  </p>
                  <p className="text-xl font-mono font-black tracking-widest mt-0.5" style={{ color: 'var(--accent)' }}>
                    {codigoExibido}
                  </p>
                  <span className="text-[10px] font-medium opacity-75 underline" style={{ color: 'var(--text-muted)' }}>
                    Clique para preencher
                  </span>
                </div>
              )}

              <form onSubmit={handleVerificar2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={codigo2FA}
                    onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="ds-input text-center text-2xl tracking-[0.4em] font-mono font-bold py-3 w-full"
                  />
                </div>

                {/* Caixa Selecionadora: Lembrar desta máquina */}
                <div 
                  onClick={() => setLembrarMaquina(!lembrarMaquina)}
                  className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer select-none transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <input
                    type="checkbox"
                    id="lembrar-maquina"
                    checked={lembrarMaquina}
                    onChange={(e) => setLembrarMaquina(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-indigo-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <label htmlFor="lembrar-maquina" className="text-xs font-bold block cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                      Lembrar desta máquina
                    </label>
                    <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      Nunca mais solicitar verificação neste computador/navegador.
                    </p>
                  </div>
                  <Laptop size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || codigo2FA.length < 6}
                    className="w-full py-3 text-sm font-bold shadow-md"
                  >
                    {isSubmitting ? 'Validando...' : 'Confirmar e Acessar'}
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleReenviarCodigo}
                      className="text-xs font-medium flex items-center gap-1 hover:underline transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <RefreshCw size={13} /> Reenviar código
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelar2FA}
                      className="text-xs font-medium hover:underline transition-colors"
                      style={{ color: 'var(--status-danger)' }}
                    >
                      Cancelar e Sair
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISTA 3: REDEFINIDOR DE SENHA                            */}
          {/* ======================================================== */}
          {viewState === 'recuperar_senha' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center space-y-1 mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-1 shadow-inner" style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>
                  <KeyRound size={24} />
                </div>
                <h3 className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>
                  Redefinir Senha
                </h3>
                <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  Enviaremos instruções oficiais para você cadastrar uma nova senha com segurança.
                </p>
              </div>

              <form onSubmit={handleSolicitarRedefinicao} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>E-mail cadastrado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="ds-input pl-10 py-2.5"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full py-3 text-sm font-bold shadow-md"
                  >
                    {isSendingReset ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewState('login');
                      setError('');
                      setResetSuccess('');
                    }}
                    className="w-full py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 hover:underline transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <ArrowLeft size={14} /> Voltar para o Login
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
