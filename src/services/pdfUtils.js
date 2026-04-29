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
// CLASSE: PDF BUILDER
// ==========================================
export class PdfBuilder {
  constructor(titulo, subtitulo = '') {
    this.doc = new jsPDF();
    this.y = MARGIN;
    this.pageNum = 1;
    this.titulo = sanitizeText(titulo);
    this.subtitulo = sanitizeText(subtitulo);
    this._renderCapa(this.titulo, this.subtitulo);
  }

  // --- Cabeçalho / Capa ---
  _renderCapa(titulo, subtitulo) {
    const doc = this.doc;

    // Barra colorida no topo
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 4, 'F');

    // Faixa de background para o header
    doc.setFillColor(...COLORS.primaryLight);
    doc.rect(MARGIN, 10, CONTENT_WIDTH, subtitulo ? 28 : 20, 'F');

    // Badge Caritas e Logo
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('CARITAS', MARGIN + 4, 19);
    
    // Inserir Logo à direita
    try {
      doc.addImage(LOGO_BASE64, 'PNG', PAGE_WIDTH - MARGIN - 14, 14, 10, 10);
    } catch(e) {
      // Logo insertion is non-critical, silently ignore failures
    }

    // Título  
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, MARGIN + 4, 28);

    if (subtitulo) {
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitulo, MARGIN + 4, 35);
      this.y = 46;
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
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(`Caritas - Documento gerado automaticamente`, MARGIN, 290);
    doc.text(`Pagina ${this.pageNum}`, PAGE_WIDTH - MARGIN, 290, { align: 'right' });
    // Linha fina
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 287, PAGE_WIDTH - MARGIN, 287);
  }

  _addPageHeader() {
    const doc = this.doc;
    // Barra fina no topo das páginas seguintes
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_WIDTH, 2, 'F');
    // Título pequeno
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'italic');
    doc.text(this.titulo, MARGIN, 10);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 13, PAGE_WIDTH - MARGIN, 13);
    this.y = 20;
  }

  // ==========================================
  // MÉTODOS PÚBLICOS
  // ==========================================

  // Seção com título colorido
  addSection(title) {
    this._checkPage(20);
    const doc = this.doc;

    // Linha separadora
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y += 8;

    // Faixa de fundo
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(MARGIN, this.y - 3, CONTENT_WIDTH, 10, 1, 1, 'F');

    // Texto
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(title).trim(), MARGIN + 4, this.y + 4);
    this.y += 14;
    
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
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(label).toUpperCase(), MARGIN + 2, this.y);
    this.y += 4.5;

    // Value
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(val, CONTENT_WIDTH - 8);
    lines.forEach(line => {
      this._checkPage(7);
      doc.text(line, MARGIN + 4, this.y);
      this.y += 5.5;
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

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${lbl}:`, MARGIN + 2, this.y);
    
    const labelWidth = doc.getTextWidth(`${lbl}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(val, MARGIN + 2 + labelWidth + 1, this.y);
    this.y += 6;
  }

  // Bloco de informação (card com fundo)
  addInfoBlock(items) {
    this._checkPage(items.length * 6 + 10);
    const doc = this.doc;
    const startY = this.y;
    const blockHeight = items.length * 6 + 6;

    // Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, startY, CONTENT_WIDTH, blockHeight, 2, 2, 'FD');

    this.y = startY + 5;
    items.forEach(({ label, value }) => {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.textLight);
      doc.text(sanitizeText(label), MARGIN + 5, this.y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.dark);
      doc.text(sanitizeText(String(value || 'N/D')), MARGIN + 55, this.y);
      this.y += 6;
    });
    this.y += 4;
  }

  // Área de texto largo (para evolução, parecer, etc.)
  addTextBlock(title, content) {
    if (!content) return;
    this._checkPage(20);
    const doc = this.doc;

    // Título
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(sanitizeText(title), MARGIN + 2, this.y);
    this.y += 6;

    // Conteúdo com linha lateral
    const cleanContent = sanitizeText(String(content));
    const lines = doc.splitTextToSize(cleanContent, CONTENT_WIDTH - 12);
    const startY = this.y;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    lines.forEach(line => {
      this._checkPage(6);
      doc.text(line, MARGIN + 6, this.y);
      this.y += 5.5;
    });

    // Linha lateral decorativa
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    const endY = Math.min(this.y, 275);
    if (endY > startY) {
      doc.line(MARGIN + 1, startY - 4, MARGIN + 1, endY - 2);
    }

    this.y += 5;
    // Reset line width
    doc.setLineWidth(0.3);
  }

  // Espaço
  addSpace(px = 6) {
    this.y += px;
  }

  // Alerta (ex: risco de suicídio)
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
    doc.text('ALERTA DE RISCO', MARGIN + 5, this.y + 5.5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(153, 27, 27); // red-800
    let lineY = this.y + 11;
    lines.forEach(line => {
      doc.text(line, MARGIN + 5, lineY);
      lineY += 5;
    });

    this.y += h + 5;
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

// Exportar sanitizeText para uso externo se necessário
export { sanitizeText };

