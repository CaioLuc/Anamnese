import { describe, it, expect } from 'vitest';
import {
  calcularIdade,
  formatDateBR,
  gerarDeclaracaoPDF,
  gerarAtestadoPDF,
  gerarRelatorioEncaminhamentoPDF,
  gerarReciboReembolsoPDF,
  sanitizeText,
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
    expect(pdf.titulo).toBe('Declaracao Psicologica');
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
    expect(pdf.titulo).toBe('Atestado Psicologico');
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
    expect(pdf.titulo).toBe('Relatorio de Encaminhamento');
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
