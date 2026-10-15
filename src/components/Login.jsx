import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loginFirebaseUser,
  cadastrarFirebaseUser,
  logoutFirebaseUser,
  redefinirSenhaFirebase,
  enviarCodigoMfa,
  verificarCodigoMfa,
} from '../services/authService';
import { Mail, Lock, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, RefreshCw, User, Eye, EyeOff, MailCheck, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import logo from '../assets/logo.svg';

const PONTOS_DA_MARCA = [
  'Anamnese, evolução de sessões e documentos do CFP no mesmo lugar.',
  'Dados de cada profissional isolados, com trilha de auditoria.',
  'Acesso protegido por código enviado ao seu e-mail.',
];

// Mensagens já chegam em pt-BR das Cloud Functions; erros de rede ganham texto próprio.
function mensagemErroMfa(err, padrao) {
  const code = err?.code || '';
  if (code === 'functions/unavailable' || code === 'functions/internal' || code === 'functions/deadline-exceeded') {
    return 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.';
  }
  return err?.message && !code.endsWith('/unknown') ? err.message : padrao;
}

function CampoComIcone({ icon, children, trailing }) {
  const Icon = icon;
  return (
    <div className="relative">
      <Icon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
      {children}
      {trailing}
    </div>
  );
}

function CampoSenha({ id, value, onChange, autoComplete, placeholder = '••••••••', minLength }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <CampoComIcone
      icon={Lock}
      trailing={
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md"
          style={{ color: 'var(--text-muted)' }}
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      }
    >
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        required
        minLength={minLength}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="ds-input pl-10 pr-12"
        placeholder={placeholder}
      />
    </CampoComIcone>
  );
}

function Aviso({ tipo, children }) {
  const erro = tipo === 'erro';
  const Icon = erro ? AlertCircle : CheckCircle2;
  return (
    <div
      role={erro ? 'alert' : 'status'}
      className="mb-5 p-3.5 rounded-[var(--radius-sm)] flex items-start gap-2.5 animate-in"
      style={{
        backgroundColor: erro ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
        color: erro ? 'var(--status-danger-text)' : 'var(--status-success-text)',
      }}
    >
      <Icon size={18} className="shrink-0 mt-px" />
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

export default function Login({ pending2FAUser, on2FASuccess }) {
  const [email, setEmail] = useState(pending2FAUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeCadastro, setNomeCadastro] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 'login' | 'cadastro' | '2fa' | 'recuperar_senha'
  const [viewState, setViewState] = useState(pending2FAUser ? '2fa' : 'login');

  // 2FA: o código nunca aparece na tela; só chega por e-mail
  const [codigo2FA, setCodigo2FA] = useState('');
  const [lembrarDispositivo, setLembrarDispositivo] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState('');
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [reenviarEm, setReenviarEm] = useState(0);
  const envioInicialRef = useRef(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const solicitarCodigo = useCallback(async () => {
    setError('');
    setEnviandoCodigo(true);
    try {
      const res = await enviarCodigoMfa();
      setEnviadoPara(res.enviadoPara);
      setReenviarEm(res.reenviarEmSegundos || 60);
    } catch (err) {
      if (err?.code === 'functions/resource-exhausted' && err?.details?.espera) {
        // Código recente ainda vale: só aguarda para reenviar
        setReenviarEm(err.details.espera);
      } else {
        setError(mensagemErroMfa(err, 'Não foi possível enviar o código. Tente de novo.'));
      }
    } finally {
      setEnviandoCodigo(false);
    }
  }, []);

  // Login concluído, falta o 2FA: envia o código uma única vez
  useEffect(() => {
    if (!pending2FAUser?.email || envioInicialRef.current) return;
    envioInicialRef.current = true;
    solicitarCodigo();
  }, [pending2FAUser, solicitarCodigo]);

  // Contagem regressiva do reenvio
  useEffect(() => {
    if (reenviarEm <= 0) return undefined;
    const t = setTimeout(() => setReenviarEm((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviarEm]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      // App.jsx assume daqui: checa a sessão 2FA e mostra a etapa do código se preciso
      await loginFirebaseUser(email.trim().toLowerCase(), password);
    } catch (err) {
      if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(err.code)) {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
      } else {
        setError('Não foi possível entrar. Verifique sua conexão.');
      }
      setIsSubmitting(false);
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setError('');

    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Use uma senha com pelo menos 8 caracteres, incluindo letras e números.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cadastrarFirebaseUser(emailLimpo, password, nomeCadastro);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já tem conta. Use a aba Entrar.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/weak-password') {
        setError('Senha fraca. Use letras, números e pelo menos 8 caracteres.');
      } else {
        setError('Não foi possível criar a conta. Tente mais tarde.');
      }
      setIsSubmitting(false);
    }
  };

  const handleVerificar2FA = async (e) => {
    if (e) e.preventDefault();
    if (codigo2FA.length !== 6 || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await verificarCodigoMfa(codigo2FA, lembrarDispositivo);
      if (on2FASuccess) on2FASuccess();
    } catch (err) {
      setError(mensagemErroMfa(err, 'Não foi possível validar o código. Tente de novo.'));
      setCodigo2FA('');
      setIsSubmitting(false);
    }
  };

  const handleCancelar2FA = async () => {
    await logoutFirebaseUser();
  };

  const handleSolicitarRedefinicao = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setIsSendingReset(true);
    // Mesma resposta exista ou não a conta, para não revelar quem é cliente
    const confirmacao = `Se houver uma conta para ${resetEmail || email}, o link de redefinição chega em instantes. Confira também o spam.`;
    try {
      await redefinirSenhaFirebase(resetEmail || email);
      setResetSuccess(confirmacao);
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setResetSuccess(confirmacao);
      } else {
        setError('Não foi possível enviar o e-mail. Tente de novo.');
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const trocarAba = (aba) => {
    setViewState(aba);
    setError('');
  };

  return (
    <div className="min-h-full w-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Painel da marca (desktop) */}
      <aside
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ backgroundColor: '#0B3F3C', color: '#F5F3EE' }}
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="w-11 h-11" />
          <span className="font-heading text-xl font-semibold tracking-[0.08em]">CARITAS</span>
        </div>

        <div className="max-w-md relative z-10">
          <h1 className="text-[2.6rem] xl:text-5xl leading-[1.08] font-medium" style={{ color: '#FBFAF7' }}>
            O prontuário que respeita o tempo da sessão.
          </h1>
          <ul className="mt-10 space-y-4">
            {PONTOS_DA_MARCA.map((ponto) => (
              <li key={ponto} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: 'rgba(245,243,238,0.84)' }}>
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#E09E72' }} />
                {ponto}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs relative z-10" style={{ color: 'rgba(245,243,238,0.66)' }}>
          Em conformidade com as Resoluções CFP 01/2009 e 06/2019 e com a LGPD.
        </p>

        {/* Onda do logo como assinatura gráfica */}
        <svg className="absolute -right-24 bottom-24 w-[520px] opacity-[0.10] pointer-events-none" viewBox="0 0 200 60" fill="none" aria-hidden="true">
          <path d="M2 40 C 22 40, 34 12, 54 12 C 74 12, 78 52, 98 40 C 118 28, 126 4, 146 12 C 166 20, 174 36, 198 32" stroke="#F5F3EE" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </aside>

      {/* Formulários */}
      <main className="flex-1 flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px] mx-auto">

          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src={logo} alt="" className="w-9 h-9" />
            <span className="font-heading text-lg font-semibold tracking-[0.08em]" style={{ color: 'var(--text-primary)' }}>CARITAS</span>
          </div>

          {error && <Aviso tipo="erro">{error}</Aviso>}
          {resetSuccess && <Aviso tipo="ok">{resetSuccess}</Aviso>}

          {(viewState === 'login' || viewState === 'cadastro') && (
            <>
              <h2 className="text-[1.9rem] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                {viewState === 'login' ? 'Bem-vinda(o) de volta' : 'Crie sua conta'}
              </h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {viewState === 'login'
                  ? 'Entre para acessar seus pacientes e sua agenda.'
                  : 'Depois do cadastro, você escolhe o plano e ativa o acesso.'}
              </p>

              <div className="ds-segmented w-full mt-7 mb-6">
                <button type="button" aria-pressed={viewState === 'login'} className="flex-1" onClick={() => trocarAba('login')}>
                  Entrar
                </button>
                <button type="button" aria-pressed={viewState === 'cadastro'} className="flex-1" onClick={() => trocarAba('cadastro')}>
                  Criar conta
                </button>
              </div>
            </>
          )}

          {viewState === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label htmlFor="login-email" className="ds-label">E-mail</label>
                <CampoComIcone icon={Mail}>
                  <input id="login-email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="ds-input pl-10" placeholder="voce@consultorio.com.br" />
                </CampoComIcone>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="login-senha" className="ds-label">Senha</label>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setError(''); setResetSuccess(''); setViewState('recuperar_senha'); }}
                    className="text-xs font-semibold mb-1.5 hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <CampoSenha id="login-senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full !min-h-[46px]">
                {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Entrando…</> : 'Entrar'}
              </Button>
            </form>
          )}

          {viewState === 'cadastro' && (
            <form className="space-y-4" onSubmit={handleCadastro}>
              <div>
                <label htmlFor="cad-nome" className="ds-label">Nome profissional</label>
                <CampoComIcone icon={User}>
                  <input id="cad-nome" type="text" autoComplete="name" value={nomeCadastro}
                    onChange={(e) => setNomeCadastro(e.target.value)} className="ds-input pl-10" placeholder="Dra. Camila Alencar" />
                </CampoComIcone>
              </div>
              <div>
                <label htmlFor="cad-email" className="ds-label">E-mail</label>
                <CampoComIcone icon={Mail}>
                  <input id="cad-email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="ds-input pl-10" placeholder="voce@consultorio.com.br" />
                </CampoComIcone>
              </div>
              <div>
                <label htmlFor="cad-senha" className="ds-label">Senha</label>
                <CampoSenha id="cad-senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Mínimo de 8 caracteres, com letras e números.</p>
              </div>
              <div>
                <label htmlFor="cad-confirma" className="ds-label">Confirme a senha</label>
                <CampoSenha id="cad-confirma" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full !min-h-[46px]">
                {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Criando conta…</> : 'Criar conta e começar'}
              </Button>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Ao criar a conta, você assume o sigilo profissional sobre os dados registrados, conforme o Código de Ética do CFP e a LGPD.
              </p>
            </form>
          )}

          {viewState === '2fa' && (
            <div className="animate-in">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                <MailCheck size={24} />
              </div>
              <h2 className="text-[1.75rem] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                Confirme que é você
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }} aria-live="polite">
                {enviandoCodigo && !enviadoPara
                  ? 'Enviando o código para o seu e-mail…'
                  : <>Enviamos um código de 6 dígitos para <strong style={{ color: 'var(--text-primary)' }}>{enviadoPara || email}</strong>. Ele vale por 10 minutos.</>}
              </p>

              <form onSubmit={handleVerificar2FA} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="codigo-2fa" className="ds-label">Código de verificação</label>
                  <input
                    id="codigo-2fa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    required
                    value={codigo2FA}
                    onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="––––––"
                    className="ds-input text-center !text-[1.6rem] tracking-[0.5em] font-bold !min-h-[56px] tabular"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lembrarDispositivo}
                    onChange={(e) => setLembrarDispositivo(e.target.checked)}
                    className="mt-0.5 w-[18px] h-[18px] shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Confiar neste dispositivo por 30 dias</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Não marque em computadores compartilhados.</span>
                  </span>
                </label>

                <Button type="submit" disabled={isSubmitting || codigo2FA.length < 6} className="w-full !min-h-[46px]">
                  {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Verificando…</> : 'Verificar e entrar'}
                </Button>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={solicitarCodigo}
                    disabled={reenviarEm > 0 || enviandoCodigo}
                    className="text-sm font-semibold flex items-center gap-1.5 min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ color: 'var(--accent)' }}
                  >
                    <RefreshCw size={14} className={enviandoCodigo ? 'animate-spin' : ''} />
                    {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : 'Reenviar código'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelar2FA}
                    className="text-sm font-medium min-h-[40px] hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Usar outra conta
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewState === 'recuperar_senha' && (
            <div className="animate-in">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--warm-light)', color: 'var(--warm)' }}>
                <KeyRound size={22} />
              </div>
              <h2 className="text-[1.75rem] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>Redefinir senha</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enviaremos um link para você cadastrar uma nova senha.
              </p>

              <form onSubmit={handleSolicitarRedefinicao} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="ds-label">E-mail da conta</label>
                  <CampoComIcone icon={Mail}>
                    <input id="reset-email" type="email" required autoComplete="email" value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)} className="ds-input pl-10" placeholder="voce@consultorio.com.br" />
                  </CampoComIcone>
                </div>

                <Button type="submit" disabled={isSendingReset} className="w-full !min-h-[46px]">
                  {isSendingReset ? <><Loader2 size={17} className="animate-spin" /> Enviando…</> : 'Enviar link'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setViewState('login'); setError(''); setResetSuccess(''); }}
                  className="w-full min-h-[44px] text-sm font-medium flex items-center justify-center gap-1.5 hover:underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ArrowLeft size={15} /> Voltar para o login
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
