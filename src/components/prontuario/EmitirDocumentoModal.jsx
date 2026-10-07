import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  gerarDeclaracaoPDF,
  gerarAtestadoPDF,
  gerarRelatorioEncaminhamentoPDF,
  gerarReciboReembolsoPDF,
} from '../../services/pdfUtils';
import { trackAction } from '../../services/logService';
import { useToast } from '../../contexts/ToastContext';
import { FileText, Download } from 'lucide-react';

export default function EmitirDocumentoModal({
  isOpen,
  onClose,
  tipo, // 'declaracao' | 'atestado' | 'relatorio' | 'recibo'
  patient,
  sessoes = [],
  psicologo = {},
}) {
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Common Form States
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [finalidade, setFinalidade] = useState('');
  
  // Declaração specific
  const [horario, setHorario] = useState('14:00');
  const [compareceu, setCompareceu] = useState(true);

  // Atestado specific
  const [diasRepouso, setDiasRepouso] = useState(1);
  const [justificativa, setJustificativa] = useState('');

  // Relatório specific
  const [destinatario, setDestinatario] = useState('');
  const [queixa, setQueixa] = useState('');
  const [procedimentos, setProcedimentos] = useState(
    'Atendimento psicoterápico individual clínico, escuta qualificada e avaliação sintomatológica fundamentada nas diretrizes do CFP.'
  );
  const [analise, setAnalise] = useState('');
  const [encaminhamento, setEncaminhamento] = useState('');

  // Recibo specific
  const [selectedSessaoId, setSelectedSessaoId] = useState('');
  const [valor, setValor] = useState(patient?.valor_sessao || '150.00');
  const [formaPagamento, setFormaPagamento] = useState('PIX');

  // CRP & Profissional
  const [nomeProfissional, setNomeProfissional] = useState(psicologo?.nome || 'Psicólogo(a) Responsável');
  const [crpProfissional, setCrpProfissional] = useState(psicologo?.crp || '');
  const [cpfProfissional, setCpfProfissional] = useState(psicologo?.cpf || '');

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().split('T')[0];
    setData(today);

    if (tipo === 'declaracao') {
      setFinalidade('Comprovação de comparecimento para fins trabalhistas / acadêmicos');
    } else if (tipo === 'atestado') {
      setFinalidade('Justificativa de ausência e necessidade de repouso por motivo de saúde');
      setDiasRepouso(1);
    } else if (tipo === 'relatorio') {
      setFinalidade('Encaminhamento e parecer multiprofissional');
      setDestinatario('Médico(a) Psiquiatra / Especialista');
      setQueixa('Paciente em acompanhamento clínico apresentando queixas de ansiedade e estresse.');
      setAnalise('Sintomas indicam necessidade de acompanhamento compartilhado.');
      setEncaminhamento('Encaminha-se para avaliação diagnóstica complementar e conduta compartilhada.');
    } else if (tipo === 'recibo') {
      if (sessoes && sessoes.length > 0) {
        setSelectedSessaoId(sessoes[0].id);
        setData(sessoes[0].data_sessao || today);
        setValor(sessoes[0].valor || patient?.valor_sessao || '150.00');
        setFormaPagamento(sessoes[0].forma_pagamento || 'PIX');
      } else {
        setValor(patient?.valor_sessao || '150.00');
      }
    }
  }, [isOpen, tipo, sessoes, patient]);

  const handleSelectSessaoChange = (sessaoId) => {
    setSelectedSessaoId(sessaoId);
    const s = sessoes.find((item) => item.id === sessaoId);
    if (s) {
      if (s.data_sessao) setData(s.data_sessao);
      if (s.valor) setValor(s.valor);
      if (s.forma_pagamento) setFormaPagamento(s.forma_pagamento);
    }
  };

  const handleGerarDocumento = async () => {
    setIsGenerating(true);
    const prof = {
      nome: nomeProfissional,
      crp: crpProfissional,
      cpf: cpfProfissional,
      clinica: psicologo?.clinica || patient?.clinica,
    };

    try {
      if (tipo === 'declaracao') {
        gerarDeclaracaoPDF(patient, prof, {
          data,
          horario,
          finalidade,
          compareceu,
        });
        trackAction('EMITIR_DECLARACAO_CFP', { patientId: patient.id });
      } else if (tipo === 'atestado') {
        gerarAtestadoPDF(patient, prof, {
          data,
          diasRepouso: Number(diasRepouso),
          finalidade,
          justificativa,
        });
        trackAction('EMITIR_ATESTADO_CFP', { patientId: patient.id, dias: diasRepouso });
      } else if (tipo === 'relatorio') {
        gerarRelatorioEncaminhamentoPDF(patient, prof, {
          data,
          destinatario,
          finalidade,
          queixa,
          procedimentos,
          analise,
          encaminhamento,
        });
        trackAction('EMITIR_RELATORIO_CFP', { patientId: patient.id });
      } else if (tipo === 'recibo') {
        const sessaoObj = sessoes.find((s) => s.id === selectedSessaoId) || {
          data_sessao: data,
          valor,
          forma_pagamento: formaPagamento,
          pago: true,
        };
        gerarReciboReembolsoPDF(sessaoObj, patient, prof, {
          data,
          valor,
          forma_pagamento: formaPagamento,
        });
        trackAction('EMITIR_RECIBO_REEMBOLSO', { patientId: patient.id });
      }

      showToast({ type: 'success', message: 'Documento oficial CFP gerado com sucesso!' });
      onClose();
    } catch {
      showToast({ type: 'error', message: 'Erro ao gerar documento PDF.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const titles = {
    declaracao: 'Declaração Psicológica (Art. 9º CFP)',
    atestado: 'Atestado Psicológico (Art. 10º CFP)',
    relatorio: 'Relatório de Encaminhamento (Art. 11º-12º CFP)',
    recibo: 'Recibo para Reembolso (Operadoras de Saúde)',
  };

  const subtitles = {
    declaracao: `Comprovação oficial de comparecimento para ${patient?.nome}`,
    atestado: `Certificação de necessidade de repouso para ${patient?.nome}`,
    relatorio: `Relatório clínico multiprofissional para ${patient?.nome}`,
    recibo: `Quitação discriminada com dados de reembolso para ${patient?.nome}`,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[tipo] || 'Emitir Documento Oficial'}
      subtitle={subtitles[tipo]}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGerarDocumento} isLoading={isGenerating}>
            <Download size={16} />
            Gerar e Baixar PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Identificação do Profissional Responsável */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Dados do(a) Psicólogo(a) Emissor
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nome</label>
              <input
                type="text"
                value={nomeProfissional}
                onChange={(e) => setNomeProfissional(e.target.value)}
                className="ds-input text-sm py-1.5"
                placeholder="Dr(a). Nome Completo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">CRP</label>
              <input
                type="text"
                value={crpProfissional}
                onChange={(e) => setCrpProfissional(e.target.value)}
                className="ds-input text-sm py-1.5"
                placeholder="06/123456"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">CPF / CNPJ</label>
              <input
                type="text"
                value={cpfProfissional}
                onChange={(e) => setCpfProfissional(e.target.value)}
                className="ds-input text-sm py-1.5"
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </div>

        {/* Campos Específicos por Tipo */}
        {tipo === 'declaracao' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data do Atendimento</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Horário</label>
                <input
                  type="text"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="ds-input text-sm"
                  placeholder="ex: 14:00 às 14:50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Finalidade da Declaração</label>
              <input
                type="text"
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="ds-input text-sm"
                placeholder="Justificativa de ausência no trabalho / faculdade"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)] pt-1">
              <input
                type="checkbox"
                checked={compareceu}
                onChange={(e) => setCompareceu(e.target.checked)}
                className="rounded text-[var(--accent)]"
              />
              Afirmar comparecimento presencial / online nesta data
            </label>
          </div>
        )}

        {tipo === 'atestado' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Dias de Repouso / Afastamento</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={diasRepouso}
                  onChange={(e) => setDiasRepouso(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Finalidade</label>
              <input
                type="text"
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="ds-input text-sm"
                placeholder="Dispensa de atividades por saúde psicológica"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Observações Éticas (Opcional)</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="ds-input text-sm h-20"
                placeholder="Contexto adicional em conformidade com o sigilo do CFP..."
              />
            </div>
          </div>
        )}

        {tipo === 'relatorio' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Destinatário / Solicitante</label>
                <input
                  type="text"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="ds-input text-sm"
                  placeholder="Médico Psiquiatra / Instituição de Ensino"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">1. Descrição da Demanda / Queixa</label>
              <textarea
                value={queixa}
                onChange={(e) => setQueixa(e.target.value)}
                className="ds-input text-sm h-16"
                placeholder="Motivo do encaminhamento e queixa relatada..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">2. Procedimentos e Métodos</label>
              <textarea
                value={procedimentos}
                onChange={(e) => setProcedimentos(e.target.value)}
                className="ds-input text-sm h-16"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">3. Análise Clínica</label>
              <textarea
                value={analise}
                onChange={(e) => setAnalise(e.target.value)}
                className="ds-input text-sm h-16"
                placeholder="Síntese técnica sem revelar dados íntimos desnecessários..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">4. Conclusão e Encaminhamento</label>
              <textarea
                value={encaminhamento}
                onChange={(e) => setEncaminhamento(e.target.value)}
                className="ds-input text-sm h-16"
                placeholder="Direcionamento ou recomendações..."
              />
            </div>
          </div>
        )}

        {tipo === 'recibo' && (
          <div className="space-y-3">
            {sessoes && sessoes.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Vincular a uma Sessão Existente</label>
                <select
                  value={selectedSessaoId}
                  onChange={(e) => handleSelectSessaoChange(e.target.value)}
                  className="ds-input text-sm"
                >
                  <option value="">(Sessão avulsa / manual)</option>
                  {sessoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.data_sessao || 'Sem data'} - R$ {parseFloat(s.valor || 0).toFixed(2)} ({s.pago ? 'Pago' : 'Pendente'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Data da Sessão</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Valor Quitado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="ds-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="ds-input text-sm"
                >
                  <option value="PIX">PIX</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs bg-[var(--status-info-bg)] text-[var(--status-info)] border border-[var(--status-info)]">
              Inclui código TUSS 50000140 (Sessão de Psicoterapia Individual) e declaração formal de quitação aceita pelas principais operadoras de plano de saúde.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
