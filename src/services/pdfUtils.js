import { jsPDF } from 'jspdf';

// ==========================================
// HIGIENIZADOR DE TEXTO PARA jsPDF (Evita 'Ø=ÜË' e emojis quebrados)
// ==========================================
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")                 // Desmonta acentos: 'ç' -> 'c' + '¸'
    .replace(/[\u0300-\u036f]/g, "")  // Remove as marcas de acento
    .replace(/[^\x20-\x7E\r\n]/g, ""); // Remove emojis, travessões e tudo fora do ASCII básico
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

    // Badge Caritas
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('CARITAS', MARGIN + 4, 19);

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
  const pdf = new PdfBuilder();

  // Cabeçalho
  pdf.addHeader('Balanco Financeiro Caritas');

  // Sub-título com o período selecionado
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.setFontSize(11);
  pdf.doc.setTextColor(...COLORS.textLight);
  pdf.doc.text(`Periodo Apurado: ${sanitizeText(periodoLabel)}`, MARGIN, pdf.y);
  pdf.y += 6;
  pdf.doc.text(`Emissao: ${formatDateBR(new Date().toISOString().split('T')[0])}`, MARGIN, pdf.y);
  pdf.y += 15;

  // Caixa de Resumo / KPIs
  pdf.doc.setFillColor(...COLORS.primaryLight);
  pdf.doc.setDrawColor(...COLORS.primary);
  pdf.doc.setLineWidth(0.5);
  pdf.doc.roundedRect(MARGIN, pdf.y, 170, 30, 3, 3, 'FD');
  
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.setTextColor(...COLORS.primary);
  pdf.doc.setFontSize(12);
  
  // Três colunas na caixa
  pdf.doc.text('Previsao Geral:', MARGIN + 5, pdf.y + 10);
  pdf.doc.text(`R$ ${totais.previsaoTotal.toFixed(2)}`, MARGIN + 5, pdf.y + 20);

  pdf.doc.setTextColor(...COLORS.success);
  pdf.doc.text('Valor Recebido (Pago):', MARGIN + 60, pdf.y + 10);
  pdf.doc.text(`R$ ${totais.valorRecebido.toFixed(2)}`, MARGIN + 60, pdf.y + 20);

  pdf.doc.setTextColor(...COLORS.danger);
  pdf.doc.text('A Receber (Inadimplencia):', MARGIN + 120, pdf.y + 10);
  pdf.doc.text(`R$ ${totais.valorPendente.toFixed(2)}`, MARGIN + 120, pdf.y + 20);
  
  pdf.y += 45;

  // Título da Tabela
  pdf.addSectionTitle('Detalhamento de Sessoes (Historico)');
  
  // Iterar sessões desenhando o mini relatório (em vez de tabela, em formato de lista)
  if (sessoesPeriodo.length === 0) {
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setTextColor(...COLORS.textLight);
    pdf.doc.text('Nenhuma sessao faturada no periodo selecionado.', MARGIN, pdf.y);
  } else {
    // Surted
    const ordernadas = [...sessoesPeriodo].sort((a,b) => new Date(b.data_sessao) - new Date(a.data_sessao));
    
    ordernadas.forEach(s => {
      pdf.checkPageBreak(15);
      
      const pac = pacientes.find(p => p.id === s.id_paciente);
      const mNome = pac ? pac.nome : 'Paciente nao encontrado';
      const isPago = s.pago;
      const v = s.valor ? parseFloat(s.valor).toFixed(2) : '0.00';
      
      pdf.doc.setFont('helvetica', 'bold');
      pdf.doc.setTextColor(...COLORS.text);
      pdf.doc.setFontSize(10);
      pdf.doc.text(`${formatDateBR(s.data_sessao)} - ${sanitizeText(mNome)}`, MARGIN, pdf.y);
      
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

  // Baixar
  const fileName = `Relatorio_Financeiro_Caritas_${periodoLabel.replace(/ /g, '_')}.pdf`;
  pdf.save(fileName);
}

// Exportar sanitizeText para uso externo se necessário
export { sanitizeText };
