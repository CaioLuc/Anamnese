import { useState, useEffect } from 'react';
import { 
  User, CreditCard, Sparkles, ShieldCheck, Check, Calendar, 
  DollarSign, AlertCircle, Clock, Lock, Building, Phone, 
  FileText, Copy, QrCode, RefreshCw, Award
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../contexts/ToastContext';
import { lerPerfilPsicologo, salvarPerfilPsicologo } from '../services/patientService';
import { 
  PLANOS_CARITAS, 
  verificarStatusAssinatura, 
  cadastrarCartaoEAtivarPlano, 
  gerarDadosPixMensal, 
  detectarBandeiraCartao 
} from '../services/paymentService';
import logger from '../utils/logger';

export default function PerfilEPlano({ onProfileUpdated }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'planos' | 'pagamento' | 'faturas'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Perfil state
  const [perfil, setPerfil] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    crp: '',
    email: '',
    telefone: '',
    nomeClinica: '',
    abordagem: 'Terapia Cognitivo-Comportamental (TCC)',
    bio: '',
  });

  // Cartão state
  const [cartaoForm, setCartaoForm] = useState({
    numero: '',
    nomeTitular: '',
    validade: '',
    cvv: '',
    cpfCnpj: '',
  });
  const [cartaoLoading, setCartaoLoading] = useState(false);
  const [mostrarFormCartao, setMostrarFormCartao] = useState(false);

  // PIX state
  const [pixData, setPixData] = useState(null);
  const [pixPlanoSelecionado, setPixPlanoSelecionado] = useState('profissional');

  const carregarPerfil = async () => {
    setIsLoading(true);
    try {
      const p = await lerPerfilPsicologo();
      if (p) {
        setPerfil(p);
        setFormData({
          nome: p.nome || '',
          crp: p.crp || '',
          email: p.email || '',
          telefone: p.telefone || '',
          nomeClinica: p.nomeClinica || '',
          abordagem: p.abordagem || 'Terapia Cognitivo-Comportamental (TCC)',
          bio: p.bio || '',
        });
      }
    } catch (err) {
      logger.error('Erro ao carregar perfil:', err);
      showToast({ type: 'error', message: 'Erro ao carregar informações de perfil.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await salvarPerfilPsicologo({
        ...formData,
      });
      showToast({ type: 'success', message: 'Perfil clínico atualizado com sucesso!' });
      await carregarPerfil();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      logger.error('Erro ao salvar perfil:', err);
      showToast({ type: 'error', message: 'Não foi possível salvar os dados.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalvarCartao = async (e, planoIdEscolhido) => {
    e.preventDefault();
    setCartaoLoading(true);
    try {
      const targetPlano = planoIdEscolhido || perfil?.plano || 'profissional';
      const res = await cadastrarCartaoEAtivarPlano({
        numeroCartao: cartaoForm.numero,
        nomeTitular: cartaoForm.nomeTitular,
        validade: cartaoForm.validade,
        cvv: cartaoForm.cvv,
        cpfCnpj: cartaoForm.cpfCnpj,
        planoId: targetPlano,
      });

      showToast({ 
        type: 'success', 
        message: `Cartão vinculado com sucesso! Plano ${res.plano.nome} ativo.` 
      });
      setMostrarFormCartao(false);
      setCartaoForm({ numero: '', nomeTitular: '', validade: '', cvv: '', cpfCnpj: '' });
      await carregarPerfil();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      logger.error('Erro ao processar cartão:', err);
      showToast({ type: 'error', message: err.message || 'Erro ao processar cartão de crédito.' });
    } finally {
      setCartaoLoading(false);
    }
  };

  const handleGerarPix = (planoId) => {
    setPixPlanoSelecionado(planoId);
    const dados = gerarDadosPixMensal(planoId, perfil?.email);
    setPixData(dados);
  };

  const copiarPix = () => {
    if (!pixData?.copiaECola) return;
    navigator.clipboard.writeText(pixData.copiaECola);
    showToast({ type: 'success', message: 'Código PIX Copia e Cola copiado para a área de transferência!' });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[var(--accent)]" size={32} />
          <p className="text-sm text-[var(--text-muted)]">Carregando perfil e assinatura...</p>
        </div>
      </div>
    );
  }

  const statusAssinatura = verificarStatusAssinatura(perfil);
  const planoAtualId = perfil?.plano || 'basico';
  const planoAtualObj = PLANOS_CARITAS[planoAtualId] || PLANOS_CARITAS.basico;
  const bandeiraCartaoDetectada = detectarBandeiraCartao(cartaoForm.numero);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Institucional */}
      <div className="ds-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[var(--accent)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">
              Meu Perfil & Plano de Assinatura
            </h1>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
              statusAssinatura.emDia 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}>
              {statusAssinatura.status === 'trial' ? `Trial (${statusAssinatura.diasRestantesTrial} dias)` : statusAssinatura.status}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Cadastre seus dados profissionais para os cabeçalhos de prontuário e mantenha sua assinatura regularizada.
          </p>
        </div>

        {/* Resumo financeiro rápido */}
        <div className="flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-3 rounded-lg border border-[var(--border)]">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] shrink-0">
            <Award size={20} />
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Plano Atual</div>
            <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              {planoAtualObj.nome}
              <span className="text-xs font-normal text-[var(--text-secondary)]">
                (R$ {planoAtualObj.preco.toFixed(2)}/mês)
              </span>
            </div>
            {perfil?.proximoVencimento && (
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                <Clock size={11} /> Vencimento: {perfil.proximoVencimento}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex border-b border-[var(--border)] gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeTab === 'perfil'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <User size={16} /> Dados Cadastrais & CRP
        </button>
        <button
          onClick={() => setActiveTab('planos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeTab === 'planos'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles size={16} /> Planos & Upgrade
        </button>
        <button
          onClick={() => setActiveTab('pagamento')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeTab === 'pagamento'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <CreditCard size={16} /> Cartão & PIX Mensal
        </button>
        <button
          onClick={() => setActiveTab('faturas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
            activeTab === 'faturas'
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-card)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText size={16} /> Histórico de Mensalidades
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: DADOS CADASTRAIS */}
      {activeTab === 'perfil' && (
        <form onSubmit={handleSalvarPerfil} className="ds-card p-6 space-y-6">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)]">
              Informações Profissionais
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Esses dados serão utilizados na assinatura digital e no cabeçalho legal dos documentos emitidos (CFP nº 06/2019).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Nome Completo do(a) Psicólogo(a) *
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Dra. Camila Alencar"
                  className="ds-input pl-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Registro no CRP (Conselho Regional de Psicologia) *
              </label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  value={formData.crp}
                  onChange={(e) => setFormData({ ...formData, crp: e.target.value })}
                  placeholder="Ex: CRP 05/12345"
                  className="ds-input pl-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                E-mail Profissional
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="ds-input w-full opacity-70 cursor-not-allowed bg-[var(--bg-secondary)]"
              />
              <span className="text-[11px] text-[var(--text-muted)]">O e-mail de login não pode ser alterado diretamente por aqui.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp Profissional
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="ds-input pl-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Nome do Consultório / Clínica
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={formData.nomeClinica}
                  onChange={(e) => setFormData({ ...formData, nomeClinica: e.target.value })}
                  placeholder="Ex: Clínica Renascer & Saúde Mental"
                  className="ds-input pl-10 w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Abordagem Teórica Principal
              </label>
              <select
                value={formData.abordagem}
                onChange={(e) => setFormData({ ...formData, abordagem: e.target.value })}
                className="ds-input w-full"
              >
                <option value="Terapia Cognitivo-Comportamental (TCC)">Terapia Cognitivo-Comportamental (TCC)</option>
                <option value="Psicanálise">Psicanálise</option>
                <option value="Fenomenologia-Existencial / Humanismo">Fenomenologia-Existencial / Humanismo</option>
                <option value="Gestalt-Terapia">Gestalt-Terapia</option>
                <option value="Análise do Comportamento Aplicada (ABA)">Análise do Comportamento Aplicada (ABA)</option>
                <option value="Terapia Sistêmica Familiar">Terapia Sistêmica Familiar</option>
                <option value="Outra Abordagem Clínica">Outra Abordagem Clínica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Breve Apresentação Profissional / Bio (Opcional)
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Especialista em atendimento a adolescentes e adultos com ênfase em transtornos de ansiedade..."
              className="ds-input w-full resize-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={isSaving}
              className="ds-btn ds-btn-primary px-6 py-2.5 flex items-center gap-2"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
              Salvar Dados Cadastrais
            </button>
          </div>
        </form>
      )}

      {/* CONTEÚDO DA ABA 2: PLANOS & UPGRADE */}
      {activeTab === 'planos' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)]">
              Escolha o Plano Ideal para a sua Prática Clínica
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Cobrança mensal automatizada via Asaas. Troque de plano a qualquer momento sem taxas de fidelidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PLANOS_CARITAS).map((plano) => {
              const isPlanoAtual = planoAtualId === plano.id;

              return (
                <div
                  key={plano.id}
                  className={`ds-card p-6 flex flex-col justify-between relative transition-all duration-200 ${
                    plano.destaque
                      ? 'border-2 border-[var(--accent)] shadow-lg shadow-[var(--accent)]/5'
                      : 'border border-[var(--border)]'
                  }`}
                >
                  {plano.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                      Mais Recomendado
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-heading font-bold text-[var(--text-primary)]">
                        {plano.nome}
                      </h3>
                      {isPlanoAtual && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                          Plano Atual
                        </span>
                      )}
                    </div>

                    <div className="my-4">
                      <span className="text-3xl font-heading font-extrabold text-[var(--text-primary)]">
                        R$ {plano.preco.toFixed(2)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] ml-1">/mês</span>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4 space-y-2.5">
                      {plano.recursos.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                          <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[var(--border)] mt-6">
                    {isPlanoAtual ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default border border-[var(--border)] text-center"
                      >
                        Seu Plano Ativo
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTab('pagamento');
                          setMostrarFormCartao(true);
                          setPixPlanoSelecionado(plano.id);
                        }}
                        className={`w-full py-2.5 px-4 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-2 ${
                          plano.destaque
                            ? 'ds-btn ds-btn-primary'
                            : 'ds-btn ds-btn-secondary'
                        }`}
                      >
                        Contratar {plano.nome}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: CARTÃO & PIX MENSAL */}
      {activeTab === 'pagamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Cartão de Crédito Recorrente */}
          <div className="ds-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CreditCard size={18} className="text-[var(--accent)]" /> Cartão de Crédito (Recorrente)
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Renovação mensal automática sem necessidade de cobrança manual.
                </p>
              </div>
            </div>

            {/* Visualização de Cartão Cadastrado */}
            {perfil?.cartaoInfo && !mostrarFormCartao ? (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md relative overflow-hidden border border-slate-700">
                  <div className="absolute right-4 top-4 text-xs font-bold uppercase tracking-wider text-cyan-300">
                    {perfil.cartaoInfo.bandeira || 'Crédito'}
                  </div>
                  <div className="w-10 h-7 rounded bg-amber-400/80 mb-6" />
                  <div className="text-lg font-mono tracking-widest mb-4">
                    •••• •••• •••• {perfil.cartaoInfo.ultimos4}
                  </div>
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Titular</div>
                      <div className="font-semibold uppercase">{perfil.cartaoInfo.nomeTitular}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Validade</div>
                      <div className="font-mono">{perfil.cartaoInfo.validade}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                    <Check size={14} /> Cobrança recorrente ativa
                  </span>
                  <button
                    onClick={() => setMostrarFormCartao(true)}
                    className="text-xs text-[var(--accent)] hover:underline font-semibold"
                  >
                    Trocar Cartão de Crédito
                  </button>
                </div>
              </div>
            ) : (
              /* Formulário de Novo Cartão */
              <form onSubmit={(e) => handleSalvarCartao(e, planoAtualId)} className="space-y-4">
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
                      {bandeiraCartaoDetectada}
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
                    placeholder="COMO IMPRESSO NO CARTÃO"
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
                      placeholder="12/28"
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

                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-[11px] text-[var(--text-muted)] flex items-start gap-2">
                  <Lock size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                  <span>Ambiente seguro certificado. Dados sensíveis processados em conformidade com as normas PCI-DSS.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  {perfil?.cartaoInfo && (
                    <button
                      type="button"
                      onClick={() => setMostrarFormCartao(false)}
                      className="ds-btn ds-btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={cartaoLoading}
                    className="ds-btn ds-btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {cartaoLoading ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                    Cadastrar e Ativar Plano
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Coluna 2: Pagamento Mensal via PIX */}
          <div className="ds-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <QrCode size={18} className="text-emerald-500" /> PIX Mensal (Instantâneo)
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pague sua mensalidade via QR Code ou Copia e Cola com liberação automática imediata.
                </p>
              </div>
            </div>

            {!pixData ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                  <QrCode size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Gerar Cobrança PIX para o {PLANOS_CARITAS[pixPlanoSelecionado]?.nome}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                    Valor: <strong className="text-[var(--text-primary)]">R$ {PLANOS_CARITAS[pixPlanoSelecionado]?.preco.toFixed(2)}</strong>. O sistema identifica a quitação e mantém sua conta liberada por 30 dias.
                  </p>
                </div>

                <button
                  onClick={() => handleGerarPix(pixPlanoSelecionado)}
                  className="ds-btn ds-btn-primary px-6 py-2.5 inline-flex items-center gap-2"
                >
                  <QrCode size={16} /> Gerar QR Code PIX
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-inner border border-slate-200">
                  <QRCodeSVG value={pixData.copiaECola} size={180} level="M" />
                  <span className="text-[11px] text-slate-500 mt-2 font-mono">
                    Valor: R$ {pixData.valor.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
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
                      onClick={copiarPix}
                      className="ds-btn ds-btn-secondary px-3 flex items-center gap-1.5 shrink-0"
                      title="Copiar código PIX"
                    >
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Check size={16} className="shrink-0" />
                  <span>Após o pagamento no seu banco, a liberação é confirmada em instantes.</span>
                </div>

                <button
                  onClick={() => setPixData(null)}
                  className="text-xs text-[var(--text-muted)] hover:underline block text-center w-full"
                >
                  Gerar nova cobrança PIX
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: HISTÓRICO DE MENSALIDADES */}
      {activeTab === 'faturas' && (
        <div className="ds-card p-6 space-y-4">
          <div className="border-b border-[var(--border)] pb-4">
            <h2 className="text-lg font-heading font-semibold text-[var(--text-primary)]">
              Extrato de Mensalidades
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Histórico de pagamentos efetuados e notas para comprovação fiscal.
            </p>
          </div>

          {(!perfil?.historicoFaturas || perfil.historicoFaturas.length === 0) ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <FileText size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma fatura registrada até o momento.</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Suas mensalidades constarão aqui assim que o primeiro pagamento for efetuado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Plano</th>
                    <th className="py-3 px-3">Valor</th>
                    <th className="py-3 px-3">Forma</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {perfil.historicoFaturas.map((fat) => (
                    <tr key={fat.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">{fat.id}</td>
                      <td className="py-3 px-3 text-[var(--text-primary)]">
                        {new Date(fat.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{fat.plano}</td>
                      <td className="py-3 px-3 font-bold text-[var(--text-primary)]">
                        R$ {Number(fat.valor).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">{fat.formaPagamento}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {fat.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
