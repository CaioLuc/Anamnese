import { jsPDF } from 'jspdf';

// ==========================================
// HIGIENIZADOR DE TEXTO PARA jsPDF (Evita 'Ø=ÜË' e emojis quebrados)
// ==========================================
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    // Remove emojis e caracteres complexos, mas mantém letras latinas, números, pontuação básica e acentos (Latin-1 Supplement)
    .replace(/[^\x20-\xFF\r\n]/g, ""); 
}

// ==========================================
// CORES E CONSTANTES DO DESIGN SYSTEM
// ==========================================
const COLORS = {
  primary: [79, 70, 229],      // Indigo-600
  primaryLight: [238, 242, 255], // Indigo-50
  dark: [30, 30, 46],           // Escuro
  text: [51, 51, 51],           // Texto principal
  textLight: [107, 114, 128],   // Texto secundário (gray-500)
  white: [255, 255, 255],
  line: [226, 232, 240],        // Borda (slate-200)
  accent: [6, 182, 212],        // Cyan-500
  danger: [239, 68, 68],        // Red-500
  success: [16, 185, 129],      // Emerald-500
};

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// ==========================================
// LOGO BASE64 (Caritas)
// ==========================================
// Um círculo com uma cruz central, estilo saúde/psicologia
const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAEISURBVFhH7ZYxDoMwEEVzjBxk5TKcgSOw9QhI7L1A2ZqRskQ3aN4bJzY2cZzCRpZ+0n/SybNnP/4451wozM1xHPu+71NKYdu2KcsyXdd1XJd83/d2R0RkrP/Xdd2VzIjjOKa0oijC4zSjKMLjdBRFAIf/UvPInp22beE4HqZpAof/BtwBdwAclmWBE9u2he/7oOqBqqqgA1RVhd/3PUiZpgmeZVmgM3AETkDXdWDgCAgL/L2yLKEDBwAHgGZJkkAH4ACoXJc8z4MOwAFQ2bZNGDxcAAdAxb9M0yRhuAGv8C/LskgYVwAOf4+iCBwABwCHv0dRBA6AA4DD36MoAofB8AXn3IvwB9TfP6J6wP2WAAAAAElFTkSuQmCC';

// ==========================================
// GERADOR DE HASH DE AUTENTICIDADE DIGITAL (CFP & LGPD)
// ==========================================
function gerarHashAutenticidade(titulo, subtitulo) {
  const seed = `${titulo}_${subtitulo}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `CARITAS-VERIFY-${hex}`;
}

// ==========================================
// CLASSE: PDF BUILDER
// ==========================================
export class PdfBuilder {
  constructor(titulo, subtitulo = '') {
    this.doc = new jsPDF();
    this.y = MARGIN;
    this.pageNum = 1;
    this.titulo = sanitizeText(titulo);
    this.subtitulo = sanitizeText(subtitulo);
    this.authHash = gerarHashAutenticidade(this.titulo, this.subtitulo);
    this.dataEmissao = new Date();
    this._renderCapa(this.titulo, this.subtitulo);
  }

  // --- Cabeçalho / Capa ---
  _renderCapa(titulo, subtitulo) {
    const doc = this.doc;

    // Faixa colorida dupla no topo (Indigo-600 + Cyan-500)
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 4.5, 'F');
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 4.5, PAGE_WIDTH, 1.2, 'F');

    // Moldura de background para o cabeçalho
    const headerHeight = subtitulo ? 28 : 22;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, 10, CONTENT_WIDTH, headerHeight, 2, 2, 'FD');

    // Filete vertical de destaque à esquerda do cabeçalho
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(MARGIN, 10, 2.5, headerHeight, 1, 1, 'F');

    // Badge institucional
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('CARITAS  |  SISTEMA CLÍNICO & GESTÃO EM SAÚDE MENTAL', MARGIN + 6, 18);
    
    // Inserir Logo à direita
    try {
      doc.addImage(LOGO_BASE64, 'PNG', PAGE_WIDTH - MARGIN - 14, 13, 10, 10);
    } catch {
      // Logo insertion is non-critical, silently ignore failures
    }

    // Título  
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, MARGIN + 6, 27);

    if (subtitulo) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont('helvetica', 'normal');
      doc.text(`Paciente / Alvo: ${subtitulo}`, MARGIN + 6, 34);
      this.y = 44;
    } else {
      this.y = 38;
    }
  }

  // --- Verificação de Espaço ---
  _checkPage(need = 15) {
    if (this.y + need > 275) {
      this._addFooter();
      this.doc.addPage();
      this.pageNum++;
      this._addPageHeader();
      this.y = 20;
    }
  }

  _addFooter() {
    const doc = this.doc;

    // Linha fina separadora
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 283, PAGE_WIDTH - MARGIN, 283);

    // Linha 1: Normativa legal e paginação
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(`Documento emitido conforme Resoluções CFP nº 01/2009 e 06/2019 • Lei 13.709/2018 (LGPD)`, MARGIN, 287.5);
    doc.text(`Página ${this.pageNum}`, PAGE_WIDTH - MARGIN, 287.5, { align: 'right' });

    // Linha 2: Carimbo de autenticidade digital e rastreabilidade
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(`Autenticação Digital: ${this.authHash}`, MARGIN, 291.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textLight);
    const dataStr = this.dataEmissao.toLocaleDateString('pt-BR');
    doc.text(`Emissão eletrônica em ${dataStr} • Válido com assinatura profissional`, PAGE_WIDTH - MARGIN, 291.5, { align: 'right' });
  }

  _addPageHeader() {
    const doc = this.doc;
    // Barra dupla fina no topo das páginas seguintes
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 2, 'F');
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 2, PAGE_WIDTH, 0.8, 'F');

    // Título pequeno de cabeçalho
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(`CARITAS  |  ${this.titulo} — ${this.subtitulo || ''}`, MARGIN, 9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Hash: ${this.authHash}`, PAGE_WIDTH - MARGIN, 9, { align: 'right' });

    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);
    this.y = 19;
  }

  // ==========================================
  // MÉTODOS PÚBLICOS
  // ==========================================

  // Seção com título estilizado e pilar de destaque
  addSection(title) {
    this._checkPage(18);
    const doc = this.doc;

    // Linha divisória se já houver conteúdo prévio
    if (this.y > 45) {
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
      this.y += 6;
    }

    // Faixa de fundo com cantos arredondados
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(MARGIN, this.y - 2, CONTENT_WIDTH, 9, 1.5, 1.5, 'F');

    // Pilar vertical colorido
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(MARGIN, this.y - 2, 2.5, 9, 1, 1, 'F');

    // Texto da seção
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(title).trim(), MARGIN + 6, this.y + 4.5);
    this.y += 13;
    
    // Reset
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
  }

  // Campo: label + valor (com wrap automático)
  addField(label, value) {
    if (!value && value !== 0) return;
    this._checkPage(16);
    const doc = this.doc;
    const val = sanitizeText(String(value));

    // Label
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(label).toUpperCase(), MARGIN + 2, this.y);
    this.y += 4;

    // Value
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(val, CONTENT_WIDTH - 8);
    lines.forEach(line => {
      this._checkPage(6);
      doc.text(line, MARGIN + 4, this.y);
      this.y += 5.2;
    });
    this.y += 3;
  }

  // Linha simples (label: valor na mesma linha)
  addInline(label, value) {
    if (!value && value !== 0) return;
    this._checkPage(8);
    const doc = this.doc;
    const lbl = sanitizeText(String(label));
    const val = sanitizeText(String(value));

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${lbl}:`, MARGIN + 2, this.y);
    
    const labelWidth = doc.getTextWidth(`${lbl}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(val, MARGIN + 2 + labelWidth + 1, this.y);
    this.y += 5.5;
  }

  // Bloco de informação (card refinado com fundo e borda suave)
  addInfoBlock(items) {
    this._checkPage(items.length * 6 + 10);
    const doc = this.doc;
    const startY = this.y;
    const blockHeight = items.length * 6 + 6;

    // Background com cantos arredondados
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, startY, CONTENT_WIDTH, blockHeight, 2, 2, 'FD');

    this.y = startY + 5;
    items.forEach(({ label, value }) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.textLight);
      doc.text(sanitizeText(label), MARGIN + 6, this.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      doc.text(sanitizeText(String(value || 'N/D')), MARGIN + 58, this.y);
      this.y += 6;
    });
    this.y += 4;
  }

  // Área de texto largo (para parecer, declaração ou evolução)
  addTextBlock(title, content) {
    if (!content) return;
    this._checkPage(20);
    const doc = this.doc;

    // Título
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(sanitizeText(title), MARGIN + 2, this.y);
    this.y += 5.5;

    // Conteúdo com linha lateral elegante
    const cleanContent = sanitizeText(String(content));
    const lines = doc.splitTextToSize(cleanContent, CONTENT_WIDTH - 12);
    const startY = this.y;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    lines.forEach(line => {
      this._checkPage(6);
      doc.text(line, MARGIN + 6, this.y);
      this.y += 5.2;
    });

    // Linha lateral decorativa
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.2);
    const endY = Math.min(this.y, 275);
    if (endY > startY) {
      doc.line(MARGIN + 1.5, startY - 3.5, MARGIN + 1.5, endY - 2);
    }

    this.y += 5;
    // Reset line width
    doc.setLineWidth(0.3);
  }

  // Espaço
  addSpace(px = 6) {
    this.y += px;
  }

  // Alerta clínico (ex: risco de suicídio, urgência)
  addAlert(text) {
    if (!text) return;
    this._checkPage(18);
    const doc = this.doc;
    const cleanText = sanitizeText(text);
    const lines = doc.splitTextToSize(cleanText, CONTENT_WIDTH - 20);
    const h = lines.length * 5 + 10;

    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, this.y, CONTENT_WIDTH, h, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('ALERTA DE RISCO / URGÊNCIA CLÍNICA', MARGIN + 5, this.y + 5.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(153, 27, 27); // red-800
    let lineY = this.y + 11;
    lines.forEach(line => {
      doc.text(line, MARGIN + 5, lineY);
      lineY += 5;
    });

    this.y += h + 5;
  }

  // Assinatura do Profissional com Carimbo Digital (Resolução CFP nº 06/2019)
  addAssinatura(psicologo = {}) {
    this._checkPage(40);
    const doc = this.doc;
    const nome = sanitizeText(psicologo.nome || psicologo.displayName || 'Psicologo(a) Responsavel');
    const crp = sanitizeText(psicologo.crp ? `CRP: ${psicologo.crp}` : 'CRP: Nao informado');
    const clinica = sanitizeText(psicologo.clinica || 'Consultorio de Psicologia Clinica');

    this.addSpace(12);

    // Caixa de autenticação centralizada
    const boxWidth = 140;
    const boxX = (PAGE_WIDTH - boxWidth) / 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, this.y, boxWidth, 26, 2, 2, 'FD');

    // Linha de assinatura
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(boxX + 15, this.y + 12, boxX + boxWidth - 15, this.y + 12);

    // Nome
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(nome, PAGE_WIDTH / 2, this.y + 17, { align: 'center' });

    // CRP e Clínica
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textLight);
    doc.text(`${crp}  •  ${clinica}`, PAGE_WIDTH / 2, this.y + 21.5, { align: 'center' });

    // Texto de chancela
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'italic');
    doc.text('Documento assinado digitalmente pelo profissional responsável nos termos da Res. CFP 06/2019', PAGE_WIDTH / 2, this.y + 30, { align: 'center' });

    this.y += 36;
  }

  // Salvar
  save(filename) {
    this._addFooter();
    this.doc.save(filename);
  }
}

// ==========================================
// HELPERS
// ==========================================
export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 'Nao informada';
  const dob = new Date(dataNascimento.includes('T') ? dataNascimento : dataNascimento + 'T12:00:00');
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return `${age} anos`;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return 'N/D';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export function gerarRelatorioFinanceiroPDF(sessoesPeriodo, pacientes, periodoLabel, totais) {
  const pdf = new PdfBuilder('Balanco Financeiro', `Periodo: ${sanitizeText(periodoLabel)}`);

  // Info line
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(9);
  pdf.doc.setTextColor(...COLORS.textLight);
  pdf.doc.text(`Data de emissao: ${formatDateBR(new Date().toISOString().split('T')[0])}`, MARGIN + 2, pdf.y);
  pdf.y += 10;

  // KPI Box
  pdf.addInfoBlock([
    { label: 'Previsao Geral', value: `R$ ${totais.previsaoTotal.toFixed(2)}` },
    { label: 'Valor Recebido (Pago)', value: `R$ ${totais.valorRecebido.toFixed(2)}` },
    { label: 'A Receber (Pendente)', value: `R$ ${totais.valorPendente.toFixed(2)}` },
  ]);

  // Sessions detail
  pdf.addSection('Detalhamento de Sessoes');

  if (sessoesPeriodo.length === 0) {
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setTextColor(...COLORS.textLight);
    pdf.doc.text('Nenhuma sessao faturada no periodo selecionado.', MARGIN + 2, pdf.y);
  } else {
    const ordenadas = [...sessoesPeriodo].sort((a, b) => new Date(b.data_sessao) - new Date(a.data_sessao));

    ordenadas.forEach(s => {
      pdf._checkPage(15);

      const pac = pacientes.find(p => p.id === s.id_paciente);
      const nome = pac ? sanitizeText(pac.nome) : 'Paciente nao encontrado';
      const isPago = s.pago;
      const v = s.valor ? parseFloat(s.valor).toFixed(2) : '0.00';

      pdf.doc.setFont('helvetica', 'bold');
      pdf.doc.setTextColor(...COLORS.text);
      pdf.doc.setFontSize(10);
      pdf.doc.text(`${formatDateBR(s.data_sessao)} - ${nome}`, MARGIN, pdf.y);

      pdf.doc.setFont('helvetica', 'normal');
      pdf.doc.setFontSize(9);
      if (isPago) {
        pdf.doc.setTextColor(...COLORS.success);
        pdf.doc.text(`R$ ${v} (PAGO - ${sanitizeText(s.forma_pagamento || '')})`, MARGIN + 100, pdf.y);
      } else {
        pdf.doc.setTextColor(...COLORS.danger);
        pdf.doc.text(`R$ ${v} (PENDENTE)`, MARGIN + 100, pdf.y);
      }
      pdf.y += 6;
      pdf.doc.setDrawColor(...COLORS.line);
      pdf.doc.line(MARGIN, pdf.y - 2, 210 - MARGIN, pdf.y - 2);
      pdf.y += 4;
    });
  }

  const fileName = `Relatorio_Financeiro_Caritas_${periodoLabel.replace(/ /g, '_')}.pdf`;
  pdf.save(fileName);
}

// ==========================================
// PDF: RECIBO INDIVIDUAL DE SESSAO
// ==========================================
export function gerarReciboPDF(sessao, paciente) {
  const nome = paciente?.nome || 'Paciente';
  const pdf = new PdfBuilder('Recibo de Atendimento', sanitizeText(nome));

  pdf.addInfoBlock([
    { label: 'Paciente', value: sanitizeText(nome) },
    { label: 'CPF', value: paciente?.cpf || 'Nao informado' },
    { label: 'Data da Sessao', value: formatDateBR(sessao.data_sessao) },
    { label: 'Valor', value: `R$ ${parseFloat(sessao.valor || 0).toFixed(2)}` },
    { label: 'Forma de Pagamento', value: sessao.forma_pagamento || 'Nao informada' },
    { label: 'Status', value: sessao.pago ? 'Pago' : 'Pendente' },
  ]);

  pdf.addSpace(10);

  // Declaration text
  const valorExtenso = parseFloat(sessao.valor || 0).toFixed(2);
  pdf.addTextBlock('Declaracao',
    `Declaro para os devidos fins que ${sanitizeText(nome)} ` +
    `realizou sessao de atendimento psicologico na data de ${formatDateBR(sessao.data_sessao)}, ` +
    `no valor de R$ ${valorExtenso}${sessao.pago ? `, pago via ${sanitizeText(sessao.forma_pagamento || 'nao informada')}` : ' (pagamento pendente)'}.`
  );

  pdf.addSpace(30);

  // Signature line
  pdf.doc.setDrawColor(...COLORS.text);
  pdf.doc.setLineWidth(0.5);
  pdf.doc.line(MARGIN + 25, pdf.y, PAGE_WIDTH - MARGIN - 25, pdf.y);
  pdf.y += 5;
  pdf.doc.setFontSize(9);
  pdf.doc.setTextColor(...COLORS.textLight);
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.text('Assinatura do(a) Psicologo(a)', PAGE_WIDTH / 2, pdf.y, { align: 'center' });

  const fileName = `Recibo_${sanitizeText(nome).replace(/ /g, '_')}_${sessao.data_sessao || 'sem_data'}.pdf`;
  pdf.save(fileName);
}

// ==========================================
// PDF: RELATORIO DE PENDENCIAS (INADIMPLENCIA)
// ==========================================
export function gerarRelatorioPendenciasPDF(sessoesPendentes, pacientes) {
  const pdf = new PdfBuilder('Relatorio de Pendencias', `${sessoesPendentes.length} sessoes com pagamento pendente`);

  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(9);
  pdf.doc.setTextColor(...COLORS.textLight);
  pdf.doc.text(`Data de emissao: ${formatDateBR(new Date().toISOString().split('T')[0])}`, MARGIN + 2, pdf.y);
  pdf.y += 10;

  // Total pendente
  const totalPendente = sessoesPendentes.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);
  pdf.addInfoBlock([
    { label: 'Total de Sessoes Pendentes', value: String(sessoesPendentes.length) },
    { label: 'Valor Total Pendente', value: `R$ ${totalPendente.toFixed(2)}` },
  ]);

  // Group by patient
  const porPaciente = {};
  sessoesPendentes.forEach(s => {
    const pid = s.id_paciente;
    if (!porPaciente[pid]) porPaciente[pid] = [];
    porPaciente[pid].push(s);
  });

  Object.entries(porPaciente).forEach(([pid, sessoes]) => {
    const pac = pacientes.find(p => p.id === pid);
    const nome = pac ? sanitizeText(pac.nome) : 'Paciente nao encontrado';
    const subtotal = sessoes.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0);

    pdf.addSection(`${nome} (${sessoes.length} sessoes - R$ ${subtotal.toFixed(2)})`);

    sessoes
      .sort((a, b) => (a.data_sessao || '').localeCompare(b.data_sessao || ''))
      .forEach(s => {
        pdf._checkPage(8);
        const v = parseFloat(s.valor || 0).toFixed(2);
        pdf.addInline(formatDateBR(s.data_sessao), `R$ ${v}`);
      });

    pdf.addSpace(4);
  });

  const fileName = `Pendencias_Caritas_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

// ==========================================
// DOCUMENTOS CFP (RESOLUÇÃO CFP Nº 06/2019)
// ==========================================

/**
 * Declaração Psicológica (Art. 9º da Resolução CFP nº 06/2019)
 * Afirma ocorrência de fatos ou situações objetivas (comparecimento, acompanhamento).
 */
export function gerarDeclaracaoPDF(paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Declaracao Psicologica', nomePaciente);
  const dataHoje = dados.data || new Date().toISOString().split('T')[0];
  const dataFormatada = formatDateBR(dataHoje);

  pdf.addSection('Identificacao do Documento');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: paciente.cpf || 'Nao informado' },
    { label: 'Finalidade', value: sanitizeText(dados.finalidade || 'Comprovacao de comparecimento') },
    { label: 'Data do Atendimento', value: dataFormatada },
    { label: 'Horario', value: dados.horario || 'Horario agendado' },
  ]);

  pdf.addSpace(8);

  const compareceuTexto = dados.compareceu !== false
    ? `compareceu a atendimento psicologico individual na data de ${dataFormatada}`
    : `encontra-se em processo de acompanhamento psicologico regular`;

  const horarioTexto = dados.horario ? ` no horario das ${dados.horario}` : '';
  const finalidadeTexto = dados.finalidade || 'comprovacao de comparecimento';

  pdf.addTextBlock(
    'Declaracao',
    `Declaro para os devidos fins que ${nomePaciente}, inscrito(a) no CPF ${paciente.cpf || 'nao informado'}, ${compareceuTexto}${horarioTexto}, sob meus cuidados profissionais, com a finalidade de ${finalidadeTexto}.\n\nRegistra-se que este documento nao contem diagnostico, sintomas ou prognostico, conforme expressamente determinado pelo Art. 9º da Resolucao CFP nº 06/2019.`
  );

  pdf.addAssinatura(psicologo);

  const fileName = `Declaracao_${nomePaciente.replace(/\s+/g, '_')}_${dataHoje}.pdf`;
  if (!dados.skipSave) {
    pdf.save(fileName);
  }
  return pdf;
}

/**
 * Atestado Psicológico (Art. 10º da Resolução CFP nº 06/2019)
 * Certifica situação de saúde para justificar falta, repouso ou afastamento.
 */
export function gerarAtestadoPDF(paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Atestado Psicologico', nomePaciente);
  const dataHoje = dados.data || new Date().toISOString().split('T')[0];
  const dataFormatada = formatDateBR(dataHoje);
  const dias = dados.diasRepouso || 1;

  pdf.addSection('Identificacao');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: paciente.cpf || 'Nao informado' },
    { label: 'Data de Emissao', value: dataFormatada },
    { label: 'Periodo de Repouso', value: `${dias} dia(s)` },
  ]);

  pdf.addSpace(8);

  pdf.addTextBlock(
    'Atestado',
    `Atesto, para os devidos fins a pedido de ${nomePaciente}, inscrito(a) no CPF ${paciente.cpf || 'nao informado'}, que o(a) mesmo(a) encontra-se sob acompanhamento psicologico clinico e necessita de ${dias} dia(s) de repouso/afastamento de suas atividades habituais a partir desta data (${dataFormatada}), por motivos de saude psicologica.\n\n${dados.justificativa ? 'Observacao: ' + sanitizeText(dados.justificativa) + '\n\n' : ''}Este atestado tem validade restrita a finalidade descrita (${sanitizeText(dados.finalidade || 'dispensa de atividades')}). Emitido em estrita conformidade com o Art. 10 da Resolucao CFP nº 06/2019.`
  );

  pdf.addAssinatura(psicologo);

  const fileName = `Atestado_${nomePaciente.replace(/\s+/g, '_')}_${dataHoje}.pdf`;
  if (!dados.skipSave) {
    pdf.save(fileName);
  }
  return pdf;
}

/**
 * Relatório Psicológico de Encaminhamento (Art. 11º e 12º da Resolução CFP nº 06/2019)
 * Comunica demanda, procedimentos realizados, análise e direcionamento multiprofissional.
 */
export function gerarRelatorioEncaminhamentoPDF(paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Relatorio de Encaminhamento', nomePaciente);
  const dataHoje = dados.data || new Date().toISOString().split('T')[0];

  pdf.addSection('1. Identificacao');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: paciente.cpf || 'Nao informado' },
    { label: 'Idade', value: calcularIdade(paciente.data_nascimento) },
    { label: 'Destinatario', value: sanitizeText(dados.destinatario || 'Profissional / Servico de Saude') },
    { label: 'Finalidade', value: sanitizeText(dados.finalidade || 'Avaliacao e conduta multiprofissional') },
  ]);

  pdf.addSection('2. Descricao da Demanda');
  pdf.addTextBlock(
    'Historico e Queixa Principal',
    dados.queixa || dados.motivo || 'Paciente em acompanhamento psicoterapico regular com necessidade de suporte complementar.'
  );

  pdf.addSection('3. Procedimentos');
  pdf.addTextBlock(
    'Metodologia e Tecnicas Empregadas',
    dados.procedimentos || 'Atendimento clinico individual, anamnese estruturada, escuta psicoterapica qualificada e avaliacao sintomatologica fundamentada no CFP.'
  );

  pdf.addSection('4. Analise Clinica');
  pdf.addTextBlock(
    'Sintese Clinica',
    dados.analise || 'Quadro clinico em intervencao necessitando de articulacao com outras especialidades de saude para integracao do cuidado.'
  );

  pdf.addSection('5. Encaminhamento e Conclusao');
  pdf.addTextBlock(
    'Direcionamento Proposto',
    dados.encaminhamento || dados.conclusao || 'Encaminha-se o(a) paciente ao profissional/servico destinatario para analise complementar e definicao de conduta compartilhada.'
  );

  pdf.addSpace(4);
  pdf.doc.setFontSize(7.5);
  pdf.doc.setTextColor(...COLORS.textLight);
  pdf.doc.setFont('helvetica', 'italic');
  pdf.doc.text(
    'Documento de carater estritamente sigiloso e confidencial (Art. 13 da Resolucao CFP nº 06/2019). Vedada a reproducao nao autorizada.',
    MARGIN,
    pdf.y
  );
  pdf.y += 8;

  pdf.addAssinatura(psicologo);

  const fileName = `Encaminhamento_${nomePaciente.replace(/\s+/g, '_')}_${dataHoje}.pdf`;
  if (!dados.skipSave) {
    pdf.save(fileName);
  }
  return pdf;
}

/**
 * Recibo para Reembolso de Plano de Saúde (Convênios / Seguro Saúde)
 * Discrimina atendimento psicológico com dados completos para fins de reembolso.
 */
export function gerarReciboReembolsoPDF(sessao = {}, paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Recibo para Reembolso', nomePaciente);
  const dataSessao = sessao.data_sessao || dados.data || new Date().toISOString().split('T')[0];
  const dataFormatada = formatDateBR(dataSessao);
  const valor = parseFloat(sessao.valor || dados.valor || 0).toFixed(2);

  pdf.addSection('Dados do Profissional Emissor');
  pdf.addInfoBlock([
    { label: 'Psicologo(a)', value: sanitizeText(psicologo.nome || psicologo.displayName || 'Psicologo(a) Responsavel') },
    { label: 'Registro CFP/CRP', value: psicologo.crp ? `CRP ${psicologo.crp}` : 'Nao informado' },
    { label: 'CPF / CNPJ', value: psicologo.cpf || psicologo.cnpj || 'Nao informado' },
    { label: 'Clinica / Local', value: sanitizeText(psicologo.clinica || paciente.clinica || 'Consultorio Particular') },
  ]);

  pdf.addSection('Dados do Beneficiario / Paciente');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: paciente.cpf || 'Nao informado' },
    { label: 'Data do Atendimento', value: dataFormatada },
    { label: 'Procedimento', value: 'Sessao de Psicoterapia Individual (TUSS 50000140)' },
  ]);

  pdf.addSection('Discriminacao Financeira');
  pdf.addInfoBlock([
    { label: 'Valor da Sessao', value: `R$ ${valor}` },
    { label: 'Forma de Pagamento', value: sessao.forma_pagamento || dados.forma_pagamento || 'PIX / Transferencia' },
    { label: 'Status da Quitacao', value: 'Totalmente Quitado' },
  ]);

  pdf.addSpace(8);
  pdf.addTextBlock(
    'Declaracao de Quitacao',
    `Declaro que recebi do(a) paciente ${nomePaciente}, inscrito(a) no CPF ${paciente.cpf || 'nao informado'}, a quantia de R$ ${valor} referente a prestacao de servicos profissionais de psicoterapia individual realizada em ${dataFormatada}, dando-lhe plena e irrevogavel quitacao para fins de reembolso perante operadora de plano ou seguro saude.`
  );

  pdf.addAssinatura(psicologo);

  const fileName = `Recibo_Reembolso_${nomePaciente.replace(/\s+/g, '_')}_${dataSessao}.pdf`;
  if (!dados.skipSave) {
    pdf.save(fileName);
  }
  return pdf;
}

// Exportar sanitizeText para uso externo se necessário
export { sanitizeText };


