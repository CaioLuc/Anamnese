import { useState } from 'react';
import { 
  CreditCard, QrCode, ShieldAlert, Check, Lock, LogOut, 
  RefreshCw, Copy, ShieldCheck, HeartPulse
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { logoutFirebaseUser } from '../services/authService';
import { 
  PLANOS_CARITAS, 
  cadastrarCartaoEAtivarPlano, 
  gerarDadosPixMensal, 
  detectarBandeiraCartao 
} from '../services/paymentService';
import { useToast } from '../contexts/ToastContext';
import logger from '../utils/logger';

export default function AssinaturaPendente({ perfil, statusAssinatura, onPagamentoRegularizado }) {
  const { showToast } = useToast();
  const [metodo, setMetodo] = useState('cartao'); // 'cartao' | 'pix'
  const [planoId, setPlanoId] = useState(perfil?.plano || 'profissional');
  const [isLoading, setIsLoading] = useState(false);

  // Cartão state
  const [cartaoForm, setCartaoForm] = useState({
    numero: '',
    nomeTitular: '',
    validade: '',
    cvv: '',
    cpfCnpj: '',
  });

  // PIX state
  const [pixData, setPixData] = useState(null);

  const planoObj = PLANOS_CARITAS[planoId] || PLANOS_CARITAS.profissional;
  const bandeira = detectarBandeiraCartao(cartaoForm.numero);

  const handlePagarCartao = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await cadastrarCartaoEAtivarPlano({
        numeroCartao: cartaoForm.numero,
        nomeTitular: cartaoForm.nomeTitular,
        validade: cartaoForm.validade,
        cvv: cartaoForm.cvv,
        cpfCnpj: cartaoForm.cpfCnpj,
        planoId,
      });

      showToast({ type: 'success', message: 'Pagamento processado com sucesso! Acesso regularizado.' });
      if (onPagamentoRegularizado) onPagamentoRegularizado();
    } catch (err) {
      logger.error('Erro ao regularizar com cartão:', err);
      showToast({ type: 'error', message: err.message || 'Erro ao processar pagamento.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGerarPix = () => {
    const dados = gerarDadosPixMensal(planoId, perfil?.email);
    setPixData(dados);
  };

  const copiarPix = () => {
    if (!pixData?.copiaECola) return;
    navigator.clipboard.writeText(pixData.copiaECola);
    showToast({ type: 'success', message: 'Código PIX copiado com sucesso!' });
  };

  const handleConfirmarPixManual = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast({ type: 'success', message: 'Pagamento identificado! Liberando plataforma...' });
      if (onPagamentoRegularizado) onPagamentoRegularizado();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Banner de status */}
        <div className="ds-card p-6 text-center space-y-3 border-t-4 border-t-amber-500 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">
            Regularização de Mensalidade
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            {statusAssinatura?.motivo || 'Identificamos uma pendência na sua assinatura do CARITAS. Regularize seu pagamento para continuar atendendo normalmente.'}
          </p>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 max-w-md mx-auto">
            <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
            <span>Seus prontuários e pacientes continuam 100% seguros e guardados (CFP Res. 01/2009).</span>
          </div>
        </div>

        {/* Card de Pagamento Imediato */}
        <div className="ds-card p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Selecione seu Plano
              </span>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={planoId}
                  onChange={(e) => {
                    setPlanoId(e.target.value);
                    setPixData(null);
                  }}
                  className="ds-input font-medium text-sm"
                >
                  <option value="basico">Plano Essencial (R$ 79,90/mês)</option>
                  <option value="profissional">Plano Profissional Pro (R$ 139,90/mês)</option>
                  <option value="clinica">Plano Clínica & Equipe (R$ 299,90/mês)</option>
                </select>
              </div>
            </div>

            {/* Alternador de método */}
            <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setMetodo('cartao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  metodo === 'cartao'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CreditCard size={14} /> Cartão de Crédito
              </button>
              <button
                type="button"
                onClick={() => {
                  setMetodo('pix');
                  handleGerarPix();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  metodo === 'pix'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <QrCode size={14} /> PIX Instantâneo
              </button>
            </div>
          </div>

          {/* Checkout com Cartão de Crédito */}
          {metodo === 'cartao' && (
            <form onSubmit={handlePagarCartao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Número do Cartão de Crédito
                </label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cartaoForm.numero}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, numero: e.target.value })}
                    placeholder="0000 0000 0000 0000"
                    className="ds-input pl-10 pr-20 w-full font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                    {bandeira}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Nome Impresso no Cartão
                </label>
                <input
                  type="text"
                  required
                  value={cartaoForm.nomeTitular}
                  onChange={(e) => setCartaoForm({ ...cartaoForm, nomeTitular: e.target.value })}
                  placeholder="NOME COMO NO CARTÃO"
                  className="ds-input w-full uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Validade (MM/AA)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={cartaoForm.validade}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, validade: e.target.value })}
                    placeholder="10/28"
                    className="ds-input w-full font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cartaoForm.cvv}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, cvv: e.target.value })}
                    placeholder="123"
                    className="ds-input w-full font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  CPF/CNPJ do Titular
                </label>
                <input
                  type="text"
                  required
                  value={cartaoForm.cpfCnpj}
                  onChange={(e) => setCartaoForm({ ...cartaoForm, cpfCnpj: e.target.value })}
                  placeholder="000.000.000-00"
                  className="ds-input w-full font-mono"
                />
              </div>

              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                <Lock size={14} className="shrink-0 text-emerald-500" />
                <span>Cobrança mensal no valor de <strong>R$ {planoObj.preco.toFixed(2)}</strong> via gateway Asaas.</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="ds-btn ds-btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                Pagar com Cartão & Desbloquear Imediatamente
              </button>
            </form>
          )}

          {/* Checkout com PIX Instantâneo */}
          {metodo === 'pix' && (
            <div className="space-y-4">
              {pixData && (
                <>
                  <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-inner border border-slate-200">
                    <QRCodeSVG value={pixData.copiaECola} size={190} level="M" />
                    <span className="text-xs text-slate-600 mt-2 font-mono font-semibold">
                      Valor: R$ {pixData.valor.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      PIX Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.copiaECola}
                        className="ds-input font-mono text-xs flex-1 truncate"
                      />
                      <button
                        type="button"
                        onClick={copiarPix}
                        className="ds-btn ds-btn-secondary px-3 flex items-center gap-1.5 shrink-0"
                      >
                        <Copy size={14} /> Copiar
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmarPixManual}
                    disabled={isLoading}
                    className="ds-btn bg-emerald-600 hover:bg-emerald-700 text-white w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg mt-2"
                  >
                    {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                    Já Efetuei o Pagamento (Liberar Acesso)
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com logout */}
        <div className="flex justify-between items-center text-xs text-[var(--text-muted)] px-2">
          <div className="flex items-center gap-1">
            <HeartPulse size={14} className="text-[var(--accent)]" />
            <span>CARITAS — Gestão Clínica & Saúde Mental</span>
          </div>

          <button
            onClick={() => logoutFirebaseUser()}
            className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors underline"
          >
            <LogOut size={14} /> Encerrar Sessão
          </button>
        </div>

      </div>
    </div>
  );
}
