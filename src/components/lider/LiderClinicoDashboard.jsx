import { useState } from 'react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
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
  Check,
} from 'lucide-react';

export default function LiderClinicoDashboard() {
  const { showToast } = useToast();
  const [equipe, setEquipe] = useState(() => obterEquipeLider());
  const [triagem, setTriagem] = useState(() => obterFilaTriagem());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPsicologoParaTriagem, setSelectedPsicologoParaTriagem] = useState({});

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
      });
      showToast({ type: 'success', message: 'Psicólogo adicionado à equipe com sucesso!' });
      setIsAddModalOpen(false);
      setNovoNome('');
      setNovoCrp('');
      setNovoEmail('');
      setNovaEspecialidade('');
      setNovoMaxPacientes(25);
      carregarDados();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao adicionar membro.' });
    }
  };

  const handleRemoverMembro = (id, nome) => {
    if (confirm(`Remover ${nome} da equipe supervisionada?`)) {
      removerMembroEquipe(id);
      showToast({ type: 'info', message: `${nome} removido da equipe.` });
      carregarDados();
    }
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
    <div className="w-full space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)]">
              Liderança Clínica & Supervisão
            </h2>
            <Badge variant="info">
              {equipe.length}/{MAX_PSICOLOGOS_EQUIPE} Profissionais
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Supervisão de equipe, balanceamento de capacidade e conformidade de prontuários com Resoluções CFP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {equipe.length >= MAX_PSICOLOGOS_EQUIPE ? (
            <Button
              variant="secondary"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="shrink-0"
            >
              <Zap size={18} className="text-amber-500" />
              Expandir Equipe (Upgrade)
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="shrink-0"
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
            {metricas.totalProfissionais} <span className="text-sm font-normal text-[var(--text-muted)]">/ {MAX_PSICOLOGOS_EQUIPE} vagas</span>
          </div>
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[var(--accent)] h-1.5 rounded-full transition-all"
              style={{ width: `${(metricas.totalProfissionais / MAX_PSICOLOGOS_EQUIPE) * 100}%` }}
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider font-semibold bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-6 py-4">Profissional / CRP</th>
                    <th className="px-6 py-4">Especialidade</th>
                    <th className="px-6 py-4">Carga / Capacidade</th>
                    <th className="px-6 py-4 text-center">Sessões / Mês</th>
                    <th className="px-6 py-4 text-center">Conformidade (&gt;48h)</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {equipe.map((psi) => {
                    const cap = psi.maxPacientes || MAX_PACIENTES_POR_PSICOLOGO;
                    const ocupacao = Math.round(((psi.pacientesAtivos || 0) / cap) * 100);
                    const temPendencia = (psi.evolucoesPendentes || 0) > 0;
                    const isLotado = (psi.pacientesAtivos || 0) >= cap;

                    return (
                      <tr key={psi.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-[var(--text-primary)]">{psi.nome}</div>
                          <div className="text-xs text-[var(--text-muted)]">{psi.crp} • {psi.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {psi.especialidade}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between text-xs mb-1">
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
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-[var(--text-primary)]">
                          {psi.sessoesMes || 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {temPendencia ? (
                            <Badge variant="danger">
                              {psi.evolucoesPendentes} pendência(s)
                            </Badge>
                          ) : (
                            <Badge variant="success">Em dia</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {temPendencia && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleNotificarPendencia(psi)}
                                title="Notificar sobre anotações pendentes"
                              >
                                <Bell size={14} />
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              className="px-2"
                              onClick={() => handleRemoverMembro(psi.id, psi.nome)}
                              title="Remover da Equipe"
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
                <div key={t.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      className="ds-input text-xs py-1.5"
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
                        const vagas = (p.maxPacientes || 25) - (p.pacientesAtivos || 0);
                        return (
                          <option key={p.id} value={p.id} disabled={vagas <= 0}>
                            {p.nome} ({vagas} vagas) - {p.especialidade}
                          </option>
                        );
                      })}
                    </select>

                    <Button size="sm" onClick={() => handleEncaminhar(t.id)}>
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
        subtitle={`Vagas preenchidas: ${equipe.length} de ${MAX_PSICOLOGOS_EQUIPE}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarMembro}>Salvar Membro</Button>
          </div>
        }
      >
        <form onSubmit={handleAdicionarMembro} className="space-y-4 py-2">
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

      {/* Modal: Upgrade de Plano (Mais Psicólogos e Mais Pacientes) */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Expansão de Equipe & Planos de Clínica"
        subtitle="Adicione mais psicólogos e aumente o teto de pacientes por profissional"
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsUpgradeModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              showToast({ type: 'success', message: 'Solicitação de upgrade enviada! Entraremos em contato com a fatura Asaas.' });
              setIsUpgradeModalOpen(false);
            }}>
              <Zap size={16} />
              Contratar Upgrade (Asaas)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Seu pacote atual é o <strong className="text-[var(--text-primary)]">Plano Clínica Standard</strong> com 1 Líder Clínico, 8 psicólogos credenciados e limite de 20 pacientes por psicólogo (total de 160 pacientes).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Standard (Atual) */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Plano Atual</span>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)]">Clínica Standard</h4>
              <p className="text-xl font-bold text-[var(--text-primary)]">Incluso</p>
              <ul className="text-xs text-[var(--text-secondary)] space-y-2 pt-2 border-t border-[var(--border)]">
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Até 8 Psicólogos</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> 20 Pacientes/psi (160 tot.)</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Painel de Liderança</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-card)] space-y-3 relative shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">Recomendado</span>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)]">Clínica Pro</h4>
              <p className="text-xl font-bold text-[var(--text-primary)]">R$ 490<span className="text-xs font-normal text-[var(--text-muted)]">/mês</span></p>
              <ul className="text-xs text-[var(--text-secondary)] space-y-2 pt-2 border-t border-[var(--border)]">
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Até 15 Psicólogos</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> 35 Pacientes/psi (525 tot.)</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Triagem Automatizada</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Cobrança Asaas Integrada</li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Redes & Hospitais</span>
              <h4 className="font-heading font-bold text-base text-[var(--text-primary)]">Enterprise</h4>
              <p className="text-xl font-bold text-[var(--text-primary)]">Sob Medida</p>
              <ul className="text-xs text-[var(--text-secondary)] space-y-2 pt-2 border-t border-[var(--border)]">
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Psicólogos Ilimitados</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Pacientes Ilimitados</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Múltiplos Líderes Clínicos</li>
                <li className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> SLA e Auditoria CFP</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
