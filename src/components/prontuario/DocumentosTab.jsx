import { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmitirDocumentoModal from './EmitirDocumentoModal';
import { FileCheck, Award, Share2, Receipt, ShieldCheck } from 'lucide-react';

const DOC_TYPES = [
  {
    id: 'declaracao',
    title: 'Declaração Psicológica',
    artigo: 'Art. 9º - Res. CFP nº 06/2019',
    description:
      'Afirma a ocorrência de atendimento e comparecimento do paciente na sessão. Não contém diagnósticos nem sintomas.',
    icon: FileCheck,
    color: 'var(--accent)',
    badgeVariant: 'info',
  },
  {
    id: 'atestado',
    title: 'Atestado Psicológico',
    artigo: 'Art. 10º - Res. CFP nº 06/2019',
    description:
      'Certifica estado ou necessidade de repouso e afastamento de atividades habituais por motivos de saúde psicológica.',
    icon: Award,
    color: 'var(--status-warning)',
    badgeVariant: 'warning',
  },
  {
    id: 'relatorio',
    title: 'Relatório de Encaminhamento',
    artigo: 'Art. 11º e 12º - Res. CFP nº 06/2019',
    description:
      'Comunicação multiprofissional com descrição de demanda, procedimentos adotados, análise técnica e direcionamento.',
    icon: Share2,
    color: 'var(--status-info)',
    badgeVariant: 'neutral',
  },
  {
    id: 'recibo',
    title: 'Recibo para Reembolso',
    artigo: 'Padrão TUSS / Operadoras',
    description:
      'Recibo formal discriminado com código TUSS 50000140, dados do profissional, valor e quitação para operadoras de saúde.',
    icon: Receipt,
    color: 'var(--status-success)',
    badgeVariant: 'success',
  },
];

export default function DocumentosTab({ patient, sessoes = [], psicologo = {} }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState('declaracao');

  const handleOpenEmitir = (tipo) => {
    setSelectedTipo(tipo);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* CFP Compliance Banner */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-heading font-semibold text-[var(--text-primary)]">
            Emissão em Conformidade com a Resolução CFP nº 06/2019
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            Todos os modelos respeitam a estrutura técnica oficial: identificação, descrição objetiva,
            sigilo das informações sensíveis e assinatura com número de inscrição do Conselho Regional de Psicologia.
          </p>
        </div>
      </div>

      {/* Grid de Modelos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOC_TYPES.map((doc) => {
          const Icon = doc.icon;
          return (
            <Card key={doc.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                    <Icon size={22} style={{ color: doc.color }} />
                  </div>
                  <Badge variant={doc.badgeVariant}>{doc.artigo}</Badge>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex justify-end">
                <Button size="sm" onClick={() => handleOpenEmitir(doc.id)}>
                  Emitir {doc.title.split(' ')[0]}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <EmitirDocumentoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tipo={selectedTipo}
        patient={patient}
        sessoes={sessoes}
        psicologo={psicologo}
      />
    </div>
  );
}
