import { useState } from 'react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import ConfirmDialog from '../ConfirmDialog';
import {
  MAX_PSICOLOGOS_EQUIPE,
  MAX_PACIENTES_POR_PSICOLOGO,
  obterEquipeLider,
  adicionarMembroEquipe,
  removerMembroEquipe,
  calcularMetricasEquipe,
  obterFilaTriagem,
  encaminharPacienteTriagem,
} from '../../services/liderService';
import { CONTATO_COMERCIAL } from '../../services/paymentService';
import { useToast } from '../../contexts/ToastContext';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  ArrowRight,
  Trash2,
  Bell,
  Activity,
  CheckCircle,
  Zap,
} from 'lucide-react';

// Abaixo de md cada linha da tabela vira um cartão; o rótulo da coluna vem do data-label
const TD_MOBILE = 'max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:text-left max-md:before:content-[attr(data-label)] max-md:before:text-xs max-md:before:font-semibold max-md:before:text-[var(--text-muted)]';

export default function LiderClinicoDashboard({ limiteEquipe = MAX_PSICOLOGOS_EQUIPE }) {
  const ilimitado = !Number.isFinite(limiteEquipe);
  const limiteTexto = ilimitado ? 'sem limite' : limiteEquipe;
  const { showToast } = useToast();
  const [equipe, setEquipe] = useState(() => obterEquipeLider());
  const [triagem, setTriagem] = useState(() => obterFilaTriagem());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPsicologoParaTriagem, setSelectedPsicologoParaTriagem] = useState({});
  const [membroParaRemover, setMembroParaRemover] = useState(null);

  // Form de novo membro
  const [novoNome, setNovoNome] = useState('');
  const [novoCrp, setNovoCrp] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaEspecialidade, setNovaEspecialidade] = useState('');
  const [novoMaxPacientes, setNovoMaxPacientes] = useState(MAX_PACIENTES_POR_PSICOLOGO);

  const carregarDados = () => {
    const eq = obterEquipeLider();
    const tri = obterFilaTriagem();
    setEquipe(eq);
    setTriagem(tri);
  };

  const metricas = calcularMetricasEquipe(equipe);

  const handleAdicionarMembro = (e) => {
    e.preventDefault();
    try {
      adicionarMembroEquipe({
        nome: novoNome,
        crp: novoCrp,
        email: novoEmail,
        especialidade: novaEspecialidade,
        maxPacientes: novoMaxPacientes,
      }, limiteEquipe);
      showToast({ type: 'success', message: 'Psicólogo adicionado à equipe com sucesso!' });
      setIsAddModalOpen(false);
      setNovoNome('');
      setNovoCrp('');
      setNovoEmail('');
      setNovaEspecialidade('');
      setNovoMaxPacientes(MAX_PACIENTES_POR_PSICOLOGO);
      carregarDados();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao adicionar membro.' });
    }
  };

  const handleRemoverMembro = () => {
    const { id, nome } = membroParaRemover;
    setMembroParaRemover(null);
    removerMembroEquipe(id);
    showToast({ type: 'info', message: `${nome} removido da equipe.` });
    carregarDados();
  };

  const handleEncaminhar = (triagemId) => {
    const psiId = selectedPsicologoParaTriagem[triagemId];
    if (!psiId) {
      showToast({ type: 'warning', message: 'Selecione um psicólogo de destino para o encaminhamento.' });
      return;
    }

    try {
      const res = encaminharPacienteTriagem(triagemId, psiId);
      showToast({
        type: 'success',
        message: `Paciente ${res.paciente.nome} encaminhado com sucesso para ${res.psicologo.nome}!`,
      });
      carregarDados();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao encaminhar paciente.' });
    }
  };

  const handleNotificarPendencia = (membro) => {
    showToast({
      type: 'info',
      message: `Lembrete de conformidade (CFP 01/2009) enviado para ${membro.nome}.`,
    });
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">
              Liderança Clínica & Supervisão
            </h2>
            <Badge variant="info">
              {ilimitado ? `${equipe.length} Profissionais` : `${equipe.length}/${limiteEquipe} Profissionais`}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Supervisão de equipe, balanceamento de capacidade e conformidade de prontuários com Resoluções CFP.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {equipe.length >= limiteEquipe ? (
            <Button
              variant="secondary"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="shrink-0 w-full sm:w-auto"
            >
              <Zap size={18} className="text-amber-500" />
              Expandir Equipe (Upgrade)
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="shrink-0 w-full sm:w-auto"
            >
              <UserPlus size={18} />
              Adicionar Psicólogo
            </Button>
          )}
        </div>
      </div>

      {/* Compliance / Ethical Banner */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-heading font-semibold text-[var(--text-primary)]">
            Diretrizes Éticas de Supervisão Clínica (CFP nº 01/2009 e Código de Ética)
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            O Líder Clínico tem visibilidade de métricas operacionais, assiduidade, capacidade e prazos de evolução.
            As anotações confidenciais do paciente são preservadas sob sigilo profissional estrito entre psicólogo e paciente.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Capacidade da Equipe</span>
            <Users size={18} className="text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {metricas.totalProfissionais} <span className="text-sm font-normal text-[var(--text-muted)]">/ {limiteTexto} vagas</span>
          </div>
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[var(--accent)] h-1.5 rounded-full transition-all"
              style={{ width: ilimitado ? '0%' : `${(metricas.totalProfissionais / limiteEquipe) * 100}%` }}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pacientes Ativos</span>
            <Activity size={18} className="text-[var(--status-info)]" />
          </div>
          <div className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {metricas.totalPacientesAtivos} <span className="text-sm font-normal text-[var(--text-muted)]">/ {metricas.capacidadeTotal} max</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {metricas.taxaOcupacaoGeral}% de ocupação clínica geral
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Sessões / Mês</span>
            <CheckCircle size={18} className="text-[var(--status-success)]" />
          </div>
          <div className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {metricas.totalSessoesMes}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Assiduidade média da equipe: {metricas.mediaPresenca}%
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendências &gt; 48h</span>
            <AlertTriangle
              size={18}
              className={metricas.totalPendencias48h > 0 ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}
            />
          </div>
          <div className="text-2xl font-bold font-heading text-[var(--text-primary)]">
            {metricas.totalPendencias48h}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {metricas.totalPendencias48h === 0
              ? '100% dos prontuários atualizados'
              : 'Evoluções pendentes aguardando registro'}
          </p>
        </Card>
      </div>

      {/* Tabela de Monitoramento da Equipe */}
      <Card className="overflow-hidden">
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              Psicólogos Supervisionados
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Acompanhamento de carga horária, capacidade e auditoria temporal de prontuários.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {equipe.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum psicólogo na equipe"
              description="Adicione profissionais para iniciar a supervisão e triagem."
              actionLabel="Adicionar Psicólogo"
              onAction={() => setIsAddModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse max-md:block">
                <thead>
                  <tr className="max-md:hidden text-xs uppercase tracking-wider font-semibold bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-6 py-4">Profissional / CRP</th>
                    <th className="px-6 py-4">Especialidade</th>
                    <th className="px-6 py-4">Carga / Capacidade</th>
                    <th className="px-6 py-4 text-center">Sessões / Mês</th>
                    <th className="px-6 py-4 text-center">Conformidade (&gt;48h)</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] max-md:block">
                  {equipe.map((psi) => {
                    const cap = psi.maxPacientes || MAX_PACIENTES_POR_PSICOLOGO;
                    const ocupacao = Math.round(((psi.pacientesAtivos || 0) / cap) * 100);
                    const temPendencia = (psi.evolucoesPendentes || 0) > 0;
                    const isLotado = (psi.pacientesAtivos || 0) >= cap;

                    return (
                      <tr key={psi.id} className="max-md:block max-md:px-4 max-md:py-3 hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <td className="px-6 py-4 max-md:block max-md:px-0 max-md:pt-0 max-md:pb-2">
                          <div className="font-medium text-sm text-[var(--text-primary)]">{psi.nome}</div>
                          <div className="text-xs text-[var(--text-muted)] break-all">{psi.crp} • {psi.email}</div>
                        </td>
                        <td data-label="Especialidade" className={`px-6 py-4 text-sm text-[var(--text-secondary)] ${TD_MOBILE}`}>
                          {psi.especialidade}
                        </td>
                        <td data-label="Carga" className={`px-6 py-4 ${TD_MOBILE}`}>
                          <div>
                          <div className="flex items-center justify-between gap-2 text-xs mb-1">
                            <span className="font-medium text-[var(--text-primary)]">
                              {psi.pacientesAtivos} / {cap}
                            </span>
                            {isLotado ? (
                              <Badge variant="danger" size="sm">Lotado</Badge>
                            ) : (
                              <span className="text-[var(--text-muted)]">{ocupacao}%</span>
                            )}
                          </div>
                          <div className="w-32 bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${ocupacao >= 100 ? 'bg-[var(--status-danger)]' : ocupacao >= 75 ? 'bg-[var(--status-warning)]' : 'bg-[var(--accent)]'}`}
                              style={{ width: `${Math.min(ocupacao, 100)}%` }}
                            />
                          </div>
                          </div>
                        </td>
                        <td data-label="Sessões / mês" className={`px-6 py-4 text-center text-sm font-semibold text-[var(--text-primary)] ${TD_MOBILE}`}>
                          {psi.sessoesMes || 0}
                        </td>
                        <td data-label="Conformidade" className={`px-6 py-4 text-center ${TD_MOBILE}`}>
                          {temPendencia ? (
                            <Badge variant="danger">
                              {psi.evolucoesPendentes} pendência(s)
                            </Badge>
                          ) : (
                            <Badge variant="success">Em dia</Badge>
                          )}
                        </td>
                        <td data-label="Ações" className={`px-6 py-4 text-right ${TD_MOBILE}`}>
                          <div className="flex items-center justify-end gap-2">
                            {temPendencia && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleNotificarPendencia(psi)}
                                title="Notificar sobre anotações pendentes"
                                aria-label={`Notificar ${psi.nome} sobre anotações pendentes`}
                                className="max-md:min-h-[44px] max-md:min-w-[44px]"
                              >
                                <Bell size={14} />
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              className="px-2 max-md:min-h-[44px] max-md:min-w-[44px]"
                              onClick={() => setMembroParaRemover({ id: psi.id, nome: psi.nome })}
                              title="Remover da Equipe"
                              aria-label={`Remover ${psi.nome} da equipe`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Fila de Triagem & Encaminhamento Inteligente */}
      <Card className="overflow-hidden">
        <CardHeader>
          <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
            Fila de Triagem & Encaminhamento
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Distribua novos pacientes recebidos pela clínica para o psicólogo com maior disponibilidade ou afinidade de abordagem.
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {triagem.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
              Nenhum paciente pendente na fila de triagem no momento.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {triagem.map((t) => (
                <div key={t.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading font-bold text-sm text-[var(--text-primary)]">
                        {t.nome}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">({t.idade} anos)</span>
                      <Badge variant={t.urgencia === 'alta' ? 'danger' : 'neutral'}>
                        Prioridade {t.urgencia}
                      </Badge>
                      <Badge variant="info">{t.preferenciaAbordagem}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{t.queixaResumo}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                    <select
                      aria-label={`Psicólogo de destino para ${t.nome}`}
                      className="ds-input text-xs py-1.5 min-w-0 sm:flex-1 md:flex-none"
                      value={selectedPsicologoParaTriagem[t.id] || ''}
                      onChange={(e) =>
                        setSelectedPsicologoParaTriagem({
                          ...selectedPsicologoParaTriagem,
                          [t.id]: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione o Psicólogo...</option>
                      {equipe.map((p) => {
                        // Capacidade é sugestão de agenda, não limite: lotado só avisa, não bloqueia
                        const vagas = (p.maxPacientes || MAX_PACIENTES_POR_PSICOLOGO) - (p.pacientesAtivos || 0);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nome} ({vagas > 0 ? `${vagas} vagas` : 'acima da capacidade'}) - {p.especialidade}
                          </option>
                        );
                      })}
                    </select>

                    <Button size="sm" className="shrink-0 max-sm:min-h-[44px]" onClick={() => handleEncaminhar(t.id)}>
                      Encaminhar
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal: Adicionar Psicólogo */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar Psicólogo à Equipe"
        subtitle={`Vagas preenchidas: ${equipe.length} de ${limiteTexto}`}
        size="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="form-adicionar-membro">Salvar Membro</Button>
          </div>
        }
      >
        <form id="form-adicionar-membro" onSubmit={handleAdicionarMembro} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Nome Completo do(a) Psicólogo(a) *
            </label>
            <input
              type="text"
              required
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="ds-input text-sm"
              placeholder="Dr(a). Nome e Sobrenome"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Registro CRP *
              </label>
              <input
                type="text"
                required
                value={novoCrp}
                onChange={(e) => setNovoCrp(e.target.value)}
                className="ds-input text-sm"
                placeholder="06/123456"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="ds-input text-sm"
                placeholder="nome@clinica.com.br"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Especialidade / Abordagem
              </label>
              <input
                type="text"
                value={novaEspecialidade}
                onChange={(e) => setNovaEspecialidade(e.target.value)}
                className="ds-input text-sm"
                placeholder="ex: TCC, Psicanálise, Infanto"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Capacidade Máxima de Pacientes
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={novoMaxPacientes}
                onChange={(e) => setNovoMaxPacientes(Number(e.target.value))}
                className="ds-input text-sm"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: expansão de equipe (Plano Clínica é negociado, sem preço fixo) */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Expandir a equipe"
        subtitle="O Plano Clínica & Equipe é negociado conforme o tamanho da clínica"
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsUpgradeModalOpen(false)}>
              Fechar
            </Button>
            <a
              href={`mailto:${CONTATO_COMERCIAL}?subject=${encodeURIComponent('CARITAS — Expansão de equipe')}`}
              className="ds-btn ds-btn-primary inline-flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Falar com a equipe
            </a>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          <p>
            Sua clínica conta hoje com 1 Líder Clínico e até {limiteTexto} psicólogos, com pacientes ilimitados.
          </p>
          <p>
            Para incluir mais profissionais, escreva para{' '}
            <a href={`mailto:${CONTATO_COMERCIAL}`} className="text-[var(--accent)] font-semibold hover:underline">
              {CONTATO_COMERCIAL}
            </a>
            . O valor é combinado com a equipe CARITAS.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!membroParaRemover}
        title="Remover da equipe"
        message={`Remover ${membroParaRemover?.nome} da equipe supervisionada?`}
        confirmText="Remover"
        onConfirm={handleRemoverMembro}
        onCancel={() => setMembroParaRemover(null)}
        variant="danger"
      />
    </div>
  );
}
