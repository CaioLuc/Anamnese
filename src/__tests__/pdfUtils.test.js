import { describe, it, expect } from 'vitest';
import {
  calcularIdade,
  formatDateBR,
  gerarDeclaracaoPDF,
  gerarAtestadoPDF,
  gerarRelatorioEncaminhamentoPDF,
  gerarReciboReembolsoPDF,
  gerarAnamnesePDF,
  gerarEvolucaoSessaoPDF,
  gerarProntuarioCompletoPDF,
  sanitizeText,
  temValor,
  valorPorExtenso,
  paraNumero,
} from '../services/pdfUtils';

describe('calcularIdade', () => {
  it('should return "Nao informada" for null/undefined', () => {
    expect(calcularIdade(null)).toBe('Nao informada');
    expect(calcularIdade(undefined)).toBe('Nao informada');
    expect(calcularIdade('')).toBe('Nao informada');
  });

  it('should calculate age correctly from ISO date string', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 30;
    const birthDate = `${birthYear}-01-15`;
    const result = calcularIdade(birthDate);
    // Depending on month, age could be 29 or 30
    expect(result).toMatch(/^\d+ anos$/);
    const age = parseInt(result);
    expect(age).toBeGreaterThanOrEqual(29);
    expect(age).toBeLessThanOrEqual(30);
  });

  it('should handle date with T suffix', () => {
    const today = new Date();
    const birthYear = today.getFullYear() - 25;
    const birthDate = `${birthYear}-06-01T00:00:00`;
    const result = calcularIdade(birthDate);
    const age = parseInt(result);
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });
});

describe('formatDateBR', () => {
  it('should convert YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDateBR('2024-03-15')).toBe('15/03/2024');
    expect(formatDateBR('2023-12-01')).toBe('01/12/2023');
  });

  it('should return N/D for null/undefined/empty', () => {
    expect(formatDateBR(null)).toBe('N/D');
    expect(formatDateBR(undefined)).toBe('N/D');
    expect(formatDateBR('')).toBe('N/D');
  });

  it('should return as-is if already in DD/MM/YYYY format', () => {
    expect(formatDateBR('15/03/2024')).toBe('15/03/2024');
  });

  it('should return as-is for unrecognized formats', () => {
    expect(formatDateBR('some string')).toBe('some string');
  });
});

describe('CFP Documents (Resolucao CFP 06/2019)', () => {
  const paciente = {
    nome: 'Maria da Silva',
    cpf: '123.456.789-00',
    data_nascimento: '1995-05-10',
    telefone: '(11) 98765-4321',
  };

  const psicologo = {
    nome: 'Dr. Roberto Mendes',
    crp: '06/998877',
    cpf: '111.222.333-44',
    clinica: 'Clinica Espaco Saude',
  };

  it('should generate Declaracao PDF with skipSave', () => {
    const pdf = gerarDeclaracaoPDF(paciente, psicologo, {
      data: '2026-03-10',
      horario: '14:00',
      finalidade: 'Comprovacao no trabalho',
      skipSave: true,
    });
    expect(pdf).toBeDefined();
    expect(pdf.titulo).toBe('Declaração Psicológica');
    expect(pdf.subtitulo).toBe('Maria da Silva');
  });

  it('should generate Atestado PDF with skipSave', () => {
    const pdf = gerarAtestadoPDF(paciente, psicologo, {
      diasRepouso: 2,
      finalidade: 'Tratamento de saude',
      justificativa: 'Necessidade de repouso psicologico',
      skipSave: true,
    });
    expect(pdf).toBeDefined();
    expect(pdf.titulo).toBe('Atestado Psicológico');
    expect(pdf.subtitulo).toBe('Maria da Silva');
  });

  it('should generate Relatorio de Encaminhamento PDF with skipSave', () => {
    const pdf = gerarRelatorioEncaminhamentoPDF(paciente, psicologo, {
      destinatario: 'Dr. Neurologista',
      queixa: 'Cefaleia tensional e ansiedade',
      procedimentos: 'Avaliacao clinica psicoterapica',
      analise: 'Sintomas compativeis com estresse agudo',
      encaminhamento: 'Encaminhamento para investigacao neurologica',
      skipSave: true,
    });
    expect(pdf).toBeDefined();
    expect(pdf.titulo).toBe('Relatório Psicológico');
    expect(pdf.subtitulo).toBe('Maria da Silva');
  });

  it('should generate Recibo Reembolso PDF with skipSave', () => {
    const sessao = {
      data_sessao: '2026-03-05',
      valor: '200.00',
      forma_pagamento: 'PIX',
    };
    const pdf = gerarReciboReembolsoPDF(sessao, paciente, psicologo, {
      skipSave: true,
    });
    expect(pdf).toBeDefined();
    expect(pdf.titulo).toBe('Recibo para Reembolso');
    expect(pdf.subtitulo).toBe('Maria da Silva');
  });

  it('should sanitize text by removing unprintable / emojis', () => {
    expect(sanitizeText('Consulta 🩺 Psicológica')).toBe('Consulta  Psicológica');
    expect(sanitizeText(null)).toBe('');
  });
});

describe('temValor', () => {
  it('ignora vazios, false e marcadores de "sem resposta"', () => {
    expect(temValor('')).toBe(false);
    expect(temValor('   ')).toBe(false);
    expect(temValor(null)).toBe(false);
    expect(temValor(false)).toBe(false);
    expect(temValor('N/D')).toBe(false);
    expect(temValor('Nao informada')).toBe(false);
    expect(temValor([])).toBe(false);
    expect(temValor(['', 'Ansiedade'])).toBe(true);
    expect(temValor(0)).toBe(true);
    expect(temValor('Não')).toBe(true);
  });
});

describe('valorPorExtenso', () => {
  it('escreve valores de recibo em português', () => {
    expect(valorPorExtenso(150)).toBe('cento e cinquenta reais');
    expect(valorPorExtenso(1)).toBe('um real');
    expect(valorPorExtenso(100)).toBe('cem reais');
    expect(valorPorExtenso(1250)).toBe('mil duzentos e cinquenta reais');
    expect(valorPorExtenso(2020)).toBe('dois mil e vinte reais');
    expect(valorPorExtenso(180.5)).toBe('cento e oitenta reais e cinquenta centavos');
    expect(valorPorExtenso(0.01)).toBe('um centavo');
  });
});

describe('PDFs sem seções vazias', () => {
  const paciente = { nome: 'Maria da Silva', cpf: '12345678900', data_nascimento: '1995-05-10' };

  it('anamnese quase vazia só gera as seções preenchidas', () => {
    const pdf = gerarAnamnesePDF(paciente, { tipo: 'adulto', motivo_consulta: 'Ansiedade no trabalho', qtd_irmaos: 0, psicologo_previo: false }, null, { skipSave: true });
    // Identificação + Motivo da consulta
    expect(pdf.numeroSecao).toBe(2);
  });

  it('anamnese completa inclui família, hábitos e quadro clínico', () => {
    const pdf = gerarAnamnesePDF(paciente, {
      tipo: 'adulto',
      psicologo_previo: true,
      nome_mae: 'Ana', idade_mae: '60',
      motivo_consulta: 'Insônia',
      rotina_sono: 'Dorme 4h por noite',
      sintomas_apresentados: 'Irritabilidade',
      tentativa_suicidio: 'Ideação em 2020',
      observacoes_gerais: 'Encaminhar para psiquiatria',
    }, { nome: 'Dra. Ana', crp: '06/123456' }, { skipSave: true });
    // Identificação, Histórico, Família, Motivo, Hábitos, Quadro clínico, Considerações finais
    expect(pdf.numeroSecao).toBe(7);
  });

  it('anamnese dinâmica ignora perguntas sem resposta e seções vazias', () => {
    const pdf = gerarAnamnesePDF(paciente, {
      tipo: 'dinamico',
      template_snapshot: { campos: [
        { id: 's1', tipo: 'section', label: 'Bloco vazio' },
        { id: 'a', tipo: 'text', label: 'Pergunta sem resposta' },
        { id: 's2', tipo: 'section', label: 'Bloco respondido' },
        { id: 'b', tipo: 'checkbox', label: 'Sintomas' },
      ] },
      respostas: { b: ['Ansiedade', 'Insônia'] },
    }, null, { skipSave: true });
    // Identificação + Bloco respondido
    expect(pdf.numeroSecao).toBe(2);
  });

  it('evolução e prontuário completo geram sem erro', () => {
    const sessao = { data_sessao: '2026-10-10', status: 'Presente', observacoes: 'Paciente relata melhora.', humor: 7 };
    expect(gerarEvolucaoSessaoPDF(paciente, sessao, null, { skipSave: true }).numeroSecao).toBe(2);
    const pront = gerarProntuarioCompletoPDF(paciente, [], [sessao, { data_sessao: '2026-10-03' }], null, { skipSave: true });
    // Identificação + Evolução das sessões (sessão sem conteúdo é omitida)
    expect(pront.numeroSecao).toBe(2);
  });
});

describe('valores e recibos', () => {
  const paciente = { nome: 'Maria da Silva', cpf: '12345678900' };
  const prof = { nome: 'Dra. Ana', crp: 'CRP 06/123456' };

  it('lê valores em formato brasileiro', () => {
    expect(paraNumero('1.250,00')).toBe(1250);
    expect(paraNumero('150,50')).toBe(150.5);
    expect(paraNumero('150.00')).toBe(150);
    expect(paraNumero('')).toBe(0);
    expect(paraNumero(80)).toBe(80);
  });

  it('valor por extenso fora da faixa não inventa texto', () => {
    expect(valorPorExtenso(-150)).toBe('');
    expect(valorPorExtenso(1e9)).toBe('');
    expect(valorPorExtenso(NaN)).toBe('');
  });

  it('recibo de reembolso recusa sessão com pagamento pendente', () => {
    expect(() => gerarReciboReembolsoPDF({ data_sessao: '2026-10-10', valor: '150', pago: false }, paciente, prof, { skipSave: true }))
      .toThrow(/pendente/);
  });

  it('recibo de reembolso usa o valor do formulário, não o da sessão salva', () => {
    const pdf = gerarReciboReembolsoPDF({ data_sessao: '2026-10-10', valor: '150', pago: true }, paciente, prof, { valor: '120,00', skipSave: true });
    const texto = pdf.doc.output();
    expect(texto).toContain('R$ 120,00');
    expect(texto).not.toContain('R$ 150,00');
  });

  it('resposta negativa sobre risco de suicídio não vira alerta', () => {
    const pdf = gerarAnamnesePDF(paciente, { tipo: 'adulto', tentativa_suicidio: 'Nega.' }, null, { skipSave: true });
    expect(pdf.doc.output()).not.toContain('ATEN');
  });
});
