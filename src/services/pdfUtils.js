import { jsPDF } from 'jspdf';
import { dataLocalISO } from '../utils/formatUtils';

// ==========================================
// HIGIENIZADOR DE TEXTO PARA jsPDF (Evita 'Ø=ÜË' e emojis quebrados)
// ==========================================
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/€/g, 'EUR')
    // Remove emojis e caracteres complexos, mas mantém letras latinas, números, pontuação básica e acentos (Latin-1 Supplement)
    .replace(/[^\x20-\xFF\r\n]/g, "");
}

// ==========================================
// IDENTIDADE VISUAL DOS DOCUMENTOS
// ==========================================
const COR = {
  marca: [14, 107, 102],
  marcaClara: [227, 240, 238],
  tinta: [27, 36, 34],
  texto: [52, 61, 58],
  suave: [100, 110, 105],
  linha: [218, 214, 206],
  papel: [248, 246, 241],
  perigo: [180, 35, 24],
  perigoClaro: [253, 236, 234],
  perigoTexto: [122, 25, 16],
  sucesso: [46, 125, 79],
  branco: [255, 255, 255],
};

const MARGEM = 18;
const LARGURA = 210;
const CONTEUDO = LARGURA - MARGEM * 2;
const LIMITE_Y = 272; // abaixo disso fica o rodapé
const ENTRELINHA = 4.9;

// Textos que significam "sem resposta": nunca viram linha no documento
const SEM_RESPOSTA = new Set(['n/d', 'n/i', 'não informado', 'nao informado', 'não informada', 'nao informada', '-', '—', '?', 'undefined', 'null']);

/** Há conteúdo real para imprimir? (false, vazio, só espaços e marcadores como "N/D" não contam) */
export function temValor(v) {
  if (v === null || v === undefined || v === false) return false;
  if (Array.isArray(v)) return v.some(temValor);
  const s = String(v).trim();
  return s !== '' && !SEM_RESPOSTA.has(s.toLowerCase());
}

/** Junta só as partes preenchidas: juntar(['Ana', '', '45 anos']) → 'Ana, 45 anos' */
export function juntar(partes, separador = ', ') {
  return partes.filter(temValor).map((p) => String(p).trim()).join(separador);
}

/** Lê valores em formato brasileiro ou numérico: '1.250,00' → 1250, '150.00' → 150, '' → 0 */
export function paraNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  let s = String(valor ?? '').replace(/[^\d.,-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** 'CRP 06/123' ou '06/123' → 'CRP 06/123' */
const crpFormatado = (crp) => (temValor(crp) ? `CRP ${String(crp).replace(/^\s*CRP\s*/i, '')}` : '');

export function formatarMoeda(valor) {
  const n = paraNumero(valor);
  return `R$ ${(Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==========================================
// VALOR POR EXTENSO (recibos)
// ==========================================
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function extensoAte999(n) {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [];
  if (c) partes.push(CENTENAS[c]);
  if (resto < 20) {
    if (resto) partes.push(UNIDADES[resto]);
  } else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
  }
  return partes.join(' e ');
}

function extensoInteiro(n) {
  if (n === 0) return 'zero';
  const milhoes = Math.floor(n / 1e6);
  const milhares = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : `${extensoAte999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? 'mil' : `${extensoAte999(milhares)} mil`);
  if (resto) partes.push(extensoAte999(resto));
  // "e" antes do último grupo quando ele é < 100 ou centena redonda (ex.: mil e cem, mil e vinte)
  if (partes.length > 1 && resto && (resto < 100 || resto % 100 === 0)) {
    const ultimo = partes.pop();
    return `${partes.join(', ')} e ${ultimo}`;
  }
  return partes.join(partes.length > 1 && resto ? ' ' : ' e ');
}

/** 150.5 → 'cento e cinquenta reais e cinquenta centavos'. Fora de 0..999.999.999,99 retorna ''. */
export function valorPorExtenso(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero >= 1e9) return '';
  const total = Math.round(numero * 100);
  const reais = Math.floor(total / 100);
  const centavos = total % 100;
  const partes = [];
  if (reais) {
    const sufixo = reais % 1e6 === 0 ? ' de reais' : '';
    partes.push(`${extensoInteiro(reais)}${sufixo} ${reais === 1 ? 'real' : 'reais'}`.replace(' de reais reais', ' de reais'));
  }
  if (centavos) partes.push(`${extensoInteiro(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return partes.length ? partes.join(' e ') : 'zero real';
}

// ==========================================
// CÓDIGO DE CONTROLE DO DOCUMENTO
// ==========================================
// Identifica a emissão no rodapé. Não é assinatura digital (ICP-Brasil).
function gerarCodigoControle(titulo, subtitulo) {
  const seed = `${titulo}_${subtitulo}_${Date.now()}_${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `CRT-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

const dataPorExtenso = (d = new Date()) =>
  d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

// ==========================================
// CLASSE: PDF BUILDER
// ==========================================
/**
 * Monta documentos A4 com a identidade do CARITAS.
 * Seções são "preguiçosas": addSection só desenha o título quando a seção
 * recebe o primeiro conteúdo. Campos vazios são ignorados, então nenhuma
 * seção sai em branco.
 *
 * @param {string} titulo
 * @param {string} [subtitulo] normalmente o nome do paciente
 * @param {{ profissional?: object, rotulo?: string }} [opcoes] rotulo do subtítulo (padrão "Paciente"; '' para nenhum)
 */
export class PdfBuilder {
  constructor(titulo, subtitulo = '', opcoes = {}) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.titulo = sanitizeText(titulo);
    this.subtitulo = sanitizeText(subtitulo);
    this.profissional = opcoes.profissional || null;
    this.rotulo = opcoes.rotulo ?? 'Paciente';
    this.codigo = gerarCodigoControle(this.titulo, this.subtitulo);
    this.authHash = this.codigo;
    this.dataEmissao = new Date();
    this.secaoPendente = null;
    this.numeroSecao = 0;
    this.y = MARGEM;
    this._renderCabecalho();
  }

  // --- Marca vetorial (esfera + onda do logo) ---
  _desenharMarca(x, y, tamanho) {
    const doc = this.doc;
    const r = tamanho / 2;
    const cx = x + r;
    const cy = y + r;
    doc.setFillColor(...COR.marca);
    doc.circle(cx, cy, r, 'F');
    const s = (2 * r * 0.86) / 156; // onda ocupa a esfera de raio 78 do SVG original
    doc.setDrawColor(...COR.branco);
    doc.setLineWidth(Math.max(tamanho * 0.045, 0.3));
    doc.setLineCap('round');
    doc.lines(
      [[10, 0, 16, -14, 26, -14], [10, 0, 12, 20, 22, 14], [10, -6, 14, -18, 24, -14], [10, 4, 14, 12, 24, 10]],
      cx + (52 - 100) * s, cy + (108 - 100) * s, [s, s], 'S', false
    );
    doc.setLineCap('butt');
  }

  _renderCabecalho() {
    const doc = this.doc;

    this._desenharMarca(MARGEM, 10.5, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COR.tinta);
    doc.setCharSpace(0.9);
    doc.text('CARITAS', MARGEM + 12, 15.4);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COR.suave);
    doc.text('Prontuário clínico · Psicologia', MARGEM + 12, 19.4);

    const prof = this.profissional;
    if (prof && temValor(prof.nome || prof.displayName)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COR.tinta);
      doc.text(sanitizeText(prof.nome || prof.displayName), LARGURA - MARGEM, 15, { align: 'right' });
      const linha2 = juntar([crpFormatado(prof.crp), prof.clinica], ' · ');
      if (linha2) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COR.suave);
        doc.text(sanitizeText(linha2), LARGURA - MARGEM, 19.4, { align: 'right' });
      }
    }

    doc.setDrawColor(...COR.marca);
    doc.setLineWidth(0.5);
    doc.line(MARGEM, 25, LARGURA - MARGEM, 25);

    // Título do documento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...COR.tinta);
    const linhasTitulo = doc.splitTextToSize(this.titulo, CONTEUDO);
    let y = 36;
    linhasTitulo.forEach((l) => { doc.text(l, MARGEM, y); y += 7; });

    if (this.subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...COR.texto);
      doc.text(this.rotulo ? `${this.rotulo}: ${this.subtitulo}` : this.subtitulo, MARGEM, y);
      y += 6;
    }

    doc.setFontSize(8);
    doc.setTextColor(...COR.suave);
    const hora = this.dataEmissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Emitido em ${this.dataEmissao.toLocaleDateString('pt-BR')} às ${hora} · Código de controle ${this.codigo}`, MARGEM, y);
    this.y = y + 9;
  }

  _cabecalhoContinuacao() {
    const doc = this.doc;
    this._desenharMarca(MARGEM, 8.2, 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR.tinta);
    doc.text('CARITAS', MARGEM + 7, 11.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR.suave);
    const contexto = juntar([this.titulo, this.subtitulo], ' · ');
    doc.text(doc.splitTextToSize(contexto, CONTEUDO - 30)[0], MARGEM + 21, 11.8);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, 15, LARGURA - MARGEM, 15);
    this.y = 24;
  }

  // Rodapé com "Página X de Y" em todas as páginas (desenhado ao salvar)
  _renderRodapes() {
    const doc = this.doc;
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setDrawColor(...COR.linha);
      doc.setLineWidth(0.3);
      doc.line(MARGEM, 281, LARGURA - MARGEM, 281);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COR.suave);
      doc.text('Documento confidencial · Res. CFP nº 01/2009 e nº 06/2019 · LGPD (Lei nº 13.709/2018)', MARGEM, 285.5);
      doc.text(`Página ${p} de ${total}`, LARGURA - MARGEM, 285.5, { align: 'right' });
      doc.text(`Código de controle ${this.codigo}`, MARGEM, 289.5);
      doc.text(`Gerado pelo CARITAS em ${this.dataEmissao.toLocaleDateString('pt-BR')}`, LARGURA - MARGEM, 289.5, { align: 'right' });
    }
  }

  // --- Paginação ---
  _checkPage(need = 15) {
    if (this.y + need > LIMITE_Y) {
      this.doc.addPage();
      this._cabecalhoContinuacao();
    }
  }

  // Desenha o título da seção pendente (só quando há conteúdo)
  _abrirSecao(espacoMinimo = 14) {
    if (!this.secaoPendente) return;
    const titulo = this.secaoPendente;
    this.secaoPendente = null;
    this._checkPage(12 + espacoMinimo);
    const doc = this.doc;
    this.numeroSecao += 1;
    if (this.numeroSecao > 1) this.y += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.marca);
    doc.setCharSpace(0.35);
    doc.text(`${this.numeroSecao}. ${titulo.toUpperCase()}`, MARGEM, this.y);
    doc.setCharSpace(0);
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, this.y + 2.4, LARGURA - MARGEM, this.y + 2.4);
    this.y += 9;
  }

  _rotulo(texto, x, y) {
    const doc = this.doc;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COR.suave);
    doc.setCharSpace(0.2);
    doc.text(sanitizeText(texto).toUpperCase(), x, y);
    doc.setCharSpace(0);
  }

  // Texto corrido que pode atravessar páginas
  _paragrafo(texto, x, largura, { tamanho = 9.8, cor = COR.texto, estilo = 'normal' } = {}) {
    const doc = this.doc;
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(sanitizeText(String(texto)).trim(), largura);
    linhas.forEach((linha) => {
      if (this.y + ENTRELINHA > LIMITE_Y) {
        this.doc.addPage();
        this._cabecalhoContinuacao();
        doc.setFont('helvetica', estilo);
        doc.setFontSize(tamanho);
        doc.setTextColor(...cor);
      }
      doc.text(linha, x, this.y);
      this.y += ENTRELINHA;
    });
  }

  // ==========================================
  // MÉTODOS PÚBLICOS
  // ==========================================

  /** Abre uma seção numerada. Ela só aparece se algo for adicionado depois. */
  addSection(title) {
    this.secaoPendente = sanitizeText(title).trim();
  }

  /** Campo de largura total: rótulo acima, valor com quebra automática. */
  addField(label, value) {
    if (!temValor(value)) return;
    this._abrirSecao();
    this._checkPage(12);
    this.doc.setFontSize(7);
    this.doc.splitTextToSize(sanitizeText(label).toUpperCase(), CONTEUDO - 6).forEach((linha, i) => {
      if (i) this.y += 3.6;
      this._rotulo(linha, MARGEM, this.y);
    });
    this.y += 4.4;
    this._paragrafo(Array.isArray(value) ? value.filter(temValor).join(', ') : value, MARGEM, CONTEUDO);
    this.y += 3;
  }

  /** "Rótulo: valor" em uma linha. */
  addInline(label, value) {
    if (!temValor(value)) return;
    this._abrirSecao();
    this._checkPage(7);
    const doc = this.doc;
    const lbl = `${sanitizeText(String(label))}:`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.tinta);
    doc.text(lbl, MARGEM, this.y);
    const recuo = doc.getTextWidth(`${lbl} `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COR.texto);
    const linhas = doc.splitTextToSize(sanitizeText(String(value)), CONTEUDO - recuo);
    doc.text(linhas[0], MARGEM + recuo, this.y);
    this.y += ENTRELINHA + 0.6;
    if (linhas.length > 1) this._paragrafo(linhas.slice(1).join(' '), MARGEM + recuo, CONTEUDO - recuo, { tamanho: 9.5 });
  }

  /**
   * Grade de campos curtos em duas colunas. Itens vazios são omitidos;
   * se nenhum tiver valor, nada é desenhado (nem o título da seção).
   * @param {{label: string, value: any, largo?: boolean}[]} items
   */
  addInfoBlock(items) {
    const preenchidos = items.filter((i) => temValor(i.value));
    if (!preenchidos.length) return;
    this._abrirSecao();
    const doc = this.doc;
    const larguraColuna = (CONTEUDO - 8) / 2;

    doc.setFontSize(9.8);
    let fila = [];
    const descarregar = () => {
      if (!fila.length) return;
      // Item sozinho na linha ocupa a largura toda
      const largura = fila.length === 1 ? CONTEUDO : larguraColuna;
      const alturas = fila.map((i) => doc.splitTextToSize(sanitizeText(String(i.value)), largura).length);
      const altura = 4.4 + Math.max(...alturas) * ENTRELINHA + 2.6;
      this._checkPage(altura);
      const y0 = this.y;
      fila.forEach((item, idx) => {
        const x = MARGEM + idx * (larguraColuna + 8);
        this._rotulo(item.label, x, y0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.8);
        doc.setTextColor(...COR.tinta);
        doc.splitTextToSize(sanitizeText(String(item.value)), largura)
          .forEach((linha, n) => doc.text(linha, x, y0 + 4.4 + n * ENTRELINHA));
      });
      this.y = y0 + altura;
      fila = [];
    };

    preenchidos.forEach((item) => {
      doc.setFontSize(9.8);
      const longo = item.largo || doc.splitTextToSize(sanitizeText(String(item.value)), larguraColuna).length > 2;
      if (longo) {
        descarregar();
        this.addField(item.label, item.value);
        return;
      }
      fila.push(item);
      if (fila.length === 2) descarregar();
    });
    descarregar();
    this.y += 1.5;
  }

  /** Bloco de texto longo com subtítulo (parecer, evolução, declaração). */
  addTextBlock(title, content) {
    if (!temValor(content)) return;
    this._abrirSecao(18);
    this._checkPage(14);
    if (title) {
      this._rotulo(title, MARGEM, this.y);
      this.y += 4.6;
    }
    this._paragrafo(content, MARGEM, CONTEUDO);
    this.y += 3.5;
  }

  /** Subtítulo dentro de uma seção (ex.: "Sessão 3 · 12/10/2026"). */
  addSubtitulo(texto) {
    if (!temValor(texto)) return;
    this._abrirSecao(30);
    this._checkPage(30);
    const doc = this.doc;
    doc.setFillColor(...COR.papel);
    doc.rect(MARGEM, this.y - 4.2, CONTEUDO, 6.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.tinta);
    doc.text(sanitizeText(texto), MARGEM + 2.5, this.y);
    this.y += 6.5;
  }

  /** Nota curta em itálico (avisos de sigilo, observações legais). */
  addNota(texto) {
    if (!temValor(texto)) return;
    this._checkPage(10);
    this._paragrafo(texto, MARGEM, CONTEUDO, { tamanho: 8, cor: COR.suave, estilo: 'italic' });
    this.y += 2;
  }

  // Espaço
  addSpace(mm = 6) {
    this.y += mm;
  }

  /** Alerta clínico (ex.: risco de suicídio). */
  addAlert(text, titulo = 'Atenção: risco clínico') {
    if (!temValor(text)) return;
    const doc = this.doc;
    doc.setFontSize(9.2);
    const linhas = doc.splitTextToSize(sanitizeText(text), CONTEUDO - 10);
    const h = linhas.length * ENTRELINHA + 11;
    // Caixa não quebra página: texto longo demais segue como bloco comum
    if (h > 150) {
      this.addTextBlock(titulo, text);
      return;
    }
    this._abrirSecao(h + 2);
    this._checkPage(h + 2);

    doc.setFillColor(...COR.perigoClaro);
    doc.setDrawColor(...COR.perigo);
    doc.setLineWidth(0.35);
    doc.roundedRect(MARGEM, this.y - 1, CONTEUDO, h, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COR.perigo);
    doc.setCharSpace(0.2);
    doc.text(titulo.toUpperCase(), MARGEM + 5, this.y + 4.5);
    doc.setCharSpace(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...COR.perigoTexto);
    linhas.forEach((l, i) => doc.text(l, MARGEM + 5, this.y + 9.8 + i * ENTRELINHA));
    this.y += h + 4;
  }

  /**
   * Tabela simples com cabeçalho repetido a cada página.
   * @param {{titulo: string, largura: number, alinhar?: 'left'|'right'}[]} colunas larguras em mm (somam ≤ 174)
   * @param {string[][]} linhas
   */
  addTabela(colunas, linhas) {
    if (!linhas.length) return;
    this._abrirSecao(20);
    const doc = this.doc;
    const xs = [];
    colunas.reduce((x, c) => { xs.push(x); return x + c.largura; }, MARGEM);

    const cabecalho = () => {
      doc.setFillColor(...COR.marcaClara);
      doc.rect(MARGEM, this.y - 4.5, CONTEUDO, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COR.marca);
      colunas.forEach((c, i) => {
        const x = c.alinhar === 'right' ? xs[i] + c.largura - 2 : xs[i] + 2;
        doc.text(c.titulo.toUpperCase(), x, this.y, { align: c.alinhar === 'right' ? 'right' : 'left' });
      });
      this.y += 6.5;
    };

    this._checkPage(16);
    cabecalho();
    linhas.forEach((linha, n) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      const celulas = linha.map((v, i) => doc.splitTextToSize(sanitizeText(String(v ?? '')), colunas[i].largura - 4));
      const h = Math.max(...celulas.map((c) => c.length)) * 4.3 + 2.6;
      if (this.y + h > LIMITE_Y) {
        doc.addPage();
        this._cabecalhoContinuacao();
        cabecalho();
      }
      if (n % 2 === 1) {
        doc.setFillColor(...COR.papel);
        doc.rect(MARGEM, this.y - 4, CONTEUDO, h, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(...COR.tinta);
      celulas.forEach((c, i) => {
        const col = colunas[i];
        const x = col.alinhar === 'right' ? xs[i] + col.largura - 2 : xs[i] + 2;
        c.forEach((l, k) => doc.text(l, x, this.y + k * 4.3, { align: col.alinhar === 'right' ? 'right' : 'left' }));
      });
      this.y += h;
    });
    doc.setDrawColor(...COR.linha);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, this.y - 3.2, LARGURA - MARGEM, this.y - 3.2);
    this.y += 3;
  }

  /** Local/data, linha de assinatura, nome e CRP do profissional (Res. CFP 06/2019). */
  addAssinatura(psicologo = {}) {
    this._checkPage(44);
    const doc = this.doc;
    const nome = sanitizeText(psicologo.nome || psicologo.displayName || 'Psicólogo(a) responsável');
    const linha2 = juntar([crpFormatado(psicologo.crp), psicologo.clinica], ' · ');

    this.y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COR.texto);
    const local = temValor(psicologo.cidade) ? `${sanitizeText(psicologo.cidade)}, ` : '';
    doc.text(`${local}${dataPorExtenso(this.dataEmissao)}.`, LARGURA - MARGEM, this.y, { align: 'right' });

    this.y += 22;
    const largura = 82;
    const x0 = (LARGURA - largura) / 2;
    doc.setDrawColor(...COR.tinta);
    doc.setLineWidth(0.35);
    doc.line(x0, this.y, x0 + largura, this.y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COR.tinta);
    doc.text(nome, LARGURA / 2, this.y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...COR.suave);
    if (linha2) doc.text(sanitizeText(linha2), LARGURA / 2, this.y + 9.4, { align: 'center' });
    doc.setFontSize(7.2);
    doc.text('Assinatura e carimbo do(a) psicólogo(a)', LARGURA / 2, this.y + (linha2 ? 13.4 : 9.4), { align: 'center' });
    this.y += 20;
  }

  // Salvar
  save(filename) {
    this._renderRodapes();
    this.doc.save(filename);
  }
}

// ==========================================
// HELPERS
// ==========================================
export function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 'Nao informada';
  const dob = new Date(dataNascimento.includes('T') ? dataNascimento : dataNascimento + 'T12:00:00');
  if (isNaN(dob.getTime())) return 'Nao informada';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return `${age} anos`;
}

export function formatDateBR(dateStr) {
  if (!dateStr) return 'N/D';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

const formatarCPF = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : (cpf || '');
};

const nomeArquivo = (...partes) =>
  `${partes.filter(Boolean).join('_')}.pdf`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');

const dataDeTimestamp = (t) => {
  if (!t) return null;
  const d = typeof t.toDate === 'function' ? t.toDate() : new Date(t);
  return isNaN(d.getTime()) ? null : d;
};

function blocoIdentificacao(pdf, paciente, extras = []) {
  pdf.addSection('Identificação');
  pdf.addInfoBlock([
    { label: 'Paciente', value: paciente.nome },
    { label: 'CPF', value: formatarCPF(paciente.cpf) },
    { label: 'Data de nascimento', value: paciente.data_nascimento ? formatDateBR(paciente.data_nascimento) : '' },
    { label: 'Idade', value: calcularIdade(paciente.data_nascimento) },
    { label: 'Telefone', value: paciente.telefone },
    ...extras,
  ]);
}

// "Sim" + observação; só a observação; ou nada (campo vira omitido)
// "Não", "Nega", "Nenhuma"... em campo de risco é resposta negativa, não alerta
const respostaNegativa = (t) => /^\s*(n[ãa]o|nega|negou|nenhuma?|sem\b|nunca)/i.test(String(t || '')) && String(t).length <= 60;

function addRiscoSuicidio(pdf, texto) {
  if (respostaNegativa(texto)) pdf.addField('Tentativa de suicídio / ideação', texto);
  else pdf.addAlert(texto, 'Atenção: tentativa de suicídio ou ideação relatada');
}

const simComNota = (flag, nota) => (flag ? juntar(['Sim', nota], '. ') : (temValor(nota) ? nota : ''));

// ==========================================
// PDF: ANAMNESE (adulto, infanto-juvenil ou questionário próprio)
// ==========================================
export function gerarAnamnesePDF(paciente = {}, anamnese = {}, profissional = null, { skipSave = false } = {}) {
  const ana = anamnese;
  const tipoLabel = ana.tipo === 'adolescente'
    ? 'Infanto-juvenil'
    : ana.tipo === 'dinamico' ? (ana.questionario_nome || ana.template_snapshot?.nome || 'Questionário próprio') : 'Adulto';
  const pdf = new PdfBuilder('Anamnese Psicológica', paciente.nome || 'Paciente', { profissional });

  const dataAnamnese = dataDeTimestamp(ana.createdAt);
  blocoIdentificacao(pdf, paciente, [
    { label: 'Modelo de anamnese', value: tipoLabel },
    { label: 'Registrada em', value: dataAnamnese ? dataAnamnese.toLocaleDateString('pt-BR') : '' },
  ]);

  if (ana.tipo === 'dinamico') {
    const campos = ana.template_snapshot?.campos || [];
    pdf.addSection('Respostas');
    campos.forEach((campo, idx) => {
      if (campo.tipo === 'section') {
        pdf.addSection(campo.label || campo.titulo || 'Seção');
        return;
      }
      const resposta = ana.respostas?.[campo.id] ?? ana.respostas?.[idx];
      const valor = Array.isArray(resposta)
        ? resposta.filter(temValor).join(', ')
        : campo.tipo === 'date' && resposta ? formatDateBR(String(resposta)) : resposta;
      pdf.addField(campo.label || campo.titulo || `Pergunta ${idx + 1}`, valor);
    });
  } else {
    const ehInfantil = ana.tipo === 'adolescente';

    pdf.addSection('Histórico de acompanhamento');
    pdf.addField('Acompanhamentos anteriores', juntar([
      ana.psicologo_previo && 'Psicológico',
      ana.psiquiatra_previo && 'Psiquiátrico',
      ana.foi_ambulatorio && 'Ambulatorial',
      ana.houve_internamento && 'Internação',
    ]));

    pdf.addSection('Contexto familiar');
    const pessoa = (nome, idade, profissao) => juntar([nome, temValor(idade) ? `${idade} anos` : '', profissao]);
    const irmaos = Number(ana.qtd_irmaos) || 0;
    const detalheIrmaos = juntar([
      Number(ana.irmaos_masculino) ? `${ana.irmaos_masculino} do sexo masculino` : '',
      Number(ana.irmaos_feminino) ? `${ana.irmaos_feminino} do sexo feminino` : '',
    ]);
    pdf.addInfoBlock([
      { label: 'Pai', value: pessoa(ana.nome_pai, ana.idade_pai, ana.profissao_pai) },
      { label: 'Mãe', value: pessoa(ana.nome_mae, ana.idade_mae, ana.profissao_mae) },
      { label: 'Irmãos', value: irmaos ? juntar([String(irmaos), detalheIrmaos ? `(${detalheIrmaos})` : ''], ' ') : '' },
    ]);
    pdf.addField('Observações sobre a família', ana.observacoes_familiares);

    if (ehInfantil) {
      pdf.addSection('Desenvolvimento e escolaridade');
      pdf.addInfoBlock([
        { label: 'Gestação planejada', value: simComNota(ana.gestacao_planejada, ana.gestacao_notas), largo: temValor(ana.gestacao_notas) },
        { label: 'Tipo de parto', value: ana.tipo_parto },
        { label: 'Testes do nascimento', value: simComNota(ana.testes_nascimento, ana.testes_notas) },
        { label: 'Internação ao nascer', value: simComNota(ana.internacao_nascimento, ana.internacao_notas) },
        { label: 'Amamentação', value: ana.mamou ? juntar(['Sim', ana.tempo_amamentacao], ', ') : '' },
        { label: 'Tempo de telas', value: ana.tempo_telas },
      ]);
      pdf.addField('Desenvolvimento motor', ana.desenvolvimento_motor);
      pdf.addField('Fala e linguagem', ana.atraso_fala);
      pdf.addField('Interação e brincadeiras', ana.interacao_brincadeiras);
      pdf.addField('Seletividade alimentar', simComNota(ana.seletividade_alimentar, ana.seletividade_notas));
      pdf.addField('Dificuldade escolar', simComNota(ana.dificuldade_escolar, ana.dificuldade_escolar_notas));
      pdf.addField('Mudança de escola', simComNota(ana.mudanca_escola, ana.mudanca_escola_notas));
      pdf.addField('Bullying', simComNota(ana.bullying, ana.bullying_notas));
    }

    pdf.addSection('Motivo da consulta');
    pdf.addTextBlock('Queixa principal', ana.motivo_consulta);
    pdf.addTextBlock('Histórico da queixa', ana.historico_queixa);

    pdf.addSection('Dinâmicas de vida');
    pdf.addTextBlock('Familiar', ana.dinamica_familiar);
    pdf.addTextBlock('Profissional / escolar', ana.dinamica_profissional);
    pdf.addTextBlock('Afetiva', ana.dinamica_amorosa);
    pdf.addTextBlock('Social', ana.dinamica_social);

    pdf.addSection('Hábitos e rotina');
    pdf.addInfoBlock([
      { label: 'Sono', value: ana.rotina_sono },
      { label: 'Alimentação', value: ana.alimentacao || ana.alimentacao_habitos },
      { label: 'Atividade física', value: ana.exercicio_fisico },
      { label: 'Lazer', value: ana.lazer_hobbies },
      { label: 'Espiritualidade', value: ana.espiritualidade },
    ]);

    pdf.addSection('Quadro clínico');
    addRiscoSuicidio(pdf, ana.tentativa_suicidio);
    pdf.addTextBlock('Sintomas apresentados', ana.sintomas_apresentados);
    pdf.addTextBlock('Fatores agravantes', ana.fatores_agravantes);
    pdf.addInfoBlock([
      { label: 'Transtornos anteriores', value: ana.transtornos_anteriores },
      { label: 'Doenças relevantes', value: ana.doencas_importantes },
      { label: 'Medicações em uso', value: ana.medicamentos },
      { label: 'Uso de substâncias', value: ana.uso_substancias },
    ]);

    pdf.addSection('Considerações finais');
    pdf.addTextBlock(ehInfantil ? 'Expectativa do responsável' : 'Expectativa com a terapia', ana.expectativa_terapia || ana.expectativa_responsavel);
    pdf.addTextBlock('Observações do(a) psicólogo(a)', ana.observacoes_gerais);
  }

  pdf.addSection('Resumo clínico');
  pdf.addTextBlock('', ana.resumo_ia);

  if (profissional) pdf.addAssinatura(profissional);
  pdf.addNota('Documento de caráter sigiloso, de uso exclusivo do(a) profissional responsável e do prontuário (Res. CFP nº 01/2009).');

  if (!skipSave) pdf.save(nomeArquivo('Anamnese', paciente.nome));
  return pdf;
}

// ==========================================
// PDF: EVOLUÇÃO DE SESSÃO
// ==========================================
export function gerarEvolucaoSessaoPDF(paciente = {}, sessao = {}, profissional = null, { skipSave = false } = {}) {
  const dataSessao = sessao.data_sessao
    ? formatDateBR(sessao.data_sessao)
    : (dataDeTimestamp(sessao.createdAt) || new Date()).toLocaleDateString('pt-BR');
  const pdf = new PdfBuilder('Evolução de Sessão', paciente.nome || 'Paciente', { profissional });

  pdf.addSection('Dados do atendimento');
  pdf.addInfoBlock([
    { label: 'Data da sessão', value: dataSessao },
    { label: 'Horário', value: sessao.hora || sessao.horario },
    { label: 'Comparecimento', value: sessao.status },
    { label: 'Humor relatado', value: temValor(sessao.humor) ? `${sessao.humor} de 10` : '' },
  ]);

  pdf.addSection('Registro clínico');
  pdf.addTextBlock('Evolução', sessao.observacoes || sessao.evolucao_notas);
  pdf.addTextBlock('Comportamento observado', sessao.comportamento);
  pdf.addTextBlock('Sintomas relatados', sessao.sintomas);
  pdf.addTextBlock('Resumo clínico', sessao.resumo_ia);

  if (profissional) pdf.addAssinatura(profissional);

  if (!skipSave) pdf.save(nomeArquivo('Evolucao', paciente.nome, (sessao.data_sessao || '').replace(/\//g, '-')));
  return pdf;
}

// ==========================================
// PDF: PRONTUÁRIO COMPLETO
// ==========================================
export function gerarProntuarioCompletoPDF(paciente = {}, anamneses = [], sessoes = [], profissional = null, { skipSave = false } = {}) {
  const pdf = new PdfBuilder('Prontuário Psicológico', paciente.nome || 'Paciente', { profissional });
  blocoIdentificacao(pdf, paciente, [
    { label: 'Sessões registradas', value: sessoes.length ? String(sessoes.length) : '' },
  ]);

  const ana = anamneses[0];
  if (ana) {
    pdf.addSection('Anamnese (síntese)');
    if (ana.tipo === 'dinamico') {
      (ana.template_snapshot?.campos || []).forEach((campo, idx) => {
        if (campo.tipo === 'section') return;
        const r = ana.respostas?.[campo.id] ?? ana.respostas?.[idx];
        pdf.addField(campo.label || campo.titulo || `Pergunta ${idx + 1}`, Array.isArray(r) ? r.filter(temValor).join(', ') : r);
      });
    } else {
      addRiscoSuicidio(pdf, ana.tentativa_suicidio);
      pdf.addTextBlock('Queixa principal', ana.motivo_consulta);
      pdf.addTextBlock('Histórico da queixa', ana.historico_queixa);
      pdf.addTextBlock('Sintomas apresentados', ana.sintomas_apresentados);
      pdf.addTextBlock('Medicações em uso', ana.medicamentos);
      pdf.addTextBlock('Observações do(a) psicólogo(a)', ana.observacoes_gerais);
    }
  }

  const ordenadas = [...sessoes].sort((a, b) => {
    const d1 = a.data_sessao ? new Date(a.data_sessao) : dataDeTimestamp(a.createdAt) || 0;
    const d2 = b.data_sessao ? new Date(b.data_sessao) : dataDeTimestamp(b.createdAt) || 0;
    return d1 - d2;
  });
  pdf.addSection('Evolução das sessões');
  let numero = 0;
  ordenadas.forEach((sessao) => {
    const evolucao = sessao.observacoes || sessao.evolucao_notas;
    if (![evolucao, sessao.comportamento, sessao.sintomas].some(temValor)) return;
    numero += 1;
    const data = sessao.data_sessao ? formatDateBR(sessao.data_sessao) : dataDeTimestamp(sessao.createdAt)?.toLocaleDateString('pt-BR');
    pdf.addSubtitulo(juntar([`Sessão ${numero}`, data, sessao.status], ' · '));
    pdf.addTextBlock('Evolução', evolucao);
    pdf.addTextBlock('Comportamento observado', sessao.comportamento);
    pdf.addTextBlock('Sintomas relatados', sessao.sintomas);
  });

  if (profissional) pdf.addAssinatura(profissional);
  pdf.addNota('Prontuário de guarda obrigatória por no mínimo 5 anos (Res. CFP nº 01/2009). Conteúdo sigiloso.');

  if (!skipSave) pdf.save(nomeArquivo('Prontuario', paciente.nome));
  return pdf;
}

// ==========================================
// PDF: RELATÓRIO FINANCEIRO
// ==========================================
export function gerarRelatorioFinanceiroPDF(sessoesPeriodo, pacientes, periodoLabel, totais, profissional = null) {
  const pdf = new PdfBuilder('Relatório Financeiro', `Período: ${sanitizeText(periodoLabel)}`, { profissional, rotulo: '' });

  pdf.addSection('Resumo do período');
  pdf.addInfoBlock([
    { label: 'Previsto', value: formatarMoeda(totais.previsaoTotal) },
    { label: 'Recebido', value: formatarMoeda(totais.valorRecebido) },
    { label: 'A receber', value: formatarMoeda(totais.valorPendente) },
    { label: 'Sessões no período', value: String(sessoesPeriodo.length) },
  ]);

  const ordenadas = [...sessoesPeriodo].sort((a, b) => String(a.data_sessao || '').localeCompare(String(b.data_sessao || '')));
  pdf.addSection('Sessões');
  pdf.addTabela(
    [
      { titulo: 'Data', largura: 24 },
      { titulo: 'Paciente', largura: 64 },
      { titulo: 'Forma', largura: 30 },
      { titulo: 'Situação', largura: 26 },
      { titulo: 'Valor', largura: 30, alinhar: 'right' },
    ],
    ordenadas.map((s) => {
      const pac = pacientes.find((p) => p.id === s.id_paciente);
      return [
        formatDateBR(s.data_sessao),
        pac ? pac.nome : 'Paciente removido',
        s.pago ? (s.forma_pagamento || '—') : '—',
        s.pago ? 'Pago' : 'Pendente',
        formatarMoeda(s.valor),
      ];
    })
  );
  if (!ordenadas.length) pdf.addNota('Nenhuma sessão faturada no período.');

  pdf.save(nomeArquivo('Relatorio_Financeiro', periodoLabel));
  return pdf;
}

// ==========================================
// PDF: RECIBO INDIVIDUAL DE SESSÃO
// ==========================================
export function gerarReciboPDF(sessao, paciente, profissional = null, { skipSave = false } = {}) {
  const nome = paciente?.nome || 'Paciente';
  const valor = paraNumero(sessao.valor);
  const extenso = valorPorExtenso(valor);
  const pdf = new PdfBuilder('Recibo', sanitizeText(nome), { profissional });

  pdf.addSection('Dados do atendimento');
  pdf.addInfoBlock([
    { label: 'Pagador(a)', value: nome },
    { label: 'CPF', value: formatarCPF(paciente?.cpf) },
    { label: 'Data da sessão', value: formatDateBR(sessao.data_sessao) },
    { label: 'Valor', value: formatarMoeda(valor) },
    { label: 'Forma de pagamento', value: sessao.pago ? sessao.forma_pagamento : '' },
    { label: 'Situação', value: sessao.pago ? 'Pago' : 'Pagamento pendente' },
  ]);

  pdf.addSection('Declaração');
  const cpf = formatarCPF(paciente?.cpf);
  pdf.addTextBlock('',
    `${sessao.pago ? 'Recebi' : 'Declaro que é devido'} de ${sanitizeText(nome)}${cpf ? `, CPF ${cpf},` : ''} ` +
    `a importância de ${formatarMoeda(valor)}${extenso ? ` (${extenso})` : ''}, referente à sessão de atendimento psicológico ` +
    `realizada em ${formatDateBR(sessao.data_sessao)}${sessao.pago && sessao.forma_pagamento ? `, paga via ${sanitizeText(sessao.forma_pagamento)}` : ''}.`
  );

  pdf.addAssinatura(profissional || {});

  if (!skipSave) pdf.save(nomeArquivo('Recibo', nome, sessao.data_sessao));
  return pdf;
}

// ==========================================
// PDF: RELATÓRIO DE PENDÊNCIAS
// ==========================================
export function gerarRelatorioPendenciasPDF(sessoesPendentes, pacientes, profissional = null) {
  const pdf = new PdfBuilder('Relatório de Pendências', `${sessoesPendentes.length} ${sessoesPendentes.length === 1 ? 'sessão' : 'sessões'} com pagamento pendente`, { profissional, rotulo: '' });

  const totalCentavos = sessoesPendentes.reduce((acc, s) => acc + Math.round(paraNumero(s.valor) * 100), 0);
  pdf.addSection('Resumo');
  pdf.addInfoBlock([
    { label: 'Sessões pendentes', value: String(sessoesPendentes.length) },
    { label: 'Valor total pendente', value: formatarMoeda(totalCentavos / 100) },
  ]);

  const porPaciente = {};
  sessoesPendentes.forEach((s) => {
    (porPaciente[s.id_paciente] ||= []).push(s);
  });

  pdf.addSection('Pendências por paciente');
  const linhas = [];
  Object.entries(porPaciente).forEach(([pid, sessoes]) => {
    const pac = pacientes.find((p) => p.id === pid);
    sessoes
      .sort((a, b) => (a.data_sessao || '').localeCompare(b.data_sessao || ''))
      .forEach((s, i) => linhas.push([i === 0 ? (pac ? pac.nome : 'Paciente removido') : '', formatDateBR(s.data_sessao), formatarMoeda(s.valor)]));
  });
  pdf.addTabela(
    [
      { titulo: 'Paciente', largura: 94 },
      { titulo: 'Data da sessão', largura: 40 },
      { titulo: 'Valor', largura: 40, alinhar: 'right' },
    ],
    linhas
  );

  pdf.save(nomeArquivo('Pendencias', new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')));
  return pdf;
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
  const pdf = new PdfBuilder('Declaração Psicológica', nomePaciente, { profissional: psicologo });
  const dataAtendimento = dados.data || dataLocalISO();
  const dataFormatada = formatDateBR(dataAtendimento);
  const cpf = formatarCPF(paciente.cpf);

  pdf.addSection('Identificação');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: cpf },
    { label: 'Finalidade', value: dados.finalidade || 'Comprovação de comparecimento', largo: true },
    { label: 'Data do atendimento', value: dados.compareceu !== false ? dataFormatada : '' },
    { label: 'Horário', value: dados.horario },
  ]);

  const fato = dados.compareceu !== false
    ? `compareceu a atendimento psicológico individual em ${dataFormatada}${dados.horario ? `, às ${dados.horario}` : ''}`
    : 'encontra-se em acompanhamento psicológico regular';

  pdf.addSection('Declaração');
  pdf.addTextBlock('',
    `Declaro, para os devidos fins, que ${nomePaciente}${cpf ? `, inscrito(a) no CPF ${cpf},` : ''} ${fato}, sob meus cuidados profissionais, ` +
    `com a finalidade de ${(dados.finalidade || 'comprovação de comparecimento').toLowerCase()}.`
  );
  pdf.addNota('Este documento não contém diagnóstico, sintomas ou prognóstico, conforme o Art. 9º da Resolução CFP nº 06/2019.');

  pdf.addAssinatura(psicologo);

  if (!dados.skipSave) pdf.save(nomeArquivo('Declaracao', nomePaciente, dataAtendimento));
  return pdf;
}

/**
 * Atestado Psicológico (Art. 10º da Resolução CFP nº 06/2019)
 * Certifica situação de saúde para justificar falta, repouso ou afastamento.
 */
export function gerarAtestadoPDF(paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Atestado Psicológico', nomePaciente, { profissional: psicologo });
  const dataEmissao = dados.data || dataLocalISO();
  const dataFormatada = formatDateBR(dataEmissao);
  const dias = Number(dados.diasRepouso) || 1;
  const cpf = formatarCPF(paciente.cpf);

  pdf.addSection('Identificação');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: cpf },
    { label: 'Data de início', value: dataFormatada },
    { label: 'Período de afastamento', value: `${dias} ${dias === 1 ? 'dia' : 'dias'}` },
    { label: 'Finalidade', value: dados.finalidade, largo: true },
  ]);

  pdf.addSection('Atestado');
  pdf.addTextBlock('',
    `Atesto, para os devidos fins e a pedido do(a) interessado(a), que ${nomePaciente}${cpf ? `, inscrito(a) no CPF ${cpf},` : ''} ` +
    `encontra-se em acompanhamento psicológico e necessita de ${dias} ${dias === 1 ? 'dia' : 'dias'} de afastamento ` +
    `de suas atividades habituais a partir de ${dataFormatada}, por motivo de saúde.`
  );
  pdf.addTextBlock('Observação', dados.justificativa);
  pdf.addNota('Emitido conforme o Art. 10 da Resolução CFP nº 06/2019. Válido somente para a finalidade indicada.');

  pdf.addAssinatura(psicologo);

  if (!dados.skipSave) pdf.save(nomeArquivo('Atestado', nomePaciente, dataEmissao));
  return pdf;
}

/**
 * Relatório Psicológico (Arts. 11 e 12 da Resolução CFP nº 06/2019)
 * Identificação, descrição da demanda, procedimento, análise e conclusão.
 * Itens não preenchidos são omitidos; o sistema não inventa conteúdo clínico.
 */
export function gerarRelatorioEncaminhamentoPDF(paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Relatório Psicológico', nomePaciente, { profissional: psicologo });
  const dataEmissao = dados.data || dataLocalISO();

  pdf.addSection('Identificação');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: formatarCPF(paciente.cpf) },
    { label: 'Idade', value: calcularIdade(paciente.data_nascimento) },
    { label: 'Solicitante / destinatário', value: dados.destinatario },
    { label: 'Finalidade', value: dados.finalidade, largo: true },
    { label: 'Autor(a)', value: juntar([psicologo.nome, crpFormatado(psicologo.crp)], ' · ') },
  ]);

  pdf.addSection('Descrição da demanda');
  pdf.addTextBlock('', dados.queixa || dados.motivo);

  pdf.addSection('Procedimento');
  pdf.addTextBlock('', dados.procedimentos);

  pdf.addSection('Análise');
  pdf.addTextBlock('', dados.analise);

  pdf.addSection('Conclusão e encaminhamento');
  pdf.addTextBlock('', dados.encaminhamento || dados.conclusao);

  pdf.addNota('Documento sigiloso (Art. 13 da Resolução CFP nº 06/2019). Vedada a reprodução não autorizada.');
  pdf.addAssinatura(psicologo);

  if (!dados.skipSave) pdf.save(nomeArquivo('Relatorio', nomePaciente, dataEmissao));
  return pdf;
}

/**
 * Recibo para Reembolso de Plano de Saúde (Convênios / Seguro Saúde)
 * Discrimina atendimento psicológico com dados completos para fins de reembolso.
 */
export function gerarReciboReembolsoPDF(sessao = {}, paciente = {}, psicologo = {}, dados = {}) {
  const nomePaciente = sanitizeText(paciente.nome || 'Paciente');
  const pdf = new PdfBuilder('Recibo para Reembolso', nomePaciente, { profissional: psicologo });
  if (sessao.pago === false) {
    throw new Error('Esta sessão está com pagamento pendente. Dê baixa no Financeiro antes de emitir o recibo de quitação.');
  }
  // Valores do formulário (o que a pessoa vê e editou) têm prioridade sobre a sessão salva
  const dataSessao = dados.data || sessao.data_sessao || dataLocalISO();
  const dataFormatada = formatDateBR(dataSessao);
  const valor = paraNumero(dados.valor ?? sessao.valor);
  if (valor <= 0) throw new Error('Informe o valor recebido para emitir o recibo.');
  const extenso = valorPorExtenso(valor);
  const cpfPaciente = formatarCPF(paciente.cpf);

  pdf.addSection('Profissional');
  pdf.addInfoBlock([
    { label: 'Psicólogo(a)', value: psicologo.nome || psicologo.displayName },
    { label: 'Registro', value: crpFormatado(psicologo.crp) },
    { label: 'CPF / CNPJ', value: psicologo.cpf || psicologo.cnpj },
    { label: 'Local de atendimento', value: psicologo.clinica || paciente.clinica },
  ]);

  pdf.addSection('Beneficiário(a)');
  pdf.addInfoBlock([
    { label: 'Paciente', value: nomePaciente },
    { label: 'CPF', value: cpfPaciente },
    { label: 'Data do atendimento', value: dataFormatada },
    { label: 'Procedimento', value: 'Sessão de psicoterapia individual (TUSS 50000140)', largo: true },
  ]);

  pdf.addSection('Pagamento');
  pdf.addInfoBlock([
    { label: 'Valor', value: formatarMoeda(valor) },
    { label: 'Forma de pagamento', value: dados.forma_pagamento || sessao.forma_pagamento },
  ]);

  pdf.addSection('Declaração de quitação');
  pdf.addTextBlock('',
    `Recebi de ${nomePaciente}${cpfPaciente ? `, CPF ${cpfPaciente},` : ''} a importância de ${formatarMoeda(valor)}${extenso ? ` (${extenso})` : ''}, ` +
    `referente à sessão de psicoterapia individual realizada em ${dataFormatada}, dando plena quitação para fins de reembolso junto a operadora de plano ou seguro saúde.`
  );

  pdf.addAssinatura(psicologo);

  if (!dados.skipSave) pdf.save(nomeArquivo('Recibo_Reembolso', nomePaciente, dataSessao));
  return pdf;
}

// Exportar sanitizeText para uso externo se necessário
export { sanitizeText };
